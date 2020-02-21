import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as cdk from '@aws-cdk/core';
import * as debug from 'debug';
import * as _ from 'lodash';
import { BaseConstruct } from './interfaces';

interface NetworkProps {
  vpc?: ec2.VpcProps;
  cluster?: ecs.ClusterProps;
}

/** Base infra construct interface */
class Network extends BaseConstruct {
  private readonly props: NetworkProps;
  private readonly log: debug.Debugger;
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;

  /** @hideconstructor */
  constructor(scope: cdk.Construct, id: string, props?: NetworkProps) {
    super(scope, id);

    this.log = debug(`mu:Network:${id}`);
    this.props = _.defaults(props, {});
    this.log('creating a network construct with props: %o', this.props);

    this.vpc = new ec2.Vpc(this, 'VPC', this.props.vpc);
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: this.vpc,
      ...this.props.cluster
    });
  }
}

export { Network as network };
