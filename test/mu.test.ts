import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import Mu = require('../lib/mu-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Mu.MuStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
