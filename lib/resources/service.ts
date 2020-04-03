import * as ecs from '@aws-cdk/aws-ecs';
import * as sqs from '@aws-cdk/aws-sqs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as appAutoScaling from '@aws-cdk/aws-applicationautoscaling';
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { Container } from './container';
import { Network } from './network';
import { Storage } from './storage';

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
  storage?: Storage;
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

    this._debug = debug(`mutato:constructs:service:${id}`);
    this.props = _.defaults(props, {
      provider: ServiceProvider.Fargate,
      rate: 'rate(1 day)',
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
            cluster: this.props.network.cluster,
            taskImageOptions: {
              image: ecs.ContainerImage.fromRegistry(imageUri),
            },
            ...(this.props
              .config as ecsPatterns.ApplicationLoadBalancedFargateServiceProps),
          },
        );
        break;
      case ServiceProvider.Classic:
        this.resource = new ecsPatterns.ApplicationLoadBalancedEc2Service(
          this,
          `Classic`,
          {
            cluster: this.props.network.cluster,
            taskImageOptions: {
              image: ecs.ContainerImage.fromRegistry(imageUri),
            },
            ...(this.props
              .config as ecsPatterns.ApplicationLoadBalancedEc2ServiceProps),
          },
        );
        break;
      case ServiceProvider.FargateTask:
        assert.ok(this.props.rate, 'CloudWatch rate expression must be set');
        this.resource = new ecsPatterns.ScheduledFargateTask(
          this,
          `FargateTask`,
          {
            cluster: this.props.network.cluster,
            scheduledFargateTaskImageOptions: {
              image: ecs.ContainerImage.fromRegistry(imageUri),
            },
            schedule: appAutoScaling.Schedule.expression(
              this.props.rate as string,
            ),
            ...(this.props.config as ecsPatterns.ScheduledFargateTaskProps),
          },
        );
        break;
      case ServiceProvider.ClassicTask:
        assert.ok(this.props.rate, 'CloudWatch rate expression must be set');
        this.resource = new ecsPatterns.ScheduledEc2Task(this, `ClassicTask`, {
          cluster: this.props.network.cluster,
          scheduledEc2TaskImageOptions: {
            image: ecs.ContainerImage.fromRegistry(imageUri),
          },
          schedule: appAutoScaling.Schedule.expression(
            this.props.rate as string,
          ),
          ...(this.props.config as ecsPatterns.ScheduledEc2TaskProps),
        });
        break;
      case ServiceProvider.FargateQueue:
        assert.ok(this.props.storage, 'storage must be set');
        assert.ok(this.props.storage?.resource, 'storage resource must be set');
        this.resource = new ecsPatterns.QueueProcessingFargateService(
          this,
          'FargateQueue',
          {
            image: ecs.ContainerImage.fromRegistry(imageUri),
            queue: this.props.storage?.resource as sqs.Queue,
            cluster: this.props.network.cluster,
            ...(this.props
              .config as ecsPatterns.QueueProcessingFargateServiceProps),
          },
        );
        break;
      case ServiceProvider.ClassicQueue:
        assert.ok(this.props.storage, 'storage must be set');
        assert.ok(this.props.storage?.resource, 'storage resource must be set');
        this.resource = new ecsPatterns.QueueProcessingEc2Service(
          this,
          'ClassicQueue',
          {
            image: ecs.ContainerImage.fromRegistry(imageUri),
            queue: this.props.storage?.resource as sqs.Queue,
            cluster: this.props.network.cluster,
            ...(this.props
              .config as ecsPatterns.QueueProcessingEc2ServiceProps),
          },
        );
        break;
      default:
        assert.fail('storage type not supported');
    }

    this.resource.taskDefinition.addToExecutionRolePolicy(ecrPullPolicy);
  }
}
