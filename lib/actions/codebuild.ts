import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codePipelineActions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import debug from 'debug';
import _ from 'lodash';
import { config } from '../config';
import { Container } from '../resources/container';
import { ActionInterface, ActionPropsInterface } from './interface';

const _debug = debug('mu:actions:Approval');

interface CodeBuildProps extends ActionPropsInterface {
  container: Container;
  pipeline: codePipeline.Pipeline;
  source: codePipeline.Artifact;
  spec: object | string;
  privileged: boolean;
}

/** manual approval action in the pipeline */
export class CodeBuild implements ActionInterface {
  /** creates a manual approval action in the pipeline */
  create(props: CodeBuildProps): codePipelineActions.CodeBuildAction {
    _debug('creating a code build action with props: %o', props);
    const project = new codeBuild.PipelineProject(
      cdk.Stack.of(props.pipeline),
      `action-project-${props.name}`,
      {
        environment: {
          buildImage: props.container.repo
            ? codeBuild.LinuxBuildImage.fromEcrRepository(props.container.repo)
            : codeBuild.LinuxBuildImage.fromDockerRegistry(
                props.container.getImageUri()
              ),
          environmentVariables: config.toBuildEnvironmentMap(),
          privileged: props.privileged
        },
        buildSpec: _.isObject(props.spec)
          ? codeBuild.BuildSpec.fromObject(props.spec)
          : codeBuild.BuildSpec.fromSourceFilename(props.spec)
      }
    );

    props.container.repo?.grantPull(project);
    const action = new codePipelineActions.CodeBuildAction({
      actionName: props.name,
      runOrder: props.order,
      input: props.source,
      project
    });

    return action;
  }
}
