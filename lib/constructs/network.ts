import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import { IInfraConstruct } from './interfaces';

/** Base infra construct interface */
export abstract class Network extends IInfraConstruct {
  public readonly vpc: ec2.Vpc;

  /**
   * @hideconstructor
   * @param {cdk.Construct} scope CDK scope
   * @param {string} id construct ID
   */
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'VPC');
  }
}
