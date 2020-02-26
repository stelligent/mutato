import Mu = require('../lib/mu-stack');
import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import { MuFileSystem, MuMountTarget } from '../lib/storage';

describe('EFS Module Tests', function() {
  describe('EFS Simple Configuration', () => {
    it('should create EFS FileSystem with default values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'FileSystemTestStack');
      const vpc = new Vpc(stack, 'MyVpc');

      const subnetIds: string[] = [];
      vpc.privateSubnets.forEach((subnet, index) => {
        subnetIds.push(subnet.subnetId);
      });
      const mysg = new SecurityGroup(stack, 'MySG', { vpc });

      const myfs = new MuFileSystem(stack, 'MyFileSystem');

      new MuMountTarget(stack, 'MyMount', {
        fileSystemId: myfs.file_system.ref,
        securityGroups: [mysg.securityGroupId],
        subnetId: subnetIds[0]
      });

      expectCDK(stack).to(
        haveResource('AWS::EFS::FileSystem', {
          Encrypted: true,
          PerformanceMode: 'generalPurpose',
          ThroughputMode: 'bursting'
        })
      );
      expectCDK(stack).to(
        haveResource('AWS::EFS::MountTarget', {
          FileSystemId: {
            Ref: 'MyFileSystemF2621297'
          },
          SubnetId: {
            Ref: 'MyVpcPrivateSubnet1Subnet5057CF7E'
          }
        })
      );
    });
  });
});
