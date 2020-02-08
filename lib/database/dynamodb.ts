import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { TableProps } from '@aws-cdk/aws-dynamodb';
import { Construct } from '@aws-cdk/core';
import { BaseConstruct } from '../base-construct';

export interface MuDynamoDBProps {
  readonly name?: string;
  readonly tableName?: string;
  readonly tableProps?: TableProps;
  readonly readCapacity?: number;
  readonly writeCapacity?: number;
  // readonly tableKeys?: Array<Object>;
}

/**
 *
 */
export class MuDynamoDB extends BaseConstruct {
  public table: dynamodb.Table;
  /**
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props: MuDynamoDBProps = {}) {
    super(scope, id);

    this.table = new dynamodb.Table(scope, 'WAT', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      readCapacity: 500,
      writeCapacity: 50
    });
  }
}
