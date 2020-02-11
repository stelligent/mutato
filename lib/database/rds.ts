import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import { Construct } from '@aws-cdk/core';

/**
 * MuRDSInstance is a RDS Database Instance with sensible defaults.
 */
export class MuRDSInstance extends Construct {
  public instance = rds.DatabaseInstance;
  /**
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props: rds.DatabaseInstanceProps) {
    super(scope, id);

    const defaults = {
      engine: rds.DatabaseInstanceEngine.MYSQL,
      instanceClass: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.SMALL
      ),
      masterUsername: 'syscdk',
      vpc: props.vpc
    };

    const combined = { ...defaults, ...props };

    new rds.DatabaseInstance(this, id, combined);
  }
}

// export interface MuRDSClusterProps extends rds.DatabaseClusterProps {
//   readonly myvpc: ec2.Vpc;
// }

/**
 * MuRDSCluster is a RDS Database Cluster with sensible defaults.
 */
export class MuRDSCluster extends Construct {
  public instance = rds.DatabaseCluster;
  /**
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props: rds.DatabaseClusterProps) {
    super(scope, id);

    const myvpc = new ec2.Vpc(this, 'ClusterVPC', {});

    const defaults = {
      engine: rds.DatabaseClusterEngine.AURORA,
      instanceProps: {
        instanceClass: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE2,
          ec2.InstanceSize.SMALL
        ),
        vpc: myvpc
      },
      masterUser: { username: 'syscdk' }
    };

    const combined = { ...defaults, ...props };

    new rds.DatabaseCluster(this, id, combined);
  }
}
