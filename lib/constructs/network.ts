import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import * as debug from 'debug';
import { BaseConstruct, IInfraConstruct } from './interfaces';

/** Base infra construct interface */
export class Network extends BaseConstruct implements IInfraConstruct {
  public readonly vpc: ec2.Vpc;
  private readonly log: debug.Debugger;

  /**
   * @hideconstructor
   * @param {cdk.Construct} scope CDK scope
   * @param {string} id construct ID
   */
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'VPC');
    this.log = debug(`mu:Network:${id}`);

    this.log('construct initialized');
  }
}
