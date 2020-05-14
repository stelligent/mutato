import * as cicd from '@aws-cdk/app-delivery';
import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import fs from 'fs';
import _ from 'lodash';
import * as Actions from '../actions';
import { config } from '../config';

export class SynthesizeHelpers {
  /**
   * Creates a yaml string from a yaml file
   *
   * @param debug the debugger
   * @param file the file path of the yaml file to open
   *
   * @returns the output of the yaml string created from a file
   */
  public static async createYamlStringFromFile(
    debug: debug.Debugger,
    file: string,
  ): Promise<string> {
    debug('synthesizing Mutato app from file: %s', file);
    const yamlString = await fs.promises.readFile(file, { encoding: 'utf8' });
    return yamlString;
  }

  /**
   * Adds a source action to the Mutato CodePipeline
   *
   * @param debug the debugger
   * @param pipeline the codepipeline to add the source actions to
   * @param git metadata about the git source
   *
   * @returns a Github codepipeline Artifact and Github codepipeline action
   */
  public static createMutatoCodePipelineSourceAction(
    debug: debug.Debugger,
    pipeline: codePipeline.Pipeline,
    git: { repo: string; owner: string; branch: string; identifier: string },
  ): {
    githubSource: codePipeline.Artifact;
    source: codePipelineActions.GitHubSourceAction;
  } {
    debug('creating an artifact to store Github source');
    const githubSource = new codePipeline.Artifact('S');
    debug('creating an action that pulls source from Github');
    const source = new codePipelineActions.GitHubSourceAction({
      variablesNamespace: 'GH',
      actionName: 'GitHub',
      output: githubSource,
      owner: git.owner,
      repo: git.repo,
      branch: git.branch,
      /** @todo add SSM here to read github token from */
      oauthToken: cdk.SecretValue.plainText(config.opts.git.secret),
    });
    debug('adding Github action to the pipeline');
    pipeline.addStage({
      stageName: 'Mutato-Source',
      actions: [source],
    });
    return { githubSource, source };
  }
  /**
   * Adds a Codebuild project to the Mutato stack
   *
   * @param debug the debugger
   * @param variables codebuild environment variables
   * @param pipelineStack the cdk.Stack to add the codebuild project to
   *
   * @returns a codebuild pipeline project
   */
  public static createMutatoCodeBuildProject(
    debug: debug.Debugger,
    variables: { [key: string]: codeBuild.BuildEnvironmentVariable },
    pipelineStack: cdk.Stack,
  ): codeBuild.PipelineProject {
    debug('creating a CodeBuild project that synthesizes myself');
    const project = new codeBuild.PipelineProject(pipelineStack, 'build', {
      environment: {
        buildImage: codeBuild.LinuxBuildImage.fromDockerRegistry('node:lts'),
        environmentVariables: variables,
      },
      buildSpec: codeBuild.BuildSpec.fromObject({
        version: 0.2,
        phases: {
          build: {
            commands: [
              '/bin/bash',
              // make sure mutato knows where user's repo is mounted
              'export mutato_opts__git__local=`pwd`',
              // install AWS CLI
              'mkdir -p /aws-cli && cd /aws-cli',
              'curl "s3.amazonaws.com/aws-cli/awscli-bundle.zip" -o "awscli-bundle.zip"',
              'unzip awscli-bundle.zip',
              './awscli-bundle/install -i /usr/local/aws -b /usr/local/bin/aws',
              // create the mutato bundle address
              `export BUNDLE="s3://$mutato_opts__bundle__bucket/$mutato_opts__bundle__object"`,
              // pull down mutato's bundle used to create this pipeline
              'mkdir -p /mutato && cd /mutato',
              'aws s3 cp "$BUNDLE" .',
              'unzip $(basename "$BUNDLE")',
              // prepare the environment
              'chmod +x .env && . ./.env && rm .env',
              // do cdk synth, mutato knows about user's repo over env vars
              'npm install && npm run synth',
              // show the user what changes they just pushed
              'npm run --silent cdk -- diff || true',
            ],
          },
        },
        artifacts: { 'base-directory': 'dist', files: '**/*' },
      }),
    });

    // band-aid for admin permission issues during deploy. FIXME
    debug('granting admin permission to the synthesize build stage');
    project.addToRolePolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: ['*'],
      }),
    );

    return project;
  }

  /**
   * Add the predeploy, deploy, and postdpeloy stages to a Mutato CodePipeline
   *
   * @param environment the environment to fetch the events from
   * @param debug the debugger
   * @param pipeline the pipeline to add the deploy stage to
   * @param envName the name of the environment
   * @param envStack the environment stack to deploy from the synthesized CDK
   * template
   * @param synthesizedApp the synthesized app template created as a
   * codepipeline artifact
   * @param actions codebuild or approval action
   */
  public static addMutatoPipelineDeployStages(
    environment: object | undefined,
    debug: debug.Debugger,
    pipeline: codePipeline.Pipeline,
    envName: string,
    envStack: cdk.Stack,
    synthesizedApp: codePipeline.Artifact,
    actions: (Actions.CodeBuild | Actions.Approval)[],
  ): void {
    debug('adding environment deploy stage');
    // Create deploy stage for given pipeline.
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
    // Checks for a pre and post deploy event before configuring them
    const havePreDeploy = !!_.get(environment, 'events["pre-deploy"]');
    const havePostDeploy = !!_.get(environment, 'events["post-deploy"]');
    if (havePreDeploy) {
      this.addPrePostDeployStage(
        environment,
        'events["pre-deploy"]',
        pipeline,
        `Mutato-${envName}-Pre-Deploy`,
        `${envName}-pre-deploy`,
        deployStage,
        actions,
      );
    }
    if (havePostDeploy) {
      this.addPrePostDeployStage(
        environment,
        'events["post-deploy"]',
        pipeline,
        `Mutato-${envName}-Post-Deploy`,
        `${envName}-Post-deploy`,
        deployStage,
        actions,
      );
    }
  }

  /**
   * @param environment the environment to fetch the events from
   * @param event the event to fetch from the environment
   * @param pipeline the pipeline to add the pre/post deploy stage to
   * @param stageName the name of the pre/post deploystage
   * @param actionName the name of the codepipeline pre/post deploy action
   * @param deployStage the stage to play the pre/post deploy stage after
   * @param actions the list of actions for the pipeline
   */
  public static addPrePostDeployStage(
    environment: object | undefined,
    event: string,
    pipeline: codePipeline.Pipeline,
    stageName: string,
    actionName: string,
    deployStage: codePipeline.IStage,
    actions: (Actions.CodeBuild | Actions.Approval)[],
  ): void {
    const deployEventSpecs = _.get(environment, event) as string[];
    const deployEvents =
      (_.isString(deployEventSpecs) ? [deployEventSpecs] : deployEventSpecs) ||
      [];
    pipeline.addStage({
      stageName: `${stageName}`,
      placement: { justAfter: deployStage },
      actions: deployEvents.map(
        (ev) =>
          actions
            .find((actionFactory) => actionFactory.name === ev)
            ?.action(`${actionName}`) as codePipeline.IAction,
      ),
    });
  }
}
