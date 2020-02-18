import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { Vpc } from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import { RemovalPolicy } from '@aws-cdk/core';
import { Database, DatabaseProps } from '../../lib/database/database';
import { MuDynamoDBProps } from '../../lib/database/dynamodb';
import Mu = require('../../lib/mu-stack');

describe('Database Module Tests', function() {
  describe('Database Instance Tests', () => {
    it('should create database stack with DynamoDB', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'TestDatabaseStack');
      const vpc = new Vpc(stack, 'DatabaseVPC');
      const database_name = 'MyDynamoDB';

      const props: MuDynamoDBProps = {
        tableName: 'mytable',
        readCapacity: 10,
        writeCapacity: 10,
        billingMode: dynamodb.BillingMode.PROVISIONED
      };

      const user_props: object = {
        removalPolicy: RemovalPolicy.DESTROY
      };

      const combined = { ...props, ...user_props };

      const database_props: DatabaseProps = {
        alias: 'dynamodb',
        // provider: MuDynamoDB,
        config: combined
      };

      new Database(stack, database_name, database_props);

      expectCDK(stack).to(
        haveResource('AWS::DynamoDB::Table', {
          TableName: props.tableName,
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH'
            }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: props.readCapacity,
            WriteCapacityUnits: props.writeCapacity
          }
        })
      );
    });
  });
});
