import * as cicd from '@aws-cdk/app-delivery';
import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as s3Assets from '@aws-cdk/aws-s3-assets';
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import assert from 'assert';
import debug from 'debug';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import * as Actions from './actions';
import { config } from './config';
import { MutatoSpec, Parser } from './parser';
import { Container } from './resources/container';
import { Network } from './resources/network';
import { Service } from './resources/service';
import { Storage } from './resources/storage';
import { Database } from './resources/database';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const toGlob = require('gitignore-globs');

/**
 * This class holds together a Mutato Pipeline (a Stack) and Mutato Resources (a
 * Stack deployed through the Mutato Pipeline stack). This is the entry point to
 * all Mutato powered microservice infrastructures.
 */
export class App extends cdk.App {
  private readonly _parser = new Parser();
  private readonly _debug = debug('mutato:App');
  private static MUTATO_YML = path.resolve(config.opts.git.local, 'mutato.yml');

  /**
   * initializes this Mutato App from a valid Mutato YAML file
   *
   * @param file Mutato YAML file path. By default it looks under your
   * current working directory for mutato.yml
   */
  public async synthesizeFromFile(file = App.MUTATO_YML): Promise<void> {
    this._debug('synthesizing Mutato app from file: %s', file);
    const yamlString = await fs.promises.readFile(file, { encoding: 'utf8' });
    this.synthesizeFromString(yamlString);
  }

  /**
   * initializes this Mutato stack from a valid Mutato YAML string
   *
   * @param string Mutato YAML string
   */
  public async synthesizeFromString(string: string): Promise<void> {
    this._debug('synthesizing Mutato app from string: %s', string);
    const ymlObject = this._parser.parse(string);
    await this.synthesizeFromObject(ymlObject as MutatoSpec);
  }

