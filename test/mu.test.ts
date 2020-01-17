import {
  expect as expectCDK,
  MatchStyle,
  matchTemplate
} from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import Mu = require('../lib/mu-stack');

describe('Empty Stack', () => {
  it('should have no resources', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Mu.MuStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(
      matchTemplate(
        {
          Resources: {}
        },
        MatchStyle.EXACT
      )
    );
  });
});
