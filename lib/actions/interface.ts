import * as codePipeline from '@aws-cdk/aws-codepipeline';

export interface ActionPropsInterface {
  readonly name: string;
}

export interface ActionInterface {
  action(runOrder: number): codePipeline.IAction;
}
