import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import * as cdk from '@aws-cdk/core';
import { MuRDSCluster, MuRDSInstance } from '../../lib/database/rds';
import Mu = require('../../lib/mu-stack');

describe('RDS Module Tests', function() {
  describe('RDS Instance Tests', () => {
    it('should create rds instance stack with default values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'MyTestRDSStack');
      const vpc = new ec2.Vpc(stack, 'RDSVPC');
      const table_name = 'MuRDS';
      const custom_props = {
        masterUsername: 'syscdk',
        engine: rds.DatabaseInstanceEngine.MYSQL,
        instanceClass: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE2,
          ec2.InstanceSize.SMALL
        ),
        vpc: vpc
      };
      new MuRDSInstance(stack, table_name, custom_props);
      expectCDK(stack).to(
        haveResource('AWS::RDS::DBInstance', {
          Engine: 'mysql',
          DBInstanceClass: 'db.t2.small'
        })
      );
    });
    it('should create rds instance stack with custom properties', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'TestRDS-Postgres-Stack');
      const vpc = new ec2.Vpc(stack, 'RDSVPC');
      const table_name = 'MuRDS';
      const custom_props = {
        masterUsername: 'syscdk',
        engine: rds.DatabaseInstanceEngine.POSTGRES,
        instanceClass: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE2,
          ec2.InstanceSize.SMALL
        ),
        vpc: vpc,
        autoMinorVersionUpgrade: false
      };
      new MuRDSInstance(stack, table_name, custom_props);
      expectCDK(stack).to(
        haveResource('AWS::RDS::DBInstance', {
          Engine: 'postgres',
          DBInstanceClass: 'db.t2.small',
          AutoMinorVersionUpgrade: false
        })
      );
    });
  });

  describe('RDS Cluster Tests', () => {
    it('should create rds cluster stack with default values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'TestRDS-Cluster-Stack');
      const vpc = new ec2.Vpc(stack, 'RDSClusterVPC');
      const table_name = 'MuRDS';

      const custom_props: rds.DatabaseClusterProps = {
        masterUser: { username: 'syscdk' },
        engine: rds.DatabaseClusterEngine.AURORA,
        instanceProps: {
          instanceType: ec2.InstanceType.of(
            ec2.InstanceClass.BURSTABLE2,
            ec2.InstanceSize.SMALL
          ),
          vpc: vpc
        }
      };

      new MuRDSCluster(stack, table_name, custom_props);

      expectCDK(stack).to(
        haveResource('AWS::RDS::DBCluster', {
          Engine: 'aurora'
        })
      );
    });
  });
});
