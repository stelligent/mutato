import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import debug from 'debug';
import path from 'path';
import { App as MutatoApp } from '../lib/app';
import { config } from '../lib/config';
import * as cdkAssert from '@aws-cdk/assert';
import { SynthesizeHelpers } from '../lib/helpers/synthesizeHelpers';

chai.use(chaiAsPromised);

describe('App Synthesize from String Tests', () => {
  it('should not throw when parsing string', () => {
    const _debug = debug('mutato:App');
    const file = path.resolve(config.opts.git.local, 'mutato.yml');

    chai.assert.doesNotThrow(() => {
      SynthesizeHelpers.createYamlStringFromFile(_debug, file);
    });
  });

  it('should create the expected construct from a string.', async () => {
    const app = new MutatoApp();
    // const stack = new cdk.Stack(app, 'MyTestStack');
    app.synthesizeFromString(`
    environments:
      - acceptance
      - production
    resources:
      - service:
          provider: fargate
          container: nginx:latest
      - network:
          vpc:
            maxAZs: {{ 1 if environment == "acceptance" else 3 }}`);
    cdkAssert
      .expect(app.pipelineStack)
      .to(cdkAssert.haveResource('AWS::CodePipeline::Pipeline'));
  });
});
