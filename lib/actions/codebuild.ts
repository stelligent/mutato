import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { config } from '../config';
import { Container } from '../resources/container';
import { ActionInterface, ActionPropsInterface } from './interface';

const _debug = debug('mu:actions:CodeBuild');

interface CodeBuildProps extends ActionPropsInterface {
  buildImage?: codeBuild.IBuildImage;
  container?: Container;
  pipeline: codePipeline.Pipeline;
  source: codePipeline.Artifact;
  spec: object | string;
  privileged?: boolean;
}

/** manual approval action in the pipeline */
export class CodeBuild implements ActionInterface {
  private readonly _props: CodeBuildProps;

  /** @hideconstructor */
  constructor(props: CodeBuildProps) {
    this._props = _.defaults(props, { order: 1, privileged: false });
    assert.ok(this._props.pipeline);
    assert.ok(this._props.source);
    assert.ok(this._props.spec);
  }

  /** creates a manual approval action in the pipeline */
  get action(): codePipelineActions.CodeBuildAction {
    _debug('creating a code build action with props: %o', this._props);
    const project = new codeBuild.PipelineProject(
      cdk.Stack.of(this._props.pipeline),
      `action-project-${this._props.name}`,
      {
        environment: {
          buildImage: this._props.buildImage
            ? this._props.buildImage
            : this._props.container
            ? this._props.container.repo
              ? codeBuild.LinuxBuildImage.fromEcrRepository(
                  this._props.container.repo
                )
              : codeBuild.LinuxBuildImage.fromDockerRegistry(
                  this._props.container?.getImageUri()
                )
            : undefined,
          environmentVariables: config.toBuildEnvironmentMap(),
          privileged: this._props.privileged
        },
        buildSpec: _.isObject(this._props.spec)
          ? codeBuild.BuildSpec.fromObject(this._props.spec)
          : codeBuild.BuildSpec.fromSourceFilename(this._props.spec)
      }
    );

    this._props.container?.repo?.grantPullPush(project);
    const action = new codePipelineActions.CodeBuildAction({
      actionName: this._props.name,
      input: this._props.source,
      project
    });

    return action;
  }
}
