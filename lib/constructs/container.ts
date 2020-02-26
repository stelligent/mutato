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
  /** image's push tag. leave empty if using AWS ECR */
  tag?: string;
}

/**
 * a construct abstracting a single Dockerfile. This class does not participate
 * in authentication, building, or pushing the actual image of the container.
 */
class Container extends BaseConstruct {
  public readonly props: ContainerProps;
  public readonly repo?: ecr.Repository;
  public readonly imageUri: string;
  private readonly log: debug.Debugger;

  /** @hideconstructor */
  constructor(scope: cdk.Construct, id: string, props?: ContainerProps) {
    super(scope, id);

    this.log = debug(`mu:constructs:container:${id}`);
    this.props = _.defaults(props, {
      buildArgs: {},
      file: 'Dockerfile',
      context: '.',
      tag: ''
    });

    this.log('creating a container construct with props: %o', this.props);
    assert.ok(this.props.file);
    assert.ok(this.props.context);
    assert.ok(_.isString(this.props.tag));

    if (this.props.tag) {
      this.log('container is building for DockerHub');
    } else {
      this.log('container is building for AWS ECR');
      this.repo = new ecr.Repository(this, 'repository', {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

      const tag = this.repo.repositoryUri;
      this.log('overriding container tag to: %s', tag);
      this.props.tag = tag;
    }

    assert.ok(this.props.tag);
    this.imageUri = this.props.tag as string;
    this.log('container image URI for runtime is set to: %s', this.imageUri);
  }

  /** @returns a CodeBuild action that can be embedded inside a CodePipeline */
  createBuildAction(
    source: codePipeline.Artifact,
    pipeline: codePipeline.Pipeline
  ): codePipelineActions.CodeBuildAction {
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
  get loginCommand(): string {
    const region = cdk.Stack.of(this).region;
    return this.repo
      ? `$(aws ecr get-login --no-include-email --region ${region})`
      : `docker login -u ${config.opts.docker.user} -p ${config.opts.docker.pass}`;
  }

  /** @returns {string} shell command containing "docker build" */
  get buildCommand(): string {
    const buildArg = _.reduce(
      this.props.buildArgs,
      (accumulate, value, key) => `${accumulate} --build-arg ${key}="${value}"`,
      ''
    ).trim();
    const f = this.props.file;
    const t = this.imageUri;
    // TODO: escape for shell args here to prevent shell attacks
    return `docker build ${buildArg} -t ${t} -f ${f} ${this.props.context}`;
  }

  /** @returns {string} shell command containing "docker push" */
  get pushCommand(): string {
    return `docker push ${this.imageUri}`;
  }
}

export { Container as container };
