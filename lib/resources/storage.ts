import * as s3 from '@aws-cdk/aws-s3';
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';

enum StorageProvider {
  S3 = 's3',
  SQS = 'sqs',
}

interface StorageProps {
  provider?: StorageProvider;
  config?: s3.BucketProps | sqs.QueueProps;
}

/** Storage provider for service constructs */
export class Storage extends cdk.Construct {
  public readonly props: StorageProps;
  public readonly resource: s3.Bucket | sqs.Queue;
  private readonly _debug: debug.Debugger;

  /**
   * @hideconstructor
   * @param scope CDK construct scope
   * @param id CDK construct ID
   * @param props storage configuration
   */
  constructor(scope: cdk.Construct, id: string, props: StorageProps) {
    super(scope, id);

    this._debug = debug(`mu:constructs:storage:${id}`);
    this.props = _.defaults(props, {
      provider: StorageProvider.S3,
    });

    this._debug('creating storage with props: %o', this.props);
    switch (this.props.provider) {
      case StorageProvider.S3:
        this.resource = new s3.Bucket(this, 'Bucket', {
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          encryption: s3.BucketEncryption.S3_MANAGED,
          ...(this.props.config as s3.BucketProps),
        });
        break;
      case StorageProvider.SQS:
        this.resource = new sqs.Queue(this, 'Queue', {
          encryption: sqs.QueueEncryption.KMS_MANAGED,
          ...(this.props.config as sqs.QueueProps),
        });
        break;
      default:
        assert.fail('storage type not supported');
    }
  }
}
