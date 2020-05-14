import * as cicd from '@aws-cdk/app-delivery';
import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as s3Assets from '@aws-cdk/aws-s3-assets';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
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
import * as Errors from './errors';
import { SynthesizeHelpers } from './helpers/synthesizeHelpers';
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
  public pipelineStack: cdk.Stack;
  public envStack: cdk.Stack;
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
    if (!_.isObject(spec)) {
      throw new Errors.InvalidMutatoYamlObjectError(spec);
    }

    const git = config.getGithubMetaData();
    this._debug('git meta data extracted: %o', git);

    const __ = function (name: string): string {
      return `${name}-${git.identifier}`;
    };

    this._debug('creating a stack (Mutato Pipeline)');
    this.pipelineStack = new cdk.Stack(this, 'MutatoPipeline', {
      description: 'pipeline that manages deploy of mutato.yml resources',
      stackName: __('Mutato-Pipeline'),
    });

    this._debug('creating a CodePipeline to manage Mutato resources');
    const pipeline = new codePipeline.Pipeline(
      this.pipelineStack,
      __('pipeline'),
      {
        restartExecutionOnUpdate: true,
      },
    );

    const actionSources = SynthesizeHelpers.createMutatoCodePipelineSourceAction(
      this._debug,
      pipeline,
      git,
    );
    const githubSource = actionSources.githubSource;
    const source = actionSources.source;

    let variables: { [key: string]: codeBuild.BuildEnvironmentVariable } = {};
    // explanation on WTF is going on here: if "bundle" isn't configured through
    // environment variables, that means user is executing mutato outside of the
    // CodeBuild environment. in that case, we capture mutato's source into .zip
    // and send it to CodeBuild as a CDK asset. CodeBuild won't re-run this code
    // since "config.opts.bundle" is defined for it.
    if (!process.env.CODEBUILD_BUILD_ID) {
      this._debug('running outside of CodeBuild, package up mutato');
      if (config.opts.bundle.bucket || config.opts.bundle.object) {
        throw new Errors.PackageConfigError();
      }

      this._debug('freezing the list of env vars to send to CodeBuild');
      const envFile = _.map(
        {
          ...config.toStringEnvironmentMap(),
          ...spec.environmentVariables,
          USER: 'root',
          DEBUG: 'mutato*',
          DEBUG_COLORS: '0',
        },
        (v, k) => `export ${k}=${v};`,
      ).join('\n');
      this._debug('variables env file: %s', envFile);
      const generatedEnvPath = '.env';
      await fs.promises.writeFile(generatedEnvPath, envFile, {
        encoding: 'utf-8',
      });
      if (!fs.existsSync(generatedEnvPath)) {
        throw new Errors.EnvFileDoesNotExistError();
      }
      const bundle = new s3Assets.Asset(
        this.pipelineStack,
        __('mutato-asset'),
        {
          exclude: _.concat(
            '.git',
            'mutato.yml',
            toGlob('.gitignore'),
            '!.env',
          ),
          path: process.cwd(),
        },
      );
      variables = config.toBuildEnvironmentMap({
        mutato_opts__bundle__bucket: bundle.s3BucketName,
        mutato_opts__bundle__object: bundle.s3ObjectKey,
      });
    } else {
      // the first time user deploys through their terminal, this causes a loop
      // from Synth -> Update -> Synth again because the underlying CFN template
      // is changing from using a CDN param (CDK asset) to an inline bucket. but
      // the result is the same, therefore it goes out of the loop
      if (!config.opts.bundle.bucket && !config.opts.bundle.object) {
        throw new Errors.PackageConfigError();
      }
      const bundle = `s3://${config.opts.bundle.bucket}/${config.opts.bundle.object}`;
      this._debug('running inside CodeBuild, using mutato bundle: %s', bundle);
      // so that it is not destroyed when synth stage passes for the first time
      s3.Bucket.fromBucketName(
        this.pipelineStack,
        __('mutato-bucket'),
        config.opts.bundle.bucket,
      );
      variables = config.toBuildEnvironmentMap({
        mutato_opts__bundle__bucket: config.opts.bundle.bucket,
        mutato_opts__bundle__object: config.opts.bundle.object,
      });
    }

    const project = SynthesizeHelpers.createMutatoCodeBuildProject(
      this._debug,
      variables,
      this.pipelineStack,
    );

    this._debug('creating an artifact to store synthesized self');
    const synthesizedApp = new codePipeline.Artifact();
    this._debug('creating an action for the pipeline to actually build self');
    const buildAction = new codePipelineActions.CodeBuildAction({
      actionName: 'CodeBuild',
      project,
      input: githubSource,
      outputs: [synthesizedApp],
      environmentVariables: {
        mutato_opts__git__commit: { value: source.variables.commitId },
      },
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
          stack: this.pipelineStack,
          input: synthesizedApp,
          adminPermissions: true,
        }),
      ],
    });

    const containerSpecs = spec.containers;
    this._debug('containers specs: %o', containerSpecs);
    const containers = _.map(containerSpecs, (containerSpec) => {
      const type = _.head(_.keys(containerSpec)) as string;
      const expectedType = 'docker';
      if (type !== expectedType) {
        throw new Errors.InvalidContainerSpecType(type, expectedType);
      }

      const prop = _.get(containerSpec, type);
      const name = _.get(prop, 'name', 'default');
      const construct = new Container(this.pipelineStack, name, prop);
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
        : new Container(
            this.pipelineStack,
            `volatile-${requester}-${nameOrUri}`,
            {
              uri: nameOrUri,
            },
          );
    };

    const actionSpecs = spec.actions;
    this._debug('action specs: %o', actionSpecs);
    const actions = _.map(actionSpecs, (actionSpec) => {
      const type = _.head(_.keys(actionSpec)) as string;
      const prop = _.get(actionSpec, type);
      const name = _.get(prop, 'name');
      if (!name) {
        throw new Errors.UndefinedActionNameError();
      }
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
          throw new Errors.UnsupportedActionTypeError(type);
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
      this.envStack = new cdk.Stack(this, `MutatoResources-${envName}`, {
        description: `application resources for environment: ${envName}`,
        stackName: __(`Mutato-App-${envName}`),
      });

      const networkSpecs = queryConstruct('network');
      if (networkSpecs.length > 1) {
        throw new Errors.TooManyNetworkSpecs();
      }
      const networkProp = _.head(networkSpecs);
      const networkName = `network-${envName}`;
      const networkConstruct = new Network(
        this.envStack,
        networkName,
        networkProp,
      );

      const storages = queryConstruct('storage').map((props) => {
        const storageName = _.get(props, 'name', `storage-${envName}`);
        return new Storage(this.envStack, storageName, props);
      });

      const databases = queryConstruct('database').map((props) => {
        const databaseName = _.get(props, 'name', `database-${envName}`);
        return new Database(this.envStack, databaseName, {
          ...props,
          network: networkConstruct,
        });
      });

      queryConstruct('service').forEach((props) => {
        const serviceName = _.get(props, 'name', `service-${envName}`);
        const containerNameOrUri = _.get(props, 'container', 'default');
        const service = new Service(this.envStack, serviceName, {
          ...props,
          network: networkConstruct,
          container: queryContainer(containerNameOrUri, serviceName),
        });
        storages.forEach((storage) => storage.grantAccess(service));
        databases.forEach((database) => database.grantAccess(service));
      });
      // Adds the deploy, predeploy, and post deploy stages to the Mutato CodePipeline
      SynthesizeHelpers.addMutatoPipelineDeployStages(
        environment,
        this._debug,
        pipeline,
        envName,
        this.envStack,
        synthesizedApp,
        actions,
      );
    });
  }
}
