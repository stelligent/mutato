import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Vpc
} from '@aws-cdk/aws-ec2';
import {
  DatabaseClusterEngine,
  DatabaseInstanceEngine
} from '@aws-cdk/aws-rds';
import * as cdk from '@aws-cdk/core';
import {
  MuRDSCluster,
  MuRDSClusterProps,
  MuRDSInstance,
  MuRDSInstanceProps,
  MuRDSServerless,
  MuRDSServerlessProps
} from '../../lib/database/rds';
import Mu = require('../../lib/mu-stack');

describe('RDS Module Tests', function() {
  describe('RDS Instance Tests', () => {
    it('should create stack with default values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'MyTestRDSStack');
      const vpc = new Vpc(stack, 'RDSVPC');
      const table_name = 'MuRDS';
      const custom_props: MuRDSInstanceProps = {
        masterUsername: 'syscdk',
        engine: DatabaseInstanceEngine.MYSQL,
        instanceClass: InstanceType.of(
          InstanceClass.BURSTABLE2,
          InstanceSize.SMALL
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
    it('should create stack with custom properties', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'TestRDS-Postgres-Stack');
      const vpc = new Vpc(stack, 'RDSVPC');
      const table_name = 'MuRDS';
      const custom_props: MuRDSInstanceProps = {
        masterUsername: 'syscdk',
        engine: DatabaseInstanceEngine.POSTGRES,
        instanceClass: InstanceType.of(
          InstanceClass.BURSTABLE2,
          InstanceSize.SMALL
        ),
        vpc: vpc
      };
      const customer_props = {
        autoMinorVersionUpgrade: false
      };
      new MuRDSInstance(stack, table_name, custom_props, customer_props);
      expectCDK(stack).to(
        haveResource('AWS::RDS::DBInstance', {
          Engine: 'postgres',
          DBInstanceClass: 'db.t2.small',
          AutoMinorVersionUpgrade: false
        })
      );
      expectCDK(stack).to(haveResource('AWS::EC2::VPC', {}));
    });
  });

  describe('RDS Cluster Tests', () => {
    it('should create stack with default values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'TestRDS-Cluster-Stack');
      const vpc = new Vpc(stack, 'RDSClusterVPC');
      const table_name = 'MuRDS';

      const custom_props: MuRDSClusterProps = {
        masterUser: { username: 'syscdk' },
        engine: DatabaseClusterEngine.AURORA,
        instanceProps: {
          instanceType: InstanceType.of(
            InstanceClass.BURSTABLE2,
            InstanceSize.SMALL
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
    it('should create stack with custom values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'TestRDS-Cluster-Stack');
      const vpc = new Vpc(stack, 'RDSClusterVPC');
      const table_name = 'MuRDS';

      const custom_props: MuRDSClusterProps = {
        masterUser: { username: 'syscdk' },
        engine: DatabaseClusterEngine.AURORA,
        instanceProps: {
          instanceType: InstanceType.of(
            InstanceClass.BURSTABLE2,
            InstanceSize.SMALL
          ),
          vpc: vpc
        }
      };
      const user_props = {
        port: 5700
      };

      new MuRDSCluster(stack, table_name, custom_props, user_props);

      expectCDK(stack).to(
        haveResource('AWS::RDS::DBCluster', {
          Engine: 'aurora',
          Port: 5700
        })
      );
    });
  });

  describe('RDS Serverless Tests', () => {
    it('should create serverless stack with default values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'TestRDS-Serverless-Stack');
      const vpc = new Vpc(stack, 'RDSServerlessVPC');
      const table_name = 'MuRDSServerless';

      const custom_props: MuRDSServerlessProps = {
        engine: 'aurora'
      };

      new MuRDSServerless(stack, table_name, custom_props);

      expectCDK(stack).to(
        haveResource('AWS::RDS::DBCluster', {
          Engine: 'aurora'
        })
      );
    });
    it('should create serverless stack with custom values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'TestRDS-Serverless-Stack');
      const vpc = new Vpc(stack, 'RDSServerlessVPC');
      const table_name = 'MuRDSServerless';

      const custom_props: MuRDSServerlessProps = {
        engine: 'aurora-postgresql'
      };

      const user_props = {
        dbClusterIdentifier: 'myMuServerlessCluster',
        engineMode: 'serverless',
        databaseName: 'myMuPostgres',
        scalingConfiguration: {
          autoPause: true,
          maxCapacity: 10,
          minCapacity: 2,
          secondsUntilAutoPause: 3600
        }
      };

      new MuRDSServerless(stack, table_name, custom_props, user_props);

      expectCDK(stack).to(
        haveResource('AWS::RDS::DBCluster', {
          DBClusterIdentifier: user_props.dbClusterIdentifier,
          EngineMode: user_props.engineMode,
          Engine: custom_props.engine,
          ScalingConfiguration: {
            AutoPause: true,
            MaxCapacity: 10,
            MinCapacity: 2,
            SecondsUntilAutoPause: 3600
          }
        })
      );
      expectCDK(stack).to(
        haveResource('AWS::SecretsManager::Secret', {
          GenerateSecretString: {
            ExcludeCharacters: '"@/\\',
            GenerateStringKey: 'password',
            PasswordLength: 30,
            SecretStringTemplate: '{"username":"syscdk"}'
          }
        })
      );
    });
  });
});
