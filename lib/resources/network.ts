import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as cdk from '@aws-cdk/core';
import debug from 'debug';
import _ from 'lodash';

interface NetworkProps {
  vpc?: ec2.VpcProps;
  cluster?: ecs.ClusterProps;
}

/** ECS Cluster and VPC */
export class Network extends cdk.Construct {
  private readonly _props: NetworkProps;
  private readonly _debug: debug.IDebugger;
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;

  /**
   * @hideconstructor
   * @param scope CDK scope
   * @param id CDK construct id
   * @param props CDK construct parameters
   */
  constructor(scope: cdk.Construct, id: string, props?: NetworkProps) {
    super(scope, id);

    this._debug = debug(`mutato:constructs:Network:${id}`);
    this._props = _.defaults(props, {});

    this._debug('creating a network construct with props: %o', this._props);
    this.vpc = new ec2.Vpc(this, 'VPC', this._props.vpc);
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      ...this._props.cluster,
      vpc: this.vpc,
    });
  }
}
