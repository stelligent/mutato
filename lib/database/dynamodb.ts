import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { Construct } from '@aws-cdk/core';
import { BaseConstruct } from '../base-construct';

export interface MuDynamoDBProps {
  readonly tableName?: string;
  readonly readCapacity?: number;
  readonly writeCapacity?: number;
  readonly billingMode?: dynamodb.BillingMode;
}

/**
 * MuDynamoDB is a dynamo table with defaults that make sense
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

    const defaults = {
      tableName: id,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    }
    const combined = { ...defaults, ...props };
    // Could be handled better. At minimum, set a custom Error
    if (combined.readCapacity || combined.writeCapacity) {
      if (combined.billingMode == dynamodb.BillingMode.PAY_PER_REQUEST) {
        throw Error('You must set PROVISIONED billing mode when setting capacity')
      }
    }

    this.table = new dynamodb.Table(this, id, combined);
  }
}
