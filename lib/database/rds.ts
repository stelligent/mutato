import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  SubnetType,
  Vpc
} from '@aws-cdk/aws-ec2';
import {
  CfnDBCluster,
  CfnDBSubnetGroup,
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseInstance,
  DatabaseInstanceEngine,
  DatabaseSecret,
  InstanceProps,
  Login
} from '@aws-cdk/aws-rds';
import { CfnSecretTargetAttachment } from '@aws-cdk/aws-secretsmanager';
import { Construct } from '@aws-cdk/core';

export interface MuRDSInstanceProps {
  readonly engine: DatabaseInstanceEngine;
  readonly instanceClass: InstanceType;
  readonly masterUsername: string;
  readonly vpc: Vpc;
}

/**
 * MuRDSInstance is a RDS Database Instance with sensible defaults.
 */
export class MuRDSInstance extends Construct {
  /**
   * @param scope
   * @param id
   * @param props
   * @param user_props User passes optional properties.
   */
  constructor(
    scope: Construct,
    id: string,
    props: MuRDSInstanceProps,
    user_props?: object
  ) {
    super(scope, id);

    const defaults = {
      engine: DatabaseInstanceEngine.MYSQL,
      instanceClass: InstanceType.of(
        InstanceClass.BURSTABLE2,
        InstanceSize.SMALL
      ),
      masterUsername: 'syscdk',
      vpc: props.vpc
    };

    const combined = { ...defaults, ...user_props, ...props };

    new DatabaseInstance(this, id, combined);
  }
}

export interface MuRDSClusterProps {
  readonly engine: DatabaseClusterEngine;
  readonly instanceProps: InstanceProps;
  readonly masterUser: Login;
}

/**
 * MuRDSCluster is a RDS Database Cluster with sensible defaults.
 */
export class MuRDSCluster extends Construct {
  /**
   * @param scope
   * @param id
   * @param props
   * @param user_props User passes optional properties.
   */
  constructor(
    scope: Construct,
    id: string,
    props: MuRDSClusterProps,
    user_props?: object
  ) {
    super(scope, id);

    const myvpc = new Vpc(this, 'ClusterVPC', {});

    const defaults = {
      engine: DatabaseClusterEngine.AURORA,
      instanceProps: {
        instanceClass: InstanceType.of(
          InstanceClass.BURSTABLE2,
          InstanceSize.SMALL
        ),
        vpc: myvpc
      },
      masterUser: { username: 'syscdk' }
    };

    const combined = { ...defaults, ...user_props, ...props };

    new DatabaseCluster(this, id, combined);
  }
}

export interface MuRDSServerlessProps {
  readonly engine: string;
}

/**
 * MuRDSServerless is a RDS Serverless Cluster with sensible defaults.
 */
export class MuRDSServerless extends Construct {
  /**
   * @param scope
   * @param id
   * @param props
   * @param user_props User passes optional properties.
   */
  constructor(
    scope: Construct,
    id: string,
    props: MuRDSServerlessProps,
    user_props?: object
  ) {
    super(scope, id);

    const vpc = new Vpc(this, 'ServerlessVPC', {
      subnetConfiguration: [
        { name: 'aurora_private_', subnetType: SubnetType.PRIVATE }
      ]
    });

    // Requires a VPC
    // Would fail if there isn't private subnets
    const subnetIds: string[] = [];
    vpc.privateSubnets.forEach((subnet, index) => {
      subnetIds.push(subnet.subnetId);
    });

    // Would fail due to missing subnetIds if there isn't subnets
    const dbSubnetGroup: CfnDBSubnetGroup = new CfnDBSubnetGroup(
      this,
      'AuroraSubnetGroup',
      {
        dbSubnetGroupDescription: 'Subnet group to access aurora',
        dbSubnetGroupName: 'aurora-serverless-subnet',
        subnetIds
      }
    );

    // Creates a database username and password in Secrets Manager.
    const secret = new DatabaseSecret(this, 'MuServerless', {
      username: 'syscdk'
    });

    const defaults = {
      dbClusterIdentifier: 'aurora-serverless',
      engine: 'aurora',
      engineMode: 'serverless',
      masterUsername: secret.secretValueFromJson('username').toString(),
      masterUserPassword: secret.secretValueFromJson('password').toString(),
      dbSubnetGroupName: dbSubnetGroup.dbSubnetGroupName, // Would fail due missing values in this param
      scalingConfiguration: {
        autoPause: true,
        maxCapacity: 4,
        minCapacity: 2,
        secondsUntilAutoPause: 3600
      }
    };

    const combined = { ...defaults, ...user_props, ...props };

    const aurora = new CfnDBCluster(this, id, combined);

    /**  The attachment adds additional information to the Secret
     *    such as dbname, engine, host, and port.
     */
    new CfnSecretTargetAttachment(this, 'AttachSecret', {
      targetType: 'AWS::RDS::DBCluster',
      secretId: secret.secretArn,
      targetId: aurora.ref
    });

    //wait for subnet group to be created
    aurora.addDependsOn(dbSubnetGroup);
  }
}
