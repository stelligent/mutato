import Mu = require('../lib/mu-stack');
import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import { SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import {
  MuBucket,
  MuBucketPolicy,
  MuFileSystem,
  MuMountTarget
} from '../lib/storage';

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
    it('should create EFS FileSystem with custom values', () => {
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
        subnetId: subnetIds[0],
        ipAddress: '10.30.0.115'
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
          },
          IpAddress: '10.30.0.115'
        })
      );
    });
  });
});
describe('S3 Module Tests', function() {
  describe('S3 Simple Configuration', () => {
    it('should create s3 Bucket with default values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'S3TestStack');

      const bucket = new MuBucket(stack, 'MyBucket');

      new MuBucketPolicy(stack, 'MyMount', { bucket: bucket });

      expectCDK(stack).to(haveResource('AWS::S3::Bucket', {}));
      expectCDK(stack).to(haveResource('AWS::S3::BucketPolicy', {}));
    });
  });
});
