import * as codePipeline from '@aws-cdk/aws-codepipeline';

export interface ActionPropsInterface {
  readonly name: string;
  readonly order: number;
}

export interface ActionInterface {
  create(props: ActionPropsInterface): codePipeline.IAction;
}
