import * as cdk from '@aws-cdk/core';

/**
 * @class MuStack - primary stack
 */
export class MuStack extends cdk.Stack {
  /**
   * Create a new stack
   *
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }
}
