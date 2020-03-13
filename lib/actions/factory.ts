import { IAction } from '@aws-cdk/aws-codepipeline';
import { ActionInterface, ActionPropsInterface } from './interface';

/** convenience factory function for actions */
export function actionFactory<
  TAction extends ActionInterface,
  TActionProps extends ActionPropsInterface
>(type: new () => TAction, props: TActionProps): IAction {
  const action = new type();
  return action.create(props);
}
