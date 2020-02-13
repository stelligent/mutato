import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as cdk from '@aws-cdk/core';
import * as debug from 'debug';
import { BaseConstruct, IInfraConstruct } from './interfaces';

interface NetworkConfiguration {
  vpc?: ec2.VpcProps;
  cluster?: ecs.ClusterProps;
}

/** Base infra construct interface */
class Network extends BaseConstruct implements IInfraConstruct {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;
  private readonly log: debug.Debugger;

  /**
   * @hideconstructor
   * @param {cdk.Construct} scope CDK scope
   * @param {string} id construct ID
   * @param {NetworkConfiguration} props construct options
   */
  constructor(
    scope: cdk.Construct,
    id: string,
    props: NetworkConfiguration = {}
  ) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'VPC', props.vpc);
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: this.vpc,
      ...props.cluster
    });

    this.log = debug(`mu:Network:${id}`);
    this.log('construct initialized');
  }
}

export { Network as network };
