import * as codePipeline from '@aws-cdk/aws-codepipeline';

export interface ActionPropsInterface {
  readonly name: string;
}

export interface ActionInterface {
  readonly name: string;
  action(suffix: string): codePipeline.IAction;
}
