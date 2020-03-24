import * as ddb from '@aws-cdk/aws-dynamodb';
import * as rds from '@aws-cdk/aws-rds';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { Network } from './network';

enum DatabaseProvider {
  RDS = 'rds',
  RDSCluster = 'rds-cluster',
  Dynamo = 'dynamo',
}

interface DatabaseProps {
  provider?: DatabaseProvider;
  config?:
    | ddb.TableProps
    | rds.DatabaseClusterProps
    | rds.DatabaseInstanceProps;
  network: Network;
}

/** Database provider for service constructs */
export class Database extends cdk.Construct {
  public readonly props: DatabaseProps;
  public readonly resource:
    | ddb.Table
    | rds.DatabaseInstance
    | rds.DatabaseCluster;
  private readonly _debug: debug.Debugger;

  /**
   * @hideconstructor
   * @param scope CDK construct scope
   * @param id CDK construct ID
   * @param props database configuration
   */
  constructor(scope: cdk.Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    this._debug = debug(`mu:constructs:database:${id}`);
    this.props = _.defaults(props, {
      provider: DatabaseProvider.Dynamo,
    });

    this._debug('creating storage with props: %o', this.props);
    switch (this.props.provider) {
      case DatabaseProvider.Dynamo:
        this.resource = new ddb.Table(this, 'Table', {
          billingMode: ddb.BillingMode.PAY_PER_REQUEST,
          partitionKey: { name: 'id', type: ddb.AttributeType.STRING },
          ...(this.props.config as ddb.TableProps),
        });
        break;
      case DatabaseProvider.RDS:
        this.resource = new rds.DatabaseInstance(this, 'Instance', {
          engine: rds.DatabaseInstanceEngine.AURORA,
          instanceClass: ec2.InstanceType.of(
            ec2.InstanceClass.BURSTABLE2,
            ec2.InstanceSize.SMALL,
          ),
          masterUsername: 'admin',
          ...(this.props.config as rds.DatabaseInstanceProps),
          vpc: this.props.network.vpc,
        });
        // todo: fix this wide network permission
        this.resource.connections.allowFromAnyIpv4(ec2.Port.allTraffic());
        break;
      case DatabaseProvider.RDSCluster:
        this.resource = new rds.DatabaseCluster(this, 'Cluster', {
          engine: rds.DatabaseClusterEngine.AURORA,
          masterUser: {
            username: 'admin',
          },
          instanceProps: {
            vpc: this.props.network.vpc,
            instanceType: ec2.InstanceType.of(
              ec2.InstanceClass.BURSTABLE2,
              ec2.InstanceSize.SMALL,
            ),
          },
          ...(this.props.config as rds.DatabaseClusterProps),
        });
        // todo: fix this wide network permission
        this.resource.connections.allowFromAnyIpv4(ec2.Port.allTraffic());
        break;
      default:
        assert.fail('storage type not supported');
    }
  }
}
