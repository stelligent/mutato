import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as ecr from '@aws-cdk/aws-ecr';
import * as cdk from '@aws-cdk/core';
import * as assert from 'assert';
import * as debug from 'debug';
import * as _ from 'lodash';
import { config } from '../config';
import { BaseConstruct } from './interfaces';

interface ContainerProps {
  /** build time parameters passed to "docker build" */
  buildArgs?: { [key: string]: string };
  /** path to Dockerfile (default: Dockerfile) */
  file?: string;
  /** path to build context (default: current working directory) */
  context?: string;
  /** image's push URI. leave empty if using AWS ECR */
  uri?: string;
}

/**
 * a construct abstracting a single Dockerfile. This class does not participate
 * in authentication, building, or pushing the actual image of the container.
 */
class Container extends BaseConstruct {
  public readonly props: ContainerProps;
  public readonly repo?: ecr.Repository;
  public readonly needsBuilding: boolean;
  private readonly repositoryName: string;
  private readonly log: debug.Debugger;

  /** @hideconstructor */
  constructor(scope: cdk.Construct, id: string, props?: ContainerProps) {
    super(scope, id);

    this.log = debug(`mu:constructs:container:${id}`);
    this.props = _.defaults(props, {
      buildArgs: {},
      context: '.',
      file: '',
      uri: ''
    });

    this.log('creating a container construct with props: %o', this.props);
    assert.ok(this.props.context);
    assert.ok(_.isString(this.props.uri));

    // by default, repositoryName is the same as URI passed in
    this.repositoryName = this.props.uri as string;

    if (this.props.file && !this.props.uri) {
      this.log('container is building for AWS ECR');
      const git = config.getGithubMetaData();
      this.repositoryName = `${git.owner}/${git.repo}-${git.branch}`;
      this.repo = new ecr.Repository(this, 'repository', {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        repositoryName: this.repositoryName
      });
      // const uri = `${stack.account}.dkr.ecr.${stack.region}.${stack.urlSuffix}/${repositoryName}`;
      const uri = this.repo.repositoryUri;
      this.log('overriding container uri to: %s', uri);
      this.props.uri = uri;
    }

    assert.ok(this.props.uri);
    assert.ok(this.repositoryName);
    this.needsBuilding = !!this.props.file;
  }

  /**
   * Creates a portable URI that is independent of what stack is building this
   * container (in case of ECR building). This is here to avoid circular refs.
   * @param stack stack or construct needing a ref to the URI
   */
  createPortableUri(stack: cdk.Construct): string {
    const owner = cdk.Stack.of(stack);
    const uri = `${owner.account}.dkr.ecr.${owner.region}.${owner.urlSuffix}/${this.repositoryName}`;
    return this.repo ? uri : (this.props.uri as string);
  }

  /** @returns a CodeBuild action that can be embedded inside a CodePipeline */
  createBuildAction(
    source: codePipeline.Artifact,
    pipeline: codePipeline.Pipeline
  ): codePipelineActions.CodeBuildAction {
    assert.ok(this.needsBuilding, 'container is not part of the pipeline');
    const project = new codeBuild.PipelineProject(
      cdk.Stack.of(pipeline),
      `ContainerBuildProject-${this.node.id}`,
      {
        environment: {
          buildImage: codeBuild.LinuxBuildImage.STANDARD_2_0,
          privileged: true,
          environmentVariables: config.toBuildEnvironmentMap()
        },
        buildSpec: codeBuild.BuildSpec.fromObject({
          version: 0.2,
          phases: {
            install: { 'runtime-versions': { docker: 18 } },
            pre_build: { commands: [this.loginCommand] },
            build: { commands: [this.buildCommand] },
            post_build: { commands: [this.pushCommand] }
          }
        })
      }
    );

    this.repo?.grantPullPush(project);
    const buildAction = new codePipelineActions.CodeBuildAction({
      actionName: 'CodeBuild',
      input: source,
      project
    });

    return buildAction;
  }

  /** @returns {string} shell command containing "docker login" */
  private get loginCommand(): string {
    assert.ok(this.needsBuilding, 'container is not part of the pipeline');
    const region = cdk.Stack.of(this).region;
    return this.repo
      ? `$(aws ecr get-login --no-include-email --region ${region})`
      : `docker login -u ${config.opts.docker.user} -p ${config.opts.docker.pass}`;
  }

  /** @returns {string} shell command containing "docker build" */
  private get buildCommand(): string {
    assert.ok(this.needsBuilding, 'container is not part of the pipeline');
    const buildArg = _.reduce(
      this.props.buildArgs,
      (accumulate, value, key) => `${accumulate} --build-arg ${key}="${value}"`,
      ''
    ).trim();
    const f = this.props.file;
    const t = this.props.uri;
    // TODO: escape for shell args here to prevent shell attacks
    return `docker build ${buildArg} -t ${t} -f ${f} ${this.props.context}`;
  }

  /** @returns {string} shell command containing "docker push" */
  private get pushCommand(): string {
    assert.ok(this.needsBuilding, 'container is not part of the pipeline');
    return `docker push ${this.props.uri}`;
  }
}

export { Container as container };
