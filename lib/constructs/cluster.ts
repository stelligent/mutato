import * as ecs from '@aws-cdk/aws-ecs';
import * as cdk from '@aws-cdk/core';
import * as debug from 'debug';
import { BaseConstruct, IInfraConstruct } from './interfaces';
import { Network } from './network';

export type ClusterConfiguration = {
  network: Network;
};

/** Base infra construct interface */
export class Cluster extends BaseConstruct implements IInfraConstruct {
  public readonly cluster: ecs.Cluster;
  private readonly log: debug.Debugger;

  /**
   * @hideconstructor
   * @param {cdk.Construct} scope CDK scope
   * @param {string} id construct ID
   * @param {ClusterConfiguration} config cluster config
   */
  constructor(scope: cdk.Construct, id: string, config: ClusterConfiguration) {
    super(scope, id);

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: config.network.vpc
    });
    this.log = debug(`mu:Cluster:${id}`);

    this.log('construct initialized');
  }
}
