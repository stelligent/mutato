import * as cdk from '@aws-cdk/core';
import { BaseConstruct } from './interfaces';

enum ContainerRegistry {
  ECR = 'ecr',
  HUB = 'hub'
}

interface ContainerProps {
  buildArgs?: { [key: string]: string };
  file?: string;
  context?: string;
  exclude?: string[];
  tags?: string[];
  registry?: ContainerRegistry.ECR;
  username?: string;
  password?: string;
}

/**
 *
 */
class Container extends BaseConstruct {
  /**
   * @hideconstructor
   * @param {cdk.Construct} scope CDK scope
   * @param {string} id construct ID
   * @param {ContainerProps} props construct options
   */
  constructor(scope: cdk.Construct, id: string, props?: ContainerProps) {
    super(scope, id);
  }
}

export { Container as container };
