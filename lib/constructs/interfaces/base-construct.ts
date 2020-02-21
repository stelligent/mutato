import * as cdk from '@aws-cdk/core';
import * as packageJson from '../../../package.json';

/**
 * This interface is not exported on purpose! users must use the abstract class
 * instead. The abstract class has a minimal default implementation.
 */
interface IBaseConstruct extends cdk.Construct {
  initialize(): Promise<IBaseConstruct>;
}

/**
 * Base class of all Mu managed constructs
 * It allows for async initialization of its CDK components
 */
export abstract class BaseConstruct extends cdk.Construct
  implements IBaseConstruct {
  /** @hideconstructor */
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    cdk.Tag.add(this, 'mu:vendor', 'stelligent');
    cdk.Tag.add(this, 'mu:version', packageJson.version);
  }

  /**
   * subclasses can use this to perform async initialization
   *
   * @returns nothingness. throws if unsuccessful
   */
  public async initialize(): Promise<BaseConstruct> {
    return Promise.resolve(this);
  }
}
