import * as ddb from '@aws-cdk/aws-dynamodb';
import * as cdk from '@aws-cdk/core';
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';

enum DatabaseProvider {
  RDS = 'rds',
  RDSCLUSTER = 'rds-cluster',
  Dynamo = 'dynamo',
}

interface StorageProps {
  provider?: DatabaseProvider;
  config?: ddb.TableProps;
}

/** Database provider for service constructs */
export class Database extends cdk.Construct {
  public readonly props: StorageProps;
  public readonly dynamo: ddb.Table;
  private readonly _debug: debug.Debugger;

  /**
   * @hideconstructor
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: cdk.Construct, id: string, props: StorageProps) {
    super(scope, id);

    this._debug = debug(`mu:constructs:storage:${id}`);
    this.props = _.defaults(props, {
      provider: DatabaseProvider.Dynamo,
    });

    this._debug('creating storage with props: %o', this.props);
    switch (this.props.provider) {
      case DatabaseProvider.Dynamo:
        this.dynamo = new ddb.Table(this, 'Table', {
          billingMode: ddb.BillingMode.PAY_PER_REQUEST,
          partitionKey: { name: 'id', type: ddb.AttributeType.STRING },
          ...this.props.config,
        });
        break;
      default:
        assert.fail('storage type not supported');
    }
  }
}
