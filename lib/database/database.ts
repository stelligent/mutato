import * as cdk from '@aws-cdk/core';
import { BaseConstruct } from '../base-construct';
import { MuDynamoDB, MuDynamoDBProps } from './dynamodb';
import {
  MuRDSCluster,
  MuRDSClusterProps,
  MuRDSInstance,
  MuRDSInstanceProps,
  MuRDSServerless,
  MuRDSServerlessProps
} from './rds';

export interface DatabaseProps {
  readonly alias: string;
  // readonly provider:
  //   | MuDynamoDB
  //   | MuRDSInstance
  //   | MuRDSCluster
  //   | MuRDSServerless;
  readonly config:
    | MuDynamoDBProps
    | MuRDSInstanceProps
    | MuRDSClusterProps
    | MuRDSServerlessProps;
  readonly user_props?: object;
}
/**
 * @class DatabaseConstruct - used for all database constructs
 */
/* eslint-disable jsdoc/require-jsdoc  */
export class Database extends BaseConstruct {
  constructor(
    scope: cdk.Construct,
    id: string,
    props: DatabaseProps,
    user_props: object = {}
  ) {
    /**
     *
     * @param scope
     * @param id
     * @param props
     *
     */
    super(scope, id);

    const config: object = props.config;

    if (props.alias === 'dynamodb') {
      new MuDynamoDB(this, id, config as MuDynamoDBProps, user_props);
    }
    if (props.alias === 'rds-instance') {
      new MuRDSInstance(this, id, config as MuRDSInstanceProps, user_props);
    }
    if (props.alias === 'rds-cluster') {
      new MuRDSCluster(this, id, config as MuRDSClusterProps, user_props);
    }
    if (props.alias === 'rds-serverless') {
      new MuRDSServerless(this, id, config as MuRDSServerlessProps, user_props);
    }
  }
}
