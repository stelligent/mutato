import * as ddb from '@aws-cdk/aws-dynamodb';
import * as rds from '@aws-cdk/aws-rds';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { Network } from './network';
import { Service } from './service';

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

    this._debug = debug(`mutato:constructs:database:${id}`);
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

  grantAccess(service: Service): void {
    assert.ok(service.resource, 'service resource does not exist');
    // this is a hack but it works, adds env vars to taskDefinition after synth
    const _addEnv = (key: string, val: string | number): void => {
      _.set(
        service.resource.taskDefinition,
        `defaultContainer.props.environment["${key}_${this.resource.node.id}"]`,
        val,
      );
    };
    switch (typeof this.resource) {
      case typeof ddb.Table:
        const dynamo = this.resource as ddb.Table;
        dynamo.grantFullAccess(service.resource.taskDefinition.taskRole);
        _addEnv(`DATABASE_TABLE_ARN`, dynamo.tableArn);
        _addEnv(`DATABASE_TABLE_NAME`, dynamo.tableName);
        break;
      case typeof rds.DatabaseInstance:
        const rdsi = this.resource as rds.DatabaseInstance;
        _addEnv(`DATABASE_ADDRESS`, rdsi.dbInstanceEndpointAddress);
        _addEnv(`DATABASE_PORT`, rdsi.dbInstanceEndpointPort);
        // TODO: add user/pass here
        break;
      case typeof rds.DatabaseCluster:
        const rdsc = this.resource as rds.DatabaseCluster;
        _addEnv(`DATABASE_ADDRESS`, rdsc.clusterEndpoint.hostname);
        _addEnv(`DATABASE_PORT`, rdsc.clusterEndpoint.port);
        // TODO: add user/pass here
        break;
      default:
        assert.fail('storage type not supported');
    }
  }
}
