import * as codePipeline from '@aws-cdk/aws-codepipeline';

export interface ActionPropsInterface {
  readonly name: string;
  readonly order?: number;
}

export interface ActionInterface {
  readonly action: codePipeline.IAction;
}
