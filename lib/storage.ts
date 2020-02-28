import { CfnFileSystem, CfnMountTarget } from '@aws-cdk/aws-efs';
import * as s3 from '@aws-cdk/aws-s3';
import { Bucket, BucketPolicy, IBucket } from '@aws-cdk/aws-s3';
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

/**
 *
 */
export interface MuBucketProps {
  readonly bucketName?: string;
}
/**
 *
 */
export class MuBucket extends BaseConstruct {
  public readonly props: MuBucketProps;
  /**
   * @param scope
   * @param id {string}
   * @param props {Object}
   * @param user_props {object} User passes optional properties.
   */
  constructor(
    scope: Construct,
    id: string,
    props: MuBucketProps = {},
    user_props?: object
  ) {
    super(scope, id);

    const defaults = { encrypted: s3.BucketEncryption.S3_MANAGED };

    const combined = { ...defaults, ...user_props, ...props };

    const bucket = new Bucket(this, id, combined);
    new BucketPolicy(this, id, { bucket });
  }
}

export interface MuBucketPolicyProps {
  readonly bucket: IBucket;
}
/**
 *
 */
export class MuBucketPolicy extends BaseConstruct {
  public readonly props: MuBucketPolicyProps;
  /**
   * @param scope
   * @param id {string}
   * @param props {Object}
   * @param user_props {object} User passes optional properties.
   */
  constructor(
    scope: Construct,
    id: string,
    props: MuBucketPolicyProps,
    user_props?: object
  ) {
    super(scope, id);

    const defaults = {};

    const combined = { ...defaults, ...user_props, ...props };

    new BucketPolicy(this, id, combined);
  }
}
