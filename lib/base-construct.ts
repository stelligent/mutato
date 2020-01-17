import * as cdk from '@aws-cdk/core';
import * as pjson from '../package.json';

export abstract class BaseConstruct extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    cdk.Tag.add(this, 'mu:vendor', 'Stelligent');
    cdk.Tag.add(this, 'mu:version', pjson.version);
  }
}
