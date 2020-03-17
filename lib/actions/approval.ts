import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { config } from '../config';
import { ActionInterface, ActionPropsInterface } from './interface';

const _debug = debug('mu:actions:Approval');

interface ApprovalProps extends ActionPropsInterface {
  emails?: string[];
}

/** manual approval action in the pipeline */
export class Approval implements ActionInterface {
  private readonly _props: ApprovalProps;
  public readonly name: string;

  /** @hideconstructor */
  constructor(props: ApprovalProps) {
    this._props = _.defaults(props, { order: 1 });
    assert.ok(this._props.name);
    this.name = this._props.name;
  }

  /** creates a manual approval action in the pipeline */
  public action(requester: string): codePipelineActions.ManualApprovalAction {
    _debug('creating a manual approval with props: %o', this._props);
    const git = config.getGithubMetaData();
    return new codePipelineActions.ManualApprovalAction({
      actionName: `${this.name}-${requester}`,
      notifyEmails: this._props?.emails,
      additionalInformation: this._props?.emails
        ? [
            'an approval action in a Mutato pipeline needs your attention.',
            `repository: ${git.repo}. branch: ${git.branch}.`,
            'check your AWS console to make a decision.'
          ].join(' ')
        : undefined
    });
  }
}
