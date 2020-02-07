import * as cdk from '@aws-cdk/core';
import * as packageJson from '../../../package.json';

/**
 * Base class of all Mu managed constructs
 * It allows for async initialization of its CDK components
 */
export abstract class IBaseConstruct extends cdk.Construct {
  /**
   * @hideconstructor
   * @param {cdk.Construct} scope CDK scope
   * @param {string} id construct ID
   */
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    cdk.Tag.add(this, 'mu:vendor', 'stelligent');
    cdk.Tag.add(this, 'mu:version', packageJson.version);
  }

  /** subclasses can use this to perform async initialization */
  public abstract async initialize(): Promise<void>;
}