  /**
   * initializes this Mutato stack from a valid Mutato YAML object (converted to JSON)
   *
   * @param spec a valid Mutato YAML object
   */
  public async synthesizeFromObject(spec: MutatoSpec): Promise<void> {
    this._debug('synthesizing Mutato app from object: %o', spec);
    assert.ok(_.isObject(spec));

    const git = config.getGithubMetaData();
    this._debug('git meta data extracted: %o', git);

    const __ = function (name: string): string {
      return `${name}-${git.identifier}`;
    };

    this._debug('creating a stack (Mutato Pipeline)');
    const pipelineStack = new cdk.Stack(this, 'MutatoPipeline', {
      description: 'pipeline that manages deploy of mutato.yml resources',
      stackName: __('Mutato-Pipeline'),
    });

    this._debug('creating a CodePipeline to manage Mutato resources');
    const pipeline = new codePipeline.Pipeline(pipelineStack, __('pipeline'), {
      restartExecutionOnUpdate: true,
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
      oauthToken: cdk.SecretValue.plainText(config.opts.git.secret),
    });
    this._debug('adding Github action to the pipeline');
    pipeline.addStage({
      stageName: 'Mutato-Source',
      actions: [source],
    });

    this._debug('freezing the list of env vars to send to CodeBuild');
    const environmentVariables = {
      // propagate this machine's configuration into CodeBuild since Git
      // metadata and other utilities are unavailable in that environment
      ...config.toBuildEnvironmentMap(),
      ...config.toBuildEnvironmentMap(spec.environmentVariables),
      USER: { value: 'root' },
      DEBUG: { value: 'mutato*' },
      DEBUG_COLORS: { value: '0' },
      mutato_opts__git__commit: { value: source.variables.commitId },
    };
    this._debug('environment of CodeBuild: %o', environmentVariables);

    // explanation on WTF is going on here: if "asset" is not configured through
    // environment variables, that means user is executing mutato outside of the
    // CodeBuild environment. in that case, we capture mutato's source into .zip
    // and send it to CodeBuild as a CDK asset. CodeBuild won't re-run this code
    // since "config.opts.asset" is defined for it.
    let mutatoLambda: lambda.Function | null = null;
    let mutatoAssets: s3Assets.Asset | null = null;
    const lambdaName = __('mutato');
    if (!process.env.CODEBUILD_BUILD_ID) {
      this._debug('running outside of CodeBuild, package up mutato');
      mutatoAssets = new s3Assets.Asset(pipelineStack, 'mutato-asset', {
        exclude: toGlob('.gitignore'),
        path: process.cwd(),
      });
      mutatoLambda = new lambda.Function(pipelineStack, 'mutato-lambda', {
        runtime: lambda.Runtime.NODEJS_12_X,
        handler: 'index.handler',
        functionName: lambdaName,
        code: lambda.Code.fromInline(`
          exports.handler = async function() {
            return 's3://${mutatoAssets.s3BucketName}/${mutatoAssets.s3ObjectKey}';
          }
        `),
      });
    }

    this._debug('creating a CodeBuild project that synthesizes myself');
    const project = new codeBuild.PipelineProject(pipelineStack, 'build', {
      environment: {
        buildImage: codeBuild.LinuxBuildImage.fromDockerRegistry('node:lts'),
      },
      buildSpec: codeBuild.BuildSpec.fromObject({
        version: 0.2,
        phases: {
          build: {
            commands: [
              // make sure mutato knows where user's repo is mounted
              'export mutato_opts__git__local=`pwd`',
              // install AWS CLI
              'curl "s3.amazonaws.com/aws-cli/awscli-bundle.zip" -o "aws.zip"',
              'unzip aws.zip',
              './aws/install -i /usr/local/aws -b /usr/local/bin/aws',
              // find the mutato bundle address
              `aws lambda invoke --function-name ${lambdaName} url`,
              `export URL=$(cat url | sed 's/"//g')`,
              // create a working directory for mutato:
              'mkdir -p /mutato && cd /mutato',
              // pull down mutato's source used to create this pipeline
              'aws s3 cp $URL.',
              // unzip mutato into its working directory
              'unzip $(basename $URL)',
              // do cdk synth, mutato knows about user's repo over env vars
              'npm install && npm run synth',
            ],
          },
        },
        artifacts: { 'base-directory': 'dist', files: '**/*' },
      }),
    });
    mutatoLambda?.grantInvoke(project);
    mutatoAssets?.grantRead(project);

    this._debug('creating an artifact to store synthesized self');
    const synthesizedApp = new codePipeline.Artifact();
    this._debug('creating an action for the pipeline to actually build self');
    const buildAction = new codePipelineActions.CodeBuildAction({
      actionName: 'CodeBuild',
      project,
      input: githubSource,
      environmentVariables,
      outputs: [synthesizedApp],
    });

    this._debug('adding self build action to the pipeline');
    pipeline.addStage({
      stageName: 'Mutato-Synthesize',
      actions: [buildAction],
    });

    this._debug('adding a self update stage');
    pipeline.addStage({
      stageName: 'Mutato-Update',
      actions: [
        new cicd.PipelineDeployStackAction({
          stack: pipelineStack,
          input: synthesizedApp,
          adminPermissions: true,
        }),
      ],
    });

    const containerSpecs = spec.containers;
    this._debug('containers specs: %o', containerSpecs);
    const containers = _.map(containerSpecs, (containerSpec) => {
      const type = _.head(_.keys(containerSpec)) as string;
      assert.ok(type === 'docker');
      const prop = _.get(containerSpec, type);
      const name = _.get(prop, 'name', 'default');
      const construct = new Container(pipelineStack, name, prop);
      return construct;
    }) as Container[];
    const queryContainer = (
      nameOrUri: string,
      requester: string,
    ): Container => {
      this._debug('resolving container: %s', nameOrUri);
      const container = _.find(containers, (c) => c.node.id === nameOrUri);
      return container
        ? container
        : new Container(pipelineStack, `volatile-${requester}-${nameOrUri}`, {
            uri: nameOrUri,
          });
    };

    const actionSpecs = spec.actions;
    this._debug('action specs: %o', actionSpecs);
    const actions = _.map(actionSpecs, (actionSpec) => {
      const type = _.head(_.keys(actionSpec)) as string;
      const prop = _.get(actionSpec, type);
      const name = _.get(prop, 'name');
      assert.ok(name, 'actions must have a name');
      switch (type) {
        case 'docker':
          return new Actions.DockerRun({
            name,
            ...prop,
            pipeline,
            source: githubSource,
            sourceAction: source,
            container: queryContainer(prop.container, name),
          });
        case 'codebuild':
          return new Actions.CodeBuild({
            name,
            ...prop,
            pipeline,
            source: githubSource,
            sourceAction: source,
            container: _.isString(prop.container)
              ? queryContainer(prop.container, name)
              : undefined,
          });
        case 'approval':
          return new Actions.Approval({ name, ...prop });
        default:
          assert.fail(`action type not supported: ${type}`);
      }
    });

    this._debug('checking to see if we have any containers to build');
    const pipelineContainers = containers.filter((c) => c.needsBuilding);
    if (pipelineContainers.length > 0) {
      this._debug('we are building containers, adding its stages');
      const containersStage = pipeline.addStage({
        stageName: 'Mutato-Containers',
      });

      const havePreBuild = !!containerSpecs
        .map((c) => _.head(_.values(c)))
        .filter((p) => _.get(p, 'events["pre-build"]') && _.get(p, 'file'))
        ?.length;
      this._debug('container pre build events found: %s', havePreBuild);
      let containerPreBuildStage: codePipeline.IStage;
      if (havePreBuild) {
        containerPreBuildStage = pipeline.addStage({
          stageName: 'Mutato-Containers-Pre-Build',
          placement: {
            rightBefore: containersStage,
          },
        });
      }

      const havePostBuild = !!containerSpecs
        .map((c) => _.head(_.values(c)))
        .filter((p) => _.get(p, 'events["post-build"]') && _.get(p, 'file'))
        ?.length;
      this._debug('container post build events found: %s', havePostBuild);
      let containerPostBuildStage: codePipeline.IStage;
      if (havePostBuild) {
        containerPostBuildStage = pipeline.addStage({
          stageName: 'Mutato-Containers-Post-Build',
          placement: {
            justAfter: containersStage,
          },
        });
      }

      pipelineContainers.forEach((container) => {
        const events = _.get(
          containerSpecs
            .map((c) => _.head(_.values(c)))
            .find((c) => _.get(c, 'name', 'default') === container.node.id) ||
            {},
          'events',
          {},
        );

        const preBuildEventSpecs = _.get(events, 'pre-build') as string[];
        const preBuildEvents =
          (_.isString(preBuildEventSpecs)
            ? [preBuildEventSpecs]
            : preBuildEventSpecs) || [];
        preBuildEvents
          .map((ev) =>
            actions.find((actionFactory) => actionFactory.name === ev),
          )
          .forEach((actionFactory) =>
            containerPreBuildStage?.addAction(
              actionFactory?.action(
                `${container.node.id}-pre-build`,
              ) as codePipeline.IAction,
            ),
          );

        containersStage.addAction(
          new Actions.DockerBuild({
            name: `build-${container.node.id}`,
            source: githubSource,
            sourceAction: source,
            container,
            pipeline,
          }).action(container.node.id),
        );

        const postBuildEventSpecs = _.get(events, 'post-build') as string[];
        const postBuildEvents =
          (_.isString(postBuildEventSpecs)
            ? [postBuildEventSpecs]
            : postBuildEventSpecs) || [];
        postBuildEvents
          .map((ev) =>
            actions.find((actionFactory) => actionFactory.name === ev),
          )
          .forEach((actionFactory) =>
            containerPostBuildStage?.addAction(
              actionFactory?.action(
                `${container.node.id}-post-build`,
              ) as codePipeline.IAction,
            ),
          );
      });
    }

    Array.from(spec.environments.keys()).forEach((envName) => {
      const resources = spec.environments.get(envName);
      if (resources?.length === 1) {
        this._debug('environment is empty, skipping it: %s', envName);
        return;
      }
      const queryConstruct = (type: string): object[] =>
        _.filter(
          (resources?.filter(
            (c) => _.head(_.keys(c)) === type,
          ) as object[]).map((c) => _.get(c, type)),
        );
      const environment = _.head(queryConstruct('environment'));
      this._debug('creating environment: %s / %o', envName, environment);

      this._debug('creating a stack (Mutato Resources)');
      const envStack = new cdk.Stack(this, `MutatoResources-${envName}`, {
        description: `application resources for environment: ${envName}`,
        stackName: __(`Mutato-App-${envName}`),
      });

      const networkSpecs = queryConstruct('network');
      assert.ok(networkSpecs.length <= 1);
      const networkProp = _.head(networkSpecs);
      const networkName = `network-${envName}`;
      const networkConstruct = new Network(envStack, networkName, networkProp);

      const storages = queryConstruct('storage').map((props) => {
        const storageName = _.get(props, 'name', `storage-${envName}`);
        return new Storage(envStack, storageName, props);
      });

      const databases = queryConstruct('database').map((props) => {
        const databaseName = _.get(props, 'name', `database-${envName}`);
        return new Database(envStack, databaseName, {
          ...props,
          network: networkConstruct,
        });
      });

      queryConstruct('service').forEach((props) => {
        const serviceName = _.get(props, 'name', `service-${envName}`);
        const containerNameOrUri = _.get(props, 'container', 'default');
        const service = new Service(envStack, serviceName, {
          ...props,
          network: networkConstruct,
          container: queryContainer(containerNameOrUri, serviceName),
        });
        storages.forEach((storage) => storage.grantAccess(service));
        databases.forEach((database) => database.grantAccess(service));
      });

      this._debug('adding environment deploy stage');
      const deployStage = pipeline.addStage({
        stageName: `Mutato-${envName}-Deploy`,
        actions: [
          new cicd.PipelineDeployStackAction({
            stack: envStack,
            input: synthesizedApp,
            adminPermissions: true,
          }),
        ],
      });

      const havePreDeploy = !!_.get(environment, 'events["pre-deploy"]');
      if (havePreDeploy) {
        const preDeployEventSpecs = _.get(
          environment,
          'events["pre-deploy"]',
        ) as string[];
        const preDeployEvents =
          (_.isString(preDeployEventSpecs)
            ? [preDeployEventSpecs]
            : preDeployEventSpecs) || [];
        pipeline.addStage({
          stageName: `Mutato-${envName}-Pre-Deploy`,
          placement: { rightBefore: deployStage },
          actions: preDeployEvents.map(
            (ev) =>
              actions
                .find((actionFactory) => actionFactory.name === ev)
                ?.action(`${envName}-pre-deploy`) as codePipeline.IAction,
          ),
        });
      }

      const havePostDeploy = !!_.get(environment, 'events["post-deploy"]');
      if (havePostDeploy) {
        const postDeployEventSpecs = _.get(
          environment,
          'events["post-deploy"]',
        ) as string[];
        const postDeployEvents =
          (_.isString(postDeployEventSpecs)
            ? [postDeployEventSpecs]
            : postDeployEventSpecs) || [];
        pipeline.addStage({
          stageName: `Mutato-${envName}-Post-Deploy`,
          placement: { justAfter: deployStage },
          actions: postDeployEvents.map(
            (ev) =>
              actions
                .find((actionFactory) => actionFactory.name === ev)
                ?.action(`${envName}-post-deploy`) as codePipeline.IAction,
          ),
        });
      }
    });
  }
}
