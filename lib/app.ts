import * as cicd from '@aws-cdk/app-delivery';
import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import assert from 'assert';
import debug from 'debug';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import * as Actions from './actions';
import { config } from './config';
import { MuSpec, Parser } from './parser';
import { Container } from './resources/container';
import { Network } from './resources/network';
import { Service } from './resources/service';

/**
 * This class holds together a Mu Pipeline (a Stack) and Mu Resources (a Stack
 * deployed through the Mu Pipeline stack). This is the entry point to all Mu-
 * powered microservice infrastructures.
 */
export class App extends cdk.App {
  private readonly _parser = new Parser();
  private readonly _debug = debug('mu:App');
  private static MU_YML = path.resolve(process.cwd(), 'mu.yml');

  /**
   * initializes this Mu App from a valid Mu YAML file
   *
   * @param file Mu YAML file path. By default it looks under your
   * current working directory for mu.yml
   */
  public async synthesizeFromFile(file = App.MU_YML): Promise<void> {
    this._debug('synthesizing Mu app from file: %s', file);
    const muYamlString = await fs.promises.readFile(file, { encoding: 'utf8' });
    this.synthesizeFromString(muYamlString);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML string
   *
   * @param string Mu YAML string
   */
  public async synthesizeFromString(string: string): Promise<void> {
    this._debug('synthesizing Mu app from string: %s', string);
    const muYmlObject = this._parser.parse(string);
    await this.synthesizeFromObject(muYmlObject as MuSpec);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML object (converted to JSON)
   *
   * @param spec a valid Mu YAML object
   */
  public async synthesizeFromObject(spec: MuSpec): Promise<void> {
    this._debug('synthesizing Mu app from object: %o', spec);
    assert.ok(_.isObject(spec));

    const git = config.getGithubMetaData();
    this._debug('git meta data extracted: %o', git);

    this._debug('creating a stack (Mu Pipeline)');
    const pipelineStack = new cdk.Stack(this, 'MuPipeline', {
      description: 'pipeline that manages deploy of mu.yml resources',
      stackName: `Mu-Pipeline-${git.identifier}`
    });

    this._debug('creating a CodePipeline to manage Mu resources');
    const pipeline = new codePipeline.Pipeline(pipelineStack, 'pipeline', {
      restartExecutionOnUpdate: true
    });

    this._debug('creating an artifact to store Github source');
    const githubSource = new codePipeline.Artifact();
    this._debug('creating an action that pulls source from Github');
    const source = new codePipelineActions.GitHubSourceAction({
      actionName: 'GitHub',
      output: githubSource,
      owner: git.owner,
      repo: git.repo,
      branch: git.branch,
      /** @todo add SSM here to read github token from */
      oauthToken: cdk.SecretValue.plainText(config.opts.git.secret)
    });
    this._debug('adding Github action to the pipeline');
    pipeline.addStage({
      stageName: 'Mu-Source',
      actions: [source]
    });

    this._debug('freezing the list of env vars to send to CodeBuild');
    const environmentVariables = {
      // propagate this machine's configuration into CodeBuild since Git
      // metadata and other utilities are unavailable in that environment
      ...config.toBuildEnvironmentMap(),
      USER: {
        type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: 'root'
      },
      DEBUG: {
        type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: 'mu*'
      },
      DEBUG_COLORS: {
        type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
        value: '0'
      }
    };
    this._debug('environment of CodeBuild: %o', environmentVariables);

    this._debug('creating a CodeBuild project that synthesizes myself');
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

    this._debug('creating an artifact to store synthesized self');
    const synthesizedApp = new codePipeline.Artifact();
    this._debug('creating an action for the pipeline to actually build self');
    const buildAction = new codePipelineActions.CodeBuildAction({
      actionName: 'CodeBuild',
      project,
      input: githubSource,
      outputs: [synthesizedApp]
    });

    this._debug('adding self build action to the pipeline');
    pipeline.addStage({
      stageName: 'Mu-Synthesize',
      actions: [buildAction]
    });

    this._debug('adding a self update stage');
    pipeline.addStage({
      stageName: 'Mu-Update',
      actions: [
        new cicd.PipelineDeployStackAction({
          stack: pipelineStack,
          input: synthesizedApp,
          adminPermissions: true
        })
      ]
    });

    const containerSpecs = spec.containers;
    this._debug('containers specs: %o', containerSpecs);
    const containers = _.map(containerSpecs, containerSpec => {
      const type = _.head(_.keys(containerSpec)) as string;
      assert.ok(type === 'docker');
      const prop = _.get(containerSpec, type);
      const name = _.get(prop, 'name', 'default');
      const construct = new Container(pipelineStack, name, prop);
      return construct;
    }) as Container[];
    const queryContainer = (
      nameOrUri: string,
      requester: string
    ): Container => {
      this._debug('resolving container: %s', nameOrUri);
      const container = _.find(containers, c => c.node.id === nameOrUri);
      return container
        ? container
        : new Container(pipelineStack, `volatile-${requester}-${nameOrUri}`, {
            uri: nameOrUri
          });
    };

    const actionSpecs = spec.actions;
    this._debug('action specs: %o', actionSpecs);
    const actions = _.map(actionSpecs, actionSpec => {
      const type = _.head(_.keys(actionSpec)) as string;
      const prop = _.get(actionSpec, type);
      const name = _.get(prop, 'name', `default-action-${type}`);
      switch (type) {
        case 'docker':
          return new Actions.DockerRun({
            name,
            ...prop,
            pipeline,
            source: githubSource,
            container: queryContainer(prop.container, name)
          });
        case 'codebuild':
          return new Actions.CodeBuild({
            name,
            ...prop,
            pipeline,
            source: githubSource,
            container: _.isString(prop.container)
              ? queryContainer(prop.container, name)
              : undefined
          });
        case 'approval':
          return new Actions.Approval({ name, ...prop });
        default:
          assert.fail(`action type not supported: ${type}`);
      }
    });

    this._debug('checking to see if we have any containers to build');
    const pipelineContainers = containers.filter(c => c.needsBuilding);
    if (pipelineContainers.length > 0) {
      this._debug('we are building containers, add its stage');
      const containersStage = pipeline.addStage({ stageName: 'Mu-Containers' });
      pipelineContainers.forEach(container => {
        const events = _.get(
          containerSpecs.find(containerSpec => {
            const type = _.head(_.keys(containerSpec)) as string;
            assert.ok(type === 'docker');
            const prop = _.get(containerSpec, type);
            const name = _.get(prop, 'name', 'default');
            return name === container.node.id;
          }) || {},
          'events',
          {}
        );
        const preBuild = actions.find(
          factory =>
            factory.action(1).actionProperties.actionName ===
            _.get(events, 'pre-build', '')
        );
        if (preBuild) containersStage.addAction(preBuild.action(1));
        containersStage.addAction(
          new Actions.DockerBuild({
            name: `build-${container.node.id}`,
            source: githubSource,
            container,
            pipeline
          }).action(2)
        );
        const postBuild = actions.find(
          factory =>
            factory.action(3).actionProperties.actionName ===
            _.get(events, 'post-build', '')
        );
        if (postBuild) containersStage.addAction(postBuild.action(3));
      });
    }

    Array.from(spec.environments.keys()).forEach(envName => {
      const queryConstruct = (type: string): object[] =>
        _.filter(
          (spec.environments
            .get(envName)
            ?.filter(c => _.head(_.keys(c)) === type) as object[]).map(c =>
            _.get(c, type)
          )
        );
      const environment = _.head(queryConstruct('environment'));
      this._debug('creating environment: %s / %o', envName, environment);

      this._debug('creating a stack (Mu Resources)');
      const envStack = new cdk.Stack(this, `MuResources-${envName}`, {
        description: `application resources for environment: ${envName}`,
        stackName: `Mu-App-${envName}-${git.identifier}`
      });

      const networkSpecs = queryConstruct('network');
      assert.ok(networkSpecs.length <= 1);
      const networkProp = _.head(networkSpecs);
      const networkName = `network-${envName}`;
      const networkConstruct = new Network(envStack, networkName, networkProp);

      queryConstruct('service').forEach(props => {
        const serviceName = _.get(props, 'name', `service-${envName}`);
        const containerNameOrUri = _.get(props, 'container', 'default');
        return new Service(envStack, serviceName, {
          ...props,
          network: networkConstruct,
          container: queryContainer(containerNameOrUri, serviceName)
        });
      });

      const events = _.get(environment || {}, 'events', {});
      const preDeploy = actions.find(
        factory =>
          factory.action(1).actionProperties.actionName ===
          _.get(events, 'pre-deploy', '')
      );
      const postDeploy = actions.find(
        factory =>
          factory.action(3).actionProperties.actionName ===
          _.get(events, 'post-deploy', '')
      );

      this._debug('adding environment deploy stage');
      if (preDeploy) {
        pipeline.addStage({
          stageName: `Mu-Pre-Deploy-${envName}`,
          actions: [preDeploy.action(1)]
        });
      }
      pipeline.addStage({
        stageName: `Mu-Deploy-${envName}`,
        actions: [
          new cicd.PipelineDeployStackAction({
            stack: envStack,
            input: synthesizedApp,
            adminPermissions: true
          })
        ]
      });
      if (postDeploy) {
        pipeline.addStage({
          stageName: `Mu-Post-Deploy-${envName}`,
          actions: [postDeploy.action(1)]
        });
      }
    });
  }
}
