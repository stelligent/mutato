import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Vpc
} from '@aws-cdk/aws-ec2';
import {
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseInstance,
  DatabaseInstanceEngine,
  InstanceProps,
  Login
} from '@aws-cdk/aws-rds';
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
  public instance = DatabaseInstance;

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
  public instance = DatabaseCluster;
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
