import * as cdkAssert from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { MuApp } from '../lib/stack';

chai.use(chaiAsPromised);

describe('Empty Stack', () => {
  it('should have no resources before initialization', () => {
    const app = new cdk.App();
    const stack = new MuApp(app, 'MyTestStack');
    cdkAssert.expect(stack).to(
      cdkAssert.matchTemplate(
        {
          Resources: {}
        },
        cdkAssert.MatchStyle.EXACT
      )
    );
  });

  it('should be able to add basic networking with an empty schema', async () => {
    const app = new cdk.App();
    const stack = new MuApp(app, 'MyTestStack');
    await stack.fromObject({
      mu: []
    });
    cdkAssert.expect(stack).to(cdkAssert.haveResource('AWS::EC2::VPC'));
    cdkAssert.expect(stack).to(cdkAssert.haveResource('AWS::ECS::Cluster'));
  });

  it('should be able to configure networking through schema', async () => {
    const app = new cdk.App();
    const stack = new MuApp(app, 'MyTestStack');
    await stack.fromObject({
      mu: [
        {
          network: {
            vpc: {
              enableDnsHostnames: false,
              enableDnsSupport: false
            }
          }
        }
      ]
    });
    cdkAssert.expect(stack).to(
      cdkAssert.haveResource('AWS::EC2::VPC', {
        EnableDnsSupport: false,
        EnableDnsHostnames: false
      })
    );
  });
});
