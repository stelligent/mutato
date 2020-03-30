import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import { config } from '../config';
import { Container } from '../resources/container';
import { CodeBuild } from './codebuild';
import { ActionPropsInterface } from './interface';

interface DockerBuildProps extends ActionPropsInterface {
  container: Container;
  pipeline: codePipeline.Pipeline;
  source: codePipeline.Artifact;
}

/** "docker build" convenience action */
export class DockerBuild extends CodeBuild {
  /**
   * @hideconstructor
   * @param props build parameters
   */
  constructor(props: DockerBuildProps) {
    super({
      ...props,
      privileged: true,
      buildImage: codeBuild.LinuxBuildImage.STANDARD_2_0,
      spec: {
        version: 0.2,
        phases: {
          install: { 'runtime-versions': { docker: 18 } },
          pre_build: { commands: [props.container.loginCommand] },
          build: { commands: [props.container.buildCommand] },
          post_build: { commands: [props.container.pushCommand] },
        },
      },
    });
  }
}

interface DockerRunProps extends ActionPropsInterface {
  container: Container;
  pipeline: codePipeline.Pipeline;
  source: codePipeline.Artifact;
  privileged?: boolean;
  args?: string;
  env?: { [key: string]: string };
  cmd: string;
}

/** "docker run" convenience action */
export class DockerRun extends CodeBuild {
  /**
   * @hideconstructor
   * @param props run parameters
   */
  constructor(props: DockerRunProps) {
    super({
      ...props,
      spec: {
        version: 0.2,
        phases: {
          install: { 'runtime-versions': { docker: 18 } },
          pre_build: { commands: [props.container.loginCommand] },
          build: {
            commands: [
              props.container.runCommand({
                cmd: props.cmd,
                args: props.args,
                env: {
                  ...config.toStringEnvironmentMap(),
                  ...props.env,
                },
              }),
            ],
          },
        },
      },
    });
  }
}
