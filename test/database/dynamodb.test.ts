import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as cdk from '@aws-cdk/core';
import { MuDynamoDB } from '../../lib/database/dynamodb';
import Mu = require('../../lib/mu-stack');

describe('DynamoDB Module Tests', function() {
  describe('DynamoDB Simple Configuration', () => {
    it('should create dynamodb stack with default values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'MyTestStack');
      const table_name = 'MuDyn';
      new MuDynamoDB(stack, table_name);
      expectCDK(stack).to(
        haveResource('AWS::DynamoDB::Table', {
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH'
            }
          ],
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S'
            }
          ],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: table_name
        })
      );
    });
  });

  describe('DynamoDB Custom Props', function() {
    it('should create dynamodb stack with custom parameters', function() {
      const myprops = {
        name: 'my_app',
        tableName: 'mytable',
        readCapacity: 10,
        writeCapacity: 10,
        billingMode: dynamodb.BillingMode.PROVISIONED
      };
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'MyTestStack');
      new MuDynamoDB(stack, 'MuDyn', myprops);

      expectCDK(stack).to(
        haveResource('AWS::DynamoDB::Table', {
          TableName: myprops.tableName,
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH'
            }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: myprops.readCapacity,
            WriteCapacityUnits: myprops.writeCapacity
          }
        })
      );
    });
  });
});
