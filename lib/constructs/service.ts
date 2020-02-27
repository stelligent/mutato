import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsPatters from '@aws-cdk/aws-ecs-patterns';
import * as cdk from '@aws-cdk/core';
import * as assert from 'assert';
import * as debug from 'debug';
import * as _ from 'lodash';
import { container } from './container';
import { BaseConstruct } from './interfaces';
import { network } from './network';

enum ServiceProvider {
  FARGATE = 'fargate',
  CLASSIC = 'classic'
}

interface ServiceProps {
  provider?: ServiceProvider;
  container: container;
  network: network;
  config?:
    | ecsPatters.ApplicationLoadBalancedEc2ServiceProps
    | ecsPatters.ApplicationLoadBalancedFargateServiceProps;
}

/** */
class Service extends BaseConstruct {
  public readonly props: ServiceProps;
  private readonly log: debug.Debugger;

  /** @hideconstructor */
  constructor(scope: cdk.Construct, id: string, props: ServiceProps) {
    super(scope, id);

    this.log = debug(`mu:constructs:container:${id}`);
    this.props = _.defaults(props, {
      provider: ServiceProvider.FARGATE
    });

    this.log('creating a service construct with props: %o', this.props);
    assert.ok(_.isString(this.props.provider));
    assert.ok(_.isObject(this.props.container));
    assert.ok(_.isObject(this.props.network));

    if (this.props.provider === ServiceProvider.FARGATE) {
      new ecsPatters.ApplicationLoadBalancedFargateService(this, `App${id}`, {
        cluster: this.props.network.cluster,
        vpc: this.props.network.vpc,
        taskImageOptions: {
          image: this.props.container.repo
            ? ecs.ContainerImage.fromEcrRepository(this.props.container.repo)
            : ecs.ContainerImage.fromRegistry(this.props.container.imageUri)
        },
        ...this.props.config
      });
    } else {
      new ecsPatters.ApplicationLoadBalancedEc2Service(this, `App${id}`, {
        cluster: this.props.network.cluster,
        vpc: this.props.network.vpc,
        taskImageOptions: {
          image: this.props.container.repo
            ? ecs.ContainerImage.fromEcrRepository(this.props.container.repo)
            : ecs.ContainerImage.fromRegistry(this.props.container.imageUri)
        },
        ...this.props.config
      });
    }
  }
}

export { Service as service };
