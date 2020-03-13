import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import debug from 'debug';
import { config } from '../config';
import { ActionInterface, ActionPropsInterface } from './interface';

const _debug = debug('mu:actions:Approval');

interface ApprovalProps extends ActionPropsInterface {
  emails?: string[];
}

/** manual approval action in the pipeline */
export class Approval implements ActionInterface {
  /** creates a manual approval action in the pipeline */
  create(props: ApprovalProps): codePipelineActions.ManualApprovalAction {
    _debug('creating a manual approval with props: %o', props);
    const git = config.getGithubMetaData();
    return new codePipelineActions.ManualApprovalAction({
      runOrder: props.order,
      actionName: props.name,
      notifyEmails: props?.emails,
      additionalInformation: props?.emails
        ? [
            'an approval action in a Mutato pipeline needs your attention.',
            `repository: ${git.repo}. branch: ${git.branch}.`,
            'check your AWS console to make a decision.'
          ].join(' ')
        : undefined
    });
  }
}
