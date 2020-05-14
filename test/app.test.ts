import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'path';
import { App as MutatoApp } from '../lib/app';
import { config } from '../lib/config';
import * as cdkAssert from '@aws-cdk/assert';
import { Parser } from '../lib/parser';

chai.use(chaiAsPromised);

describe('App Synthesize from String Tests', () => {
  it('should not throw when parsing file', () => {
    const app = new MutatoApp();
    const file = path.resolve(config.opts.git.local, 'mutato.yml');

    chai.assert.doesNotThrow(() => {
      app.synthesizeFromFile(file);
    });
  });
  it('should not throw when parsing string', () => {
    const app = new MutatoApp();
    chai.assert.doesNotThrow(() => {
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
    });
  });
  it('should not throw when parsing object', () => {
    const app = new MutatoApp();
    const _parser = new Parser();
    const fileString = `
    environments:
      - acceptance
      - production
    resources:
      - service:
          provider: fargate
          container: nginx:latest
      - network:
          vpc:
            maxAZs: {{ 1 if environment == "acceptance" else 3 }}`;
    const ymlObject = _parser.parse(fileString);
    chai.assert.doesNotThrow(() => {
      app.synthesizeFromObject(ymlObject);
    });
  });
});

describe('Create Expected Resources', () => {
  const app = new MutatoApp();
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

  it('should create the expected pipeline resources', () => {
    cdkAssert
      .expect(app.pipelineStack)
      .to(cdkAssert.haveResource('AWS::CodePipeline::Pipeline'));
    cdkAssert
      .expect(app.pipelineStack)
      .to(cdkAssert.haveResource('AWS::CodePipeline::Pipeline'));
  });
  it('should create the expected app env resources', () => {
    for (const envStack of app.envStacks) {
      cdkAssert
        .expect(envStack)
        .to(cdkAssert.haveResource('AWS::ECS::Cluster'));
      cdkAssert
        .expect(envStack)
        .to(cdkAssert.haveResource('AWS::ECS::TaskDefinition'));
      cdkAssert.expect(envStack).to(
        cdkAssert.haveResource('AWS::ECS::Service', {
          LaunchType: 'FARGATE',
        }),
      );
      cdkAssert.expect(envStack).to(
        cdkAssert.haveResourceLike('AWS::ECS::TaskDefinition', {
          ContainerDefinitions: [
            {
              Essential: true,
              Image: 'nginx:latest',
            },
          ],
        }),
      );
    }
  });
});
