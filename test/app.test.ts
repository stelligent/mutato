import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import debug from 'debug';
import path from 'path';
import { config } from '../lib/config';
import * as cicd from '@aws-cdk/app-delivery';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as cdk from '@aws-cdk/core';
import { createMock } from 'ts-auto-mock';

import { App } from '../lib/app';
import * as Actions from '../lib/actions';
import { expect } from '@aws-cdk/assert';
import { SynthesizeHelpers } from '../lib/helpers/synthesizeHelpers';
import { CodeBuild } from '../lib/actions';
import { Action } from '@aws-cdk/aws-codepipeline-actions';

chai.use(chaiAsPromised);

describe('App Synthesize from String Tests', () => {
  it('should not throw when parsing string', () => {
    const _debug = debug('mutato:App');
    const file = path.resolve(config.opts.git.local, 'mutato.yml');

    chai.assert.doesNotThrow(() => {
      SynthesizeHelpers.createYamlStringFromFile(_debug, file);
    });
  });

  it('should not throw when adding a pre and post deploy stage.', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const environment = {};
    const event = '';
    const pipeline = new codePipeline.Pipeline(stack, 'Test-Pipeline');
    const stageName = 'Test-Stage';
    const actionName = 'Test-Action';
    const deployStage = pipeline.addStage({
      stageName: `Mutato-Stage`,
      actions: [
        new cicd.PipelineDeployStackAction({
          stack: stack,
          input: new codePipeline.Artifact(),
          adminPermissions: true,
        }),
      ],
    });
    const actions = [
      createMock<Actions.CodeBuild>(),
      createMock<Actions.CodeBuild>(),
    ];

    chai.assert.doesNotThrow(() => {
      SynthesizeHelpers.addPrePostDeployStage(
        environment,
        event,
        pipeline,
        stageName,
        actionName,
        deployStage,
        actions,
      );
    });
  });
});
