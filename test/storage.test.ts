import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import { Network } from '../lib/resources/network';
import {
  MuFileSystem,
  MuMountEFS,
  MuMountTarget
} from '../lib/resources/storage';

describe('EFS Module Tests', function() {
  describe('EFS Simple Configuration', () => {
    it('should create EFS FileSystem with default values', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'FileSystemTestStack');
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
            Ref: 'EFSVPCPrivateSubnet1Subnet3F85AACC'
          }
        })
      );
    });
    it('should create EFS FileSystem with custom values', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'FileSystemTestStack');
      const my_network = new Network(stack, 'EFSVPC');
      const myfs = new MuFileSystem(stack, 'MyFileSystem');

      new MuMountTarget(stack, 'MyMount', {
        vpc: my_network.vpc,
        fileSystemId: myfs.file_system.ref,
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
            Ref: 'EFSVPCPrivateSubnet1Subnet3F85AACC'
          },
          IpAddress: '10.30.0.115'
        })
      );
    });
    it('should create EFS FileSystem and mount EFS on Bastion Host', () => {
      const app = new cdk.App();
      const stack = new cdk.Stack(app, 'FileSystemTestStack');
      const my_network = new Network(stack, 'EFSVPC');
      const myfs = new MuFileSystem(stack, 'MyFileSystem');

      const mountDrive = new MuMountTarget(stack, 'MyMount', {
        vpc: my_network.vpc,
        fileSystemId: myfs.file_system.ref
      });

      const bastion = new ec2.BastionHostLinux(stack, 'EFS-Bastion', {
        vpc: my_network.vpc
      });

      new MuMountEFS(stack, 'BastionDriveMount', {
        ec2_instance: bastion.instance,
        mount_target: mountDrive
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
            Ref: 'EFSVPCPrivateSubnet1Subnet3F85AACC'
          }
        })
      );
      expectCDK(stack).to(
        haveResource('AWS::EC2::Instance', {
          SubnetId: {
            Ref: 'EFSVPCPrivateSubnet1Subnet3F85AACC'
          },
          UserData: {
            'Fn::Base64': {
              'Fn::Join': [
                '',
                [
                  '#!/bin/bash\nyum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm\n\n    sudo yum install -y amazon-efs-utils\n\n    export file_system_id_01=',
                  {
                    Ref: 'MyFileSystemF2621297'
                  },
                  '\n    export efs_directory=/mnt/efs\n    sudo mkdir -p ${efs_directory}\n    sudo sed -i "$ a ${file_system_id_01}:/ ${efs_directory} efs tls,_netdev" /etc/fstab\n    sudo mount -a -t efs defaults\n    '
                ]
              ]
            }
          }
        })
      );
    });
  });
});
