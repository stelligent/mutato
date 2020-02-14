#!/usr/bin/env node
import * as cicd from '@aws-cdk/app-delivery';
import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import * as assert from 'assert';
import * as debug from 'debug';
import * as Git from 'nodegit';
import * as parseGithubUrl from 'parse-github-url';
import 'source-map-support/register';
import { stack as MuStack } from '../lib/stack';

const log = debug('mu');

/** Mu CLI's entry point */
async function main(): Promise<void> {
  const app = new cdk.App();

  const pipelineStack = new cdk.Stack(app, 'MuPipeline');
  const pipeline = new codePipeline.Pipeline(pipelineStack, 'CodePipeline', {
    restartExecutionOnUpdate: true
  });

  const repo = await Git.Repository.open(process.cwd());
  const remote = await repo.getRemote('origin');
  const params = parseGithubUrl(remote.url());
  const branch = (await repo.getCurrentBranch()).shorthand();
  log('deploying the branch "%s" in repository: %o', params);
  assert.ok(params != null && params.owner && params.repo);

  const sourceOutput = new codePipeline.Artifact();
  const source = new codePipelineActions.GitHubSourceAction({
    actionName: 'GitHub',
    output: sourceOutput,
    owner: params?.owner as string,
    repo: params?.name as string,
    branch,
    oauthToken: process.env.GITHUB_TOKEN
      ? cdk.SecretValue.plainText(process.env.GITHUB_TOKEN)
      : cdk.SecretValue.secretsManager('GITHUB_TOKEN')
  });
  pipeline.addStage({
    stageName: 'Mu-Source',
    actions: [source]
  });

  const project = new codeBuild.PipelineProject(pipelineStack, 'CodeBuild', {
    environment: {
      buildImage: codeBuild.LinuxBuildImage.fromDockerRegistry('node:lts'),
      environmentVariables: {
        GITHUB_TOKEN: {
          type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: process.env.GITHUB_TOKEN // fixme
        }
      }
    },
    buildSpec: codeBuild.BuildSpec.fromObject({
      version: 0.2,
      phases: {
        install: {
          commands: ['npm install']
        },
        build: {
          commands: ['npx cdk synth -- -o dist']
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
      stack: pipelineStack,
      input: synthesizedApp,
      adminPermissions: true
    })
  );

  const deployStage = pipeline.addStage({ stageName: 'Mu-Deploy' });
  const muStack = new MuStack(app, 'MuStack', {
    description: 'Mu managed micro-service'
  });
  await muStack.fromFile();
  const muDeploy = new cicd.PipelineDeployStackAction({
    stack: muStack,
    input: synthesizedApp,
    adminPermissions: true
  });
  deployStage.addAction(muDeploy);
}

main().catch(err => {
  log('failed to deploy with Mu: %o', err);
  process.exit(1);
});
