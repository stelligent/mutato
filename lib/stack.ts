import * as cicd from '@aws-cdk/app-delivery';
import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import * as assert from 'assert';
import * as debug from 'debug';
import * as _ from 'lodash';
import * as path from 'path';
import { config } from './config';
import { container, network } from './constructs';
import { service } from './constructs/service';
import { Parser } from './parser';

/**
 * The Mu app stack, everything inside a mu.yml
 */
export class MuApp extends cdk.Stack {
  private readonly parser = new Parser();
  private readonly log: debug.Debugger;

  private _network?: network;
  private _containers?: container[];

  /** @returns network construct of the stack */
  public get network(): network | undefined {
    return this._network;
  }

  /** @returns network construct of the stack */
  public get containers(): container[] | undefined {
    return this._containers;
  }

  /**
   * @hideconstructor
   * @param {cdk.Construct} scope CDK scope
   * @param {string} id construct ID
   * @param {cdk.StackProps?} props stack props
   */
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.log = debug(`mu:Stack:${id}`);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML string
   *
   * @param {string} muString Mu YAML string
   */
  public async fromString(muString: string): Promise<void> {
    const muYml = await this.parser.parseString(muString);
    this.log('creating stack from string: %s', muString);
    await this.fromObject(muYml);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML file
   *
   * @param {string} muFile Mu YAML file path. By default it looks under your
   * current working directory for mu.yml
   */
  public async fromFile(
    muFile: string = path.resolve(process.cwd(), 'mu.yml')
  ): Promise<void> {
    const muYml = await this.parser.parseFile(muFile);
    this.log('creating stack from file: %s', muFile);
    await this.fromObject(muYml);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML object
   *
   * @param {object} muYml a valid Mu YAML object
   */
  public async fromObject(muYml: object): Promise<void> {
    this.log('creating stack from object: %o', muYml);
    // helper lambda to query mu.yml for a specific construct type
    const queryByType = (type: string): object[] =>
      _.get(muYml, 'mu', [])
        .filter((c: object[]) => _.head(_.keys(c)) === type)
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        .map(c => c[type]);

    // create the base network construct
    const networkTags = queryByType('network');
    assert.ok(networkTags.length <= 1);
    const networkProps = _.head(networkTags);
    const networkConstruct = new network(this, 'network', networkProps);
    this._network = (await networkConstruct.initialize()) as network;

    // create all our container constructs
    const containerTags = queryByType('container');
    this._containers = (await Promise.all(
      containerTags
        .map(
          props => new container(this, _.get(props, 'name', 'default'), props)
        )
        .map(container => container.initialize())
    )) as container[];

    // create all service constructs
    await Promise.all(
      queryByType('service')
        .map(
          props =>
            new service(this, _.get(props, 'name', 'default'), {
              ...props,
              network: networkConstruct,
              container: _.find(
                this._containers,
                c => c.node.id === _.get(props, 'container', 'default')
              ) as container
            })
        )
        .map(container => container.initialize())
    );
  }
}

interface MuPipelineProps extends cdk.StackProps {
  app: MuApp;
}

/**
 * The Mu pipeline stack, everything that manages what mu.yml deploys
 */
export class MuPipeline extends cdk.Stack {
  private readonly log: debug.Debugger;
  private readonly app: MuApp;

  /**
   * @hideconstructor
   * @param {cdk.Construct} scope CDK scope
   * @param {string} id construct ID
   * @param {cdk.MuPipelineProps} props stack props
   */
  constructor(scope: cdk.Construct, id: string, props: MuPipelineProps) {
    super(scope, id, props);
    this.app = props.app;
    this.log = debug(`mu:Stack:${id}`);
  }

  /**
   * synthesizes the pipeline stack
   */
  initialize(): void {
    this.log('synthesizing Mu pipeline');
    const pipeline = new codePipeline.Pipeline(this, 'MuPipeline', {
      restartExecutionOnUpdate: true
    });

    this.log('attempting to extract local Github metadata');
    const git = config.getGithubMetaData();
    this.log('branch %s of repository %s', git.branch, git.repo);

    const githubSource = new codePipeline.Artifact();
    const source = new codePipelineActions.GitHubSourceAction({
      actionName: 'GitHub',
      output: githubSource,
      owner: git.owner,
      repo: git.repo,
      branch: git.branch,
      oauthToken: cdk.SecretValue.plainText(
        /** @todo add SSM here to read github token from */
        config.opts.git.secret
      )
    });
    pipeline.addStage({
      stageName: 'Mu-Source',
      actions: [source]
    });

    const environmentVariables = {
      DEBUG: {
        type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: 'mu*'
      },
      // propagate this machine's configuration into CodeBuild since Git
      // metadata and other utilities are unavailable in that environment
      ...config.toBuildEnvironmentMap()
    };
    this.log('environment of CodeBuild: %o', environmentVariables);

    const project = new codeBuild.PipelineProject(this, 'CodeBuild', {
      environment: {
        buildImage: codeBuild.LinuxBuildImage.fromDockerRegistry('node:lts'),
        environmentVariables
      },
      buildSpec: codeBuild.BuildSpec.fromObject({
        version: 0.2,
        phases: {
          install: { commands: ['npm install'] },
          build: { commands: ['npm run synth'] }
        },
        artifacts: { 'base-directory': 'dist', files: '**/*' }
      })
    });
    const synthesizedApp = new codePipeline.Artifact();
    const buildAction = new codePipelineActions.CodeBuildAction({
      actionName: 'CodeBuild',
      project,
      input: githubSource,
      outputs: [synthesizedApp]
    });
    pipeline.addStage({
      stageName: 'Mu-Build',
      actions: [buildAction]
    });

    const updateStage = pipeline.addStage({ stageName: 'Mu-Update' });
    updateStage.addAction(
      new cicd.PipelineDeployStackAction({
        stack: this,
        input: synthesizedApp,
        adminPermissions: true
      })
    );

    const containers = this.app.containers?.filter(c => c.needsBuilding);
    if (containers && containers.length > 0) {
      const containersStage = pipeline.addStage({ stageName: 'Mu-Containers' });
      containers?.forEach(container =>
        containersStage.addAction(
          container.createBuildAction(githubSource, pipeline)
        )
      );
    }

    const deployStage = pipeline.addStage({ stageName: 'Mu-Deploy' });
    deployStage.addAction(
      new cicd.PipelineDeployStackAction({
        stack: this.app,
        input: synthesizedApp,
        adminPermissions: true
      })
    );
  }
}
