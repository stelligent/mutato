import * as cdk from '@aws-cdk/core';
import * as pjson from '../package.json';

/**
 * BaseConstruct used for all other constructs
 */
export abstract class BaseConstruct extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    cdk.Tag.add(this, 'mu:vendor', 'Stelligent');
    cdk.Tag.add(this, 'mu:version', pjson.version);
  }
}
