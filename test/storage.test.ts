import Mu = require('../lib/mu-stack');
import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { Network } from '../lib/resources/network';
import { MuFileSystem, MuMountTarget } from '../lib/resources/storage';

describe('EFS Module Tests', function() {
  describe('EFS Simple Configuration', () => {
    it('should create EFS FileSystem with default values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'FileSystemTestStack');
      const my_network = new Network(stack, 'EFSVPC');

      const myfs = new MuFileSystem(stack, 'MyFileSystem');

      new MuMountTarget(stack, 'MyMount', {
        vpc: my_network.vpc,
        fileSystemId: myfs.file_system.ref
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
    // it('should create EFS FileSystem with custom values', () => {
    //   const app = new cdk.App();
    //   const stack = new Mu.MuStack(app, 'FileSystemTestStack');
    //   const my_network = new Network(stack, 'EFSVPC');
    //   const myfs = new MuFileSystem(stack, 'MyFileSystem');

    //   new MuMountTarget(stack, 'MyMount', {
    //     vpc: my_network.vpc,
    //     fileSystemId: myfs.file_system.ref,
    //     ipAddress: '10.30.0.115'
    //   });

    //   expectCDK(stack).to(
    //     haveResource('AWS::EFS::FileSystem', {
    //       Encrypted: true,
    //       PerformanceMode: 'generalPurpose',
    //       ThroughputMode: 'bursting'
    //     })
    //   );
    //   expectCDK(stack).to(
    //     haveResource('AWS::EFS::MountTarget', {
    //       FileSystemId: {
    //         Ref: 'MyFileSystemF2621297'
    //       },
    //       SubnetId: {
    //         Ref: 'MyVpcPrivateSubnet1Subnet5057CF7E'
    //       },
    //       IpAddress: '10.30.0.115'
    //     })
    //   );
    // });
  });
});
