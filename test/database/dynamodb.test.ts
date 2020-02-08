// import * as chai from 'chai';
// import * as chaiAsPromised from 'chai-as-promised';
// import * as fsx from 'fs-extra';
// import * as _ from 'lodash';
import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as cdk from '@aws-cdk/core';
import { MuDynamoDB } from '../../lib/database/dynamodb';
import Mu = require('../../lib/mu-stack');
// describe('DynamoDB-Test', function() {
//   it('should create dynamodb stack', function() {
//     expect(SynthUtils.toCloudFormation(stack));
//   });
// });

describe('DynamoDB Module Tests', function () {
  describe.skip('DynamoDB Simple Configuration', () => {
    it('should create dynamodb stack', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'MyTestStack');
      new MuDynamoDB(stack, 'MuDyn');
      expectCDK(stack).to(haveResource('AWS::DynamoDB::Table'));
    });
  });

  describe('DynamoDB Custom Props', function () {
    it('should create dynamodb stack with custom parameters', function () {
      const myprops = {
        name: 'my_app',
        tableName: 'mytable',
        readCapacity: 10,
        writeCapacity: 10,
        billingMode: dynamodb.BillingMode.PROVISIONED,
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
