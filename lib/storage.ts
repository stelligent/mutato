import { CfnFileSystem, CfnMountTarget } from '@aws-cdk/aws-efs';
import { Construct } from '@aws-cdk/core';
import { BaseConstruct } from './base-construct';

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
export class MuFileSystem extends BaseConstruct {
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
  readonly fileSystemId: string;
  readonly securityGroups: Array<string>;
  readonly subnetId: string;
  readonly ipAddress?: string;
}

/**
 *
 */
export class MuMountTarget extends BaseConstruct {
  public readonly props: MuMountTargetProps;
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

    const combined = { ...user_props, ...props };

    new CfnMountTarget(this, id, combined);
  }
}
