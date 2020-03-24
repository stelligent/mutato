import * as ecs from '@aws-cdk/aws-ecs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { Container } from './container';
import { Network } from './network';

enum ServiceProvider {
  Fargate = 'fargate',
  Classic = 'classic',
  FargateTask = 'fargate-task',
  ClassicTask = 'classic-task',
  FargateQueue = 'fargate-queue',
  ClassicQueue = 'classic-queue',
}

interface ServiceProps {
  provider?: ServiceProvider;
  container: Container;
  network: Network;
  rate?: string;
  config?:
    | ecsPatterns.ScheduledEc2TaskProps
    | ecsPatterns.ScheduledFargateTaskProps
    | ecsPatterns.QueueProcessingEc2ServiceProps
    | ecsPatterns.QueueProcessingFargateServiceProps
    | ecsPatterns.ApplicationLoadBalancedEc2ServiceProps
    | ecsPatterns.ApplicationLoadBalancedFargateServiceProps;
}

/** ECS service construct */
export class Service extends cdk.Construct {
  public readonly props: ServiceProps;
  public readonly resource:
    | ecsPatterns.ScheduledEc2Task
    | ecsPatterns.ScheduledFargateTask
    | ecsPatterns.QueueProcessingEc2Service
    | ecsPatterns.QueueProcessingFargateService
    | ecsPatterns.ApplicationLoadBalancedFargateService
    | ecsPatterns.ApplicationLoadBalancedEc2Service;
  private readonly _debug: debug.Debugger;

  /**
   * @hideconstructor
   * @param scope CDK construct scope
   * @param id CDK construct ID
   * @param props service configuration
   */
  constructor(scope: cdk.Construct, id: string, props: ServiceProps) {
    super(scope, id);

    this._debug = debug(`mu:constructs:service:${id}`);
    this.props = _.defaults(props, {
      provider: ServiceProvider.Fargate,
    });

    this._debug('creating a service construct with props: %o', this.props);
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
        'ecr:BatchGetImage',
      ],
      // TODO fix this and limit the scope
      resources: ['*'],
    });

    switch (this.props.provider) {
      case ServiceProvider.Fargate:
        this.resource = new ecsPatterns.ApplicationLoadBalancedFargateService(
          this,
          `Fargate`,
          {
            ...(this.props
              .config as ecsPatterns.ApplicationLoadBalancedFargateServiceProps),
            cluster: this.props.network.cluster,
            taskImageOptions: {
              image: ecs.ContainerImage.fromRegistry(imageUri),
            },
          },
        );
        break;
      case ServiceProvider.Classic:
        this.resource = new ecsPatterns.ApplicationLoadBalancedEc2Service(
          this,
          `Classic`,
          {
            ...(this.props
              .config as ecsPatterns.ApplicationLoadBalancedEc2ServiceProps),
            cluster: this.props.network.cluster,
            taskImageOptions: {
              image: ecs.ContainerImage.fromRegistry(imageUri),
            },
          },
        );
        break;
      case ServiceProvider.FargateTask:
        break;
      case ServiceProvider.ClassicTask:
        break;
      case ServiceProvider.ClassicTask:
        break;
      case ServiceProvider.ClassicQueue:
        break;
      default:
        assert.fail('storage type not supported');
    }

    this.resource.taskDefinition.addToExecutionRolePolicy(ecrPullPolicy);
  }
}
