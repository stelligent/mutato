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
import { config } from './config';
import { Container } from './constructs/container';
import { Network } from './constructs/network';
import { Service } from './constructs/service';
import { MuEnvironmentSpecMap, Parser } from './parser';

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
    await this.synthesizeFromObject(muYmlObject as MuEnvironmentSpecMap);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML object (converted to JSON)
   *
   * @param obj a valid Mu YAML object
   */
  public async synthesizeFromObject(obj: MuEnvironmentSpecMap): Promise<void> {
    this._debug('synthesizing Mu app from object: %o', obj);
    assert.ok(_.isObject(obj));

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

    const containerSpecs = _.head(Array.from(obj.values()))?.containers;
    this._debug('containers gathered: %o', containerSpecs);
    const containers = _.map(containerSpecs, container => {
      const type = _.head(_.keys(container)) as string;
      assert.ok(type === 'docker');
      const prop = _.get(container, type);
      const name = _.get(prop, 'name', 'default');
      const construct = new Container(pipelineStack, name, prop);
      return construct;
    }) as Container[];
    this._debug('checking to see if we have any containers to build');
    const pipelineContainers = containers.filter(c => c.needsBuilding);
    if (pipelineContainers.length > 0) {
      this._debug('we are building containers, add its stage');
      const containersStage = pipeline.addStage({ stageName: 'Mu-Containers' });
      pipelineContainers.forEach(container =>
        containersStage.addAction(
          container.createBuildAction(githubSource, pipeline)
        )
      );
    }

    Array.from(obj.keys()).forEach(envName => {
      const environment = obj.get(envName);
      this._debug('creating environment: %s / %o', envName, environment);

      this._debug('creating a stack (Mu Resources)');
      const envStack = new cdk.Stack(this, `MuResources-${envName}`, {
        description: `application resources for environment: ${envName}`,
        stackName: `Mu-App-${envName}-${git.identifier}`
      });

      const queryByType = (type: string): object[] =>
        _.filter(
          (environment?.resources?.filter(
            c => _.head(_.keys(c)) === type
          ) as object[]).map(c => _.get(c, type))
        );

      const networkSpecs = queryByType('network');
      assert.ok(networkSpecs.length <= 1);
      const networkProp = _.head(networkSpecs);
      const networkName = `network-${envName}`;
      const networkConstruct = new Network(envStack, networkName, networkProp);

      queryByType('service').forEach(
        props =>
          new Service(envStack, _.get(props, 'name', `service-${envName}`), {
            ...props,
            network: networkConstruct,
            container: _.find(
              containers,
              c => c.node.id === _.get(props, 'container', 'default')
            ) as Container
          })
      );

      this._debug('adding environment deploy stage');
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
    });
  }
}
