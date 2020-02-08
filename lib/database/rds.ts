// import * as ec2 from '@aws-cdk/aws-ec2';
// import * as rds from '@aws-cdk/aws-rds';
// import { Construct } from '@aws-cdk/core';
// import { BaseConstruct } from '../base-construct';

// export interface RDS extends BaseConstruct {
//   readonly name?: string;
//   readonly vpc: IVpc;
// }

// export class MuRDS extends Construct {
//   constructor(scope: Construct, id: string, props: RDS) {
//     super(scope, id);

//     const instance = new rds.DatabaseInstance(this, 'Instance', {
//       engine: rds.DatabaseInstanceEngine.ORACLE_SE1,
//       instanceClass: ec2.InstanceType.of(
//         ec2.InstanceClass.BURSTABLE2,
//         ec2.InstanceSize.SMALL
//       ),
//       masterUsername: 'syscdk',
//       vpc
//     });
//   }
// }
