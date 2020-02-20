import * as ecr from '@aws-cdk/aws-ecr';
import * as cdk from '@aws-cdk/core';
import * as assert from 'assert';
import * as debug from 'debug';
import * as fs from 'fs';
import * as _ from 'lodash';
import { BaseConstruct } from './interfaces';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const drc = require('docker-registry-client');

interface ContainerProps {
  buildArgs?: { [key: string]: string };
  file?: string;
  context?: string;
  tag?: string;
}

/**
 *
 */
class Container extends BaseConstruct {
  public readonly props: ContainerProps;
  public readonly repo?: ecr.Repository;
  public readonly imageUri: string;
  private readonly log: debug.Debugger;

  /**
   * @hideconstructor
   * @param {cdk.Construct} scope CDK scope
   * @param {string} id construct ID
   * @param {ContainerProps?} props construct options
   */
  constructor(scope: cdk.Construct, id: string, props?: ContainerProps) {
    super(scope, id);

    this.log = debug(`mu:constructs:container:${id}`);
    this.props = _.defaults(props, {
      buildArgs: {},
      file: 'Dockerfile',
      context: process.cwd(),
      tag: ''
    });

    this.log('creating a container construct with props: %o', this.props);
    assert.ok(this.props.file);
    assert.ok(this.props.context);
    assert.ok(_.isString(this.props.tag));

    const repo = drc.parseRepoAndTag(this.props.tag);
    this.log('parsed repository info: %o', repo);

    if ('docker.io' === _.get(repo, 'index.name', '')) {
      this.log('container is building for DockerHub');
    } else {
      this.log('container is building for AWS ECR');
      this.repo = new ecr.Repository(this, 'repository', {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });

      const tag = this.repo.repositoryUri;
      this.log('overriding container tag to: %s', tag);
      this.props.tag = tag;
    }

    assert.ok(this.props.tag);
    this.imageUri = this.props.tag as string;
    this.log('container image URI for runtime is set to: %s', this.imageUri);

    assert.ok(fs.existsSync(this.props.file as string));
    assert.ok(fs.existsSync(this.props.context as string));
  }

  /** @returns {string} shell command containing "docker build" */
  get buildCommand(): string {
    const buildArg = _.reduce(
      this.props.buildArgs,
      (accumulate, value, key) => `${accumulate} --build-arg ${key}="${value}"`,
      ''
    ).trim();
    const f = this.props.file;
    const t = this.imageUri;
    return `docker build ${buildArg} -t ${t} -f ${f} ${context}`;
  }

  /** @returns {string} shell command containing "docker push" */
  get pushCommand(): string {
    return `docker push ${this.imageUri}`;
  }
}

export { Container as container };
