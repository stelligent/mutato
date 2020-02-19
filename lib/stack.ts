import * as cicd from '@aws-cdk/app-delivery';
import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import * as assert from 'assert';
import * as debug from 'debug';
import * as _ from 'lodash';
import * as parseGithubUrl from 'parse-github-url';
import * as path from 'path';
import { config, flatten as flattenedConfig } from './config';
import { Parser } from './parser';
import { Registry } from './registry';

/**
 * The Mu app stack, everything inside a mu.yml
 */
export class MuApp extends cdk.Stack {
  private readonly registry = new Registry(this);
  private readonly parser = new Parser();
  private readonly log: debug.Debugger;

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
    const networkProps = _.get(muYml, 'mu.network', {});
    await this.registry.create('network', 'network', networkProps);
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
    const params = parseGithubUrl(config.opts.git.remote);
    const branch = config.opts.git.branch;
    this.log('deploying the branch "%s" in repository: %o', branch, params);

    /** @todo properly handle non Github repositories */
    assert.ok(params != null && params.owner && params.repo);

    const sourceOutput = new codePipeline.Artifact();
    const source = new codePipelineActions.GitHubSourceAction({
      actionName: 'GitHub',
      output: sourceOutput,
      owner: params?.owner as string,
      repo: params?.name as string,
      branch,
      oauthToken: cdk.SecretValue.plainText(
        /** @todo add SSM here to read github token from */
        config.opts.git.secret
      )
    });
    pipeline.addStage({
      stageName: 'Mu-Source',
      actions: [source]
    });

    const wrapVal = (value: string): codeBuild.BuildEnvironmentVariable => {
      return { type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT, value };
    };

    this.log('forwarding configuration to CodeBuild: %o', flattenedConfig);
    const wrappedFlattenedConfig = _.mapValues(flattenedConfig, wrapVal);

    const project = new codeBuild.PipelineProject(this, 'CodeBuild', {
      environment: {
        buildImage: codeBuild.LinuxBuildImage.fromDockerRegistry('node:lts'),
        environmentVariables: {
          DEBUG: wrapVal('mu*'),
          // propagate this machine's configuration into CodeBuild since Git
          // metadata and other utilities are unavailable in that environment
          ...wrappedFlattenedConfig
        }
      },
      buildSpec: codeBuild.BuildSpec.fromObject({
        version: 0.2,
        phases: {
          install: {
            commands: ['npm install']
          },
          build: {
            commands: ['npx cdk synth -o dist']
          }
        },
        artifacts: {
          'base-directory': 'dist',
          files: '**/*'
        }
      })
    });
    const synthesizedApp = new codePipeline.Artifact();
    const buildAction = new codePipelineActions.CodeBuildAction({
      actionName: 'CodeBuild',
      project,
      input: sourceOutput,
      outputs: [synthesizedApp]
    });
    pipeline.addStage({
      stageName: 'Mu-Build',
      actions: [buildAction]
    });

    const SelfUpdateStage = pipeline.addStage({ stageName: 'Mu-SelfUpdate' });
    SelfUpdateStage.addAction(
      new cicd.PipelineDeployStackAction({
        stack: this,
        input: synthesizedApp,
        adminPermissions: true
      })
    );

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
