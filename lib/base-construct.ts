import * as cdk from '@aws-cdk/core';
import * as pjson from '../package.json';

/**
 * @class BaseConstruct - used for all other constructs
 */
export abstract class BaseConstruct extends cdk.Construct {
  /**
   * Create a new Base construct
   *
   * @param scope
   * @param id
   */
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    cdk.Tag.add(this, 'mu:vendor', 'Stelligent');
    cdk.Tag.add(this, 'mu:version', pjson.version);
  }
}
