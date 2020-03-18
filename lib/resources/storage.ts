import * as ec2 from '@aws-cdk/aws-ec2';
import { SecurityGroup } from '@aws-cdk/aws-ec2';
import { CfnFileSystem, CfnMountTarget } from '@aws-cdk/aws-efs';
import * as cdk from '@aws-cdk/core';
import { Construct } from '@aws-cdk/core';

/**
 *
 */
export interface MuFileSystemProps {
  readonly encrypted?: boolean;
  readonly performanceMode?: string;
  readonly provisionedThroughputInMibps?: number;
  readonly throughputMode?: string;
}

/**
 *
 */
export class MuFileSystem extends cdk.Construct {
  public readonly file_system: CfnFileSystem;
  public readonly props: MuFileSystemProps;
  /**
   * @param scope
   * @param id {string}
   * @param props {Object}
   * @param user_props {object} User passes optional properties.
   */
  constructor(
    scope: Construct,
    id: string,
    props: MuFileSystemProps = {},
    user_props?: object
  ) {
    super(scope, id);

    const defaults = {
      encrypted: true,
      performanceMode: 'generalPurpose',
      throughputMode: 'bursting'
    };
    const combined = { ...defaults, ...user_props, ...props };

    this.file_system = new CfnFileSystem(this, id, combined);
  }
}

/**
 * Includes all fields for CfnMountTarget
 */
export interface MuMountTargetProps {
  readonly vpc: ec2.Vpc;
  readonly fileSystemId: string;
  readonly securityGroups?: Array<string>;
  readonly subnetId?: string;
  readonly ipAddress?: string;
}

/**
 *
 */
export class MuMountTarget extends cdk.Construct {
  public readonly props: MuMountTargetProps;
  public readonly efs_mount: CfnMountTarget;
  /**
   * @param scope
   * @param id {string}
   * @param props {Object}
   * @param user_props {object} User passes optional properties.
   */
  constructor(
    scope: Construct,
    id: string,
    props: MuMountTargetProps,
    user_props?: object
  ) {
    super(scope, id);

    this.props = props;

    const subnetIds: string[] = [];
    this.props.vpc.privateSubnets.forEach((subnet, index) => {
      subnetIds.push(subnet.subnetId);
    });

    const mount_sg = new SecurityGroup(this, 'MountTargetSG', {
      vpc: this.props.vpc
    });

    mount_sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(2049));

    const combined = {
      securityGroups: [mount_sg.securityGroupId],
      subnetId: subnetIds[0],
      ...user_props,
      ...props
    };

    this.efs_mount = new CfnMountTarget(this, id, combined);
  }
}

export interface MuMountEFSProps {
  readonly ec2_instance: ec2.Instance;
  readonly mount_target: MuMountTarget;
}

/**
 *
 */
export class MuMountEFS extends cdk.Construct {
  public readonly props: MuMountEFSProps;
  /**
   * @param scope
   * @param id {string}
   * @param props {Object}
   * @param user_props {object} User passes optional properties.
   */
  constructor(scope: Construct, id: string, props: MuMountEFSProps) {
    super(scope, id);

    const user_data = `
    sudo yum install -y amazon-efs-utils

    export file_system_id_01=${props.mount_target.efs_mount.fileSystemId}
    export efs_directory=/mnt/efs
    sudo mkdir -p \${efs_directory}
    sudo sed -i "$ a \${file_system_id_01}:/ \${efs_directory} efs tls,_netdev" /etc/fstab
    sudo mount -a -t efs defaults
    `;

    props.ec2_instance.addUserData(user_data);
  }
}
