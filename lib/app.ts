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
import * as constructs from './constructs';
import { Parser } from './parser';

/**
 * This class holds together a Mu Pipeline (a Stack) and Mu Resources (a Stack
 * deployed through the Mu Pipeline stack). This is the entry point to all Mu-
 * powered microservice infrastructures.
 */
export class App extends cdk.App {
  private readonly parser = new Parser();
  private readonly debug: debug.Debugger = debug('mu:App');
  private static MU_YML = path.resolve(process.cwd(), 'mu.yml');

  /**
   * initializes this Mu stack from a valid Mu YAML string
   * @param muYamlString Mu YAML string
   */
  public async synthesizeFromString(muYamlString: string): Promise<void> {
    const muYml = await this.parser.parseString(muYamlString);
    this.debug('synthesizing Mu app from string: %s', muYamlString);
    await this._synthesizeFromObject(muYml);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML file
   *
   * @param muYamlFile Mu YAML file path. By default it looks under your
   * current working directory for mu.yml
   */
  public async synthesizeFromFile(muYamlFile = App.MU_YML): Promise<void> {
    const muYml = await this.parser.parseFile(muYamlFile);
    this.debug('synthesizing Mu app from file: %s', muYamlFile);
    await this._synthesizeFromObject(muYml);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML object (converted to JSON)
   *
   * @param muYmlObject a valid Mu YAML object
   */
  private async _synthesizeFromObject(muYmlObject: object): Promise<void> {
    assert.ok(_.isObject(muYmlObject));

    // helper function to query mu.yml file for construct types
    const queryByType = (type: string): object[] =>
      _.get(muYmlObject, 'mu', [])
        .filter((c: object[]) => _.head(_.keys(c)) === type)
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        .map(c => c[type]);

    const git = config.getGithubMetaData();
    this.debug('git meta data extracted: %o', git);

    this.debug('creating a stack (Mu Pipeline)');
    const pipelineStack = new cdk.Stack(this, 'MuPipeline', {
      description: 'pipeline that manages deploy of mu.yml resources',
      stackName: `Mu-Pipeline-${git.identifier}`
    });

    this.debug('creating a stack (Mu Resources)');
    const resourcesStack = new cdk.Stack(this, 'MuResources', {
      description: 'all application resources specified in mu.yml',
      stackName: `Mu-App-${git.identifier}`
    });

    this.debug('creating a CodePipeline to manage Mu resources');
    const pipeline = new codePipeline.Pipeline(pipelineStack, 'pipeline', {
      restartExecutionOnUpdate: true
    });

    this.debug('creating an artifact to store Github source');
    const githubSource = new codePipeline.Artifact();
    this.debug('creating an action that pulls source from Github');
    const source = new codePipelineActions.GitHubSourceAction({
      actionName: 'GitHub',
      output: githubSource,
      owner: git.owner,
      repo: git.repo,
      branch: git.branch,
      /** @todo add SSM here to read github token from */
      oauthToken: cdk.SecretValue.plainText(config.opts.git.secret)
    });
    this.debug('adding Github action to the pipeline');
    pipeline.addStage({
      stageName: 'Mu-Source',
      actions: [source]
    });

    this.debug('freezing the list of env vars to send to CodeBuild');
    const environmentVariables = {
      // propagate this machine's configuration into CodeBuild since Git
      // metadata and other utilities are unavailable in that environment
      ...config.toBuildEnvironmentMap(),
      DEBUG: {
        type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: 'mu*'
      }
    };
    this.debug('environment of CodeBuild: %o', environmentVariables);

    this.debug('creating a CodeBuild project that synthesizes myself');
    const project = new codeBuild.PipelineProject(pipelineStack, 'build', {
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

    this.debug('creating an artifact to store synthesized self');
    const synthesizedApp = new codePipeline.Artifact();
    this.debug('creating an action for the pipeline to actually build self');
    const buildAction = new codePipelineActions.CodeBuildAction({
      actionName: 'CodeBuild',
      project,
      input: githubSource,
      outputs: [synthesizedApp]
    });
    this.debug('adding self build action to the pipeline');
    pipeline.addStage({
      stageName: 'Mu-Build',
      actions: [buildAction]
    });

    this.debug('adding a self update stage');
    const updateStage = pipeline.addStage({ stageName: 'Mu-Update' });
    updateStage.addAction(
      new cicd.PipelineDeployStackAction({
        stack: pipelineStack,
        input: synthesizedApp,
        adminPermissions: true
      })
    );

    // create all our container constructs, deploy stage depends on them to be
    // created before deploy (ECS obviously needs the images to be built first)
    const containerSpecs = queryByType('container');
    this.debug('container query result: %o', containerSpecs);
    const containers = (await Promise.all(
      containerSpecs
        .map(
          props =>
            new constructs.container(
              pipelineStack,
              _.get(props, 'name', 'default'),
              props
            )
        )
        .map(container => container.initialize())
    )) as constructs.container[];
    this.debug('checking to see if we have any containers to build');
    const pipelineContainers = containers.filter(c => c.needsBuilding);
    if (pipelineContainers.length > 0) {
      this.debug('we are building containers, add its stage');
      const containersStage = pipeline.addStage({ stageName: 'Mu-Containers' });
      pipelineContainers.forEach(container =>
        containersStage.addAction(
          container.createBuildAction(githubSource, pipeline)
        )
      );
    }

    // create the base network construct
    const networkSpecs = queryByType('network');
    assert.ok(networkSpecs.length <= 1);
    const networkProps = _.head(networkSpecs);
    const networkConstruct = new constructs.network(
      resourcesStack,
      'network',
      networkProps
    );
    await networkConstruct.initialize();

    // create all service constructs
    await Promise.all(
      queryByType('service')
        .map(
          props =>
            new constructs.service(
              resourcesStack,
              _.get(props, 'name', 'default'),
              {
                ...props,
                network: networkConstruct,
                container: _.find(
                  containers,
                  c => c.node.id === _.get(props, 'container', 'default')
                ) as constructs.container
              }
            )
        )
        .map(container => container.initialize())
    );

    this.debug('finished going through mu.yml, adding its deploy stage');
    const deployStage = pipeline.addStage({ stageName: 'Mu-Deploy' });
    deployStage.addAction(
      new cicd.PipelineDeployStackAction({
        stack: resourcesStack,
        input: synthesizedApp,
        adminPermissions: true
      })
    );
  }
}
