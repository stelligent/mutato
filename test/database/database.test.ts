import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import { Vpc } from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import { Database, DatabaseProps } from '../../lib/database/database';
import { MuDynamoDBProps } from '../../lib/database/dynamodb';
import { MuRDSServerlessProps } from '../../lib/database/rds';
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

      const user_props = {};

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

    it('should create serverless database stack ', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'TestServerlessDBStack');
      const vpc = new Vpc(stack, 'ServerlessDatabaseVPC');
      const database_name = 'MyServerlessDB';

      const props: MuRDSServerlessProps = {
        engine: 'aurora-mysql'
      };

      const user_props = {
        dbClusterIdentifier: 'MuAuroraMySQL',
        engineMode: 'serverless'
      };

      const combined = { ...props, ...user_props };

      const database_props: DatabaseProps = {
        alias: 'rds-serverless',
        config: combined
      };

      new Database(stack, database_name, database_props);

      expectCDK(stack).to(
        haveResource('AWS::RDS::DBCluster', {
          DBClusterIdentifier: user_props.dbClusterIdentifier,
          EngineMode: user_props.engineMode,
          Engine: props.engine
        })
      );
    });
  });
});
