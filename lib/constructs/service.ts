import * as ecs from '@aws-cdk/aws-ecs';
import {
  ApplicationLoadBalancedEc2Service,
  ApplicationLoadBalancedEc2ServiceProps,
  ApplicationLoadBalancedFargateService,
  ApplicationLoadBalancedFargateServiceProps
} from '@aws-cdk/aws-ecs-patterns';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { Container } from './container';
import { Network } from './network';

enum ServiceProvider {
  FARGATE = 'fargate',
  CLASSIC = 'classic'
}

interface ServiceProps {
  provider?: ServiceProvider;
  container: Container;
  network: Network;
  config?:
    | ApplicationLoadBalancedEc2ServiceProps
    | ApplicationLoadBalancedFargateServiceProps;
}

/** ECS service construct */
export class Service extends cdk.Construct {
  public readonly props: ServiceProps;
  private readonly log: debug.Debugger;

  /** @hideconstructor */
  constructor(scope: cdk.Construct, id: string, props: ServiceProps) {
    super(scope, id);

    this.log = debug(`mu:constructs:service:${id}`);
    this.props = _.defaults(props, {
      provider: ServiceProvider.FARGATE
    });

    this.log('creating a service construct with props: %o', this.props);
    assert.ok(_.isString(this.props.provider));
    assert.ok(_.isObject(this.props.container));
    assert.ok(_.isObject(this.props.network));

    const imageUri = this.props.container.getImageUri(this);
    const ecrPullPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage'
      ],
      // TODO fix this and limit the scope
      resources: ['*']
    });

    if (this.props.provider === ServiceProvider.FARGATE) {
      const app = new ApplicationLoadBalancedFargateService(this, `App${id}`, {
        ...this.props.config,
        cluster: this.props.network.cluster,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry(imageUri)
        }
      });
      app.taskDefinition.addToExecutionRolePolicy(ecrPullPolicy);
    } else {
      const app = new ApplicationLoadBalancedEc2Service(this, `App${id}`, {
        ...this.props.config,
        cluster: this.props.network.cluster,
        taskImageOptions: {
          image: ecs.ContainerImage.fromRegistry(imageUri)
        }
      });
      app.taskDefinition.addToExecutionRolePolicy(ecrPullPolicy);
    }
  }
}
