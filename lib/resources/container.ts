import * as ecr from '@aws-cdk/aws-ecr';
import * as cdk from '@aws-cdk/core';
import * as assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { config } from '../config';

interface ContainerProps {
  /** build time parameters passed to "docker build" */
  buildArgs?: { [key: string]: string };
  /** path to Dockerfile (default: Dockerfile) */
  file?: string;
  /** path to build context (default: current working directory) */
  context?: string;
  /** image's push URI. leave empty if using AWS ECR */
  uri?: string;
}

interface ContainerRunProps {
  args?: string;
  env?: { [key: string]: string };
  cmd: string;
}

/**
 * a construct abstracting a single Dockerfile. This class does not participate
 * in authentication, building, or pushing the actual image of the container.
 */
export class Container extends cdk.Construct {
  public readonly props: ContainerProps;
  public readonly needsBuilding: boolean;
  public readonly repo?: ecr.Repository;
  private readonly _debug: debug.Debugger;
  private readonly _repositoryName: string;

  /**
   * @hideconstructor
   * @param scope CDK scope
   * @param id CDK construct id
   * @param props CDK construct parameters
   */
  constructor(scope: cdk.Construct, id: string, props: ContainerProps) {
    super(scope, id);

    this._debug = debug(`mutato:constructs:container:${id}`);
    this.props = _.defaults(props, {
      buildArgs: {},
      context: '.',
      file: '',
      uri: '',
    });

    this._debug('creating a container construct with props: %o', this.props);
    assert.ok(this.props.context);
    assert.ok(_.isString(this.props.uri));

    // by default, repositoryName is the same as URI passed in
    this._repositoryName = this.props.uri as string;

    if (this.props.file && !this.props.uri) {
      this._debug('container is building for AWS ECR');
      const git = config.getGithubMetaData();
      this._repositoryName = `mutato/${git.identifier}`;
      this.repo = new ecr.Repository(this, 'repository', {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        repositoryName: this._repositoryName,
      });
      const uri = this.repo.repositoryUri;
      this._debug('overriding container uri to: %s', uri);
      this.props.uri = uri;
    }

    assert.ok(this.props.uri);
    assert.ok(this._repositoryName);
    this._debug('uri: %s, name: %s', this.props.uri, this._repositoryName);
    this.needsBuilding = !!this.props.file;
  }

  /**
   * @param caller optional construct in a different stack needing to access the
   * image URI without referencing the stack that is building the container.
   * @returns Get the container image's URI for use in ECS. Optionally caller
   * can be used to get a portable URI independent of the stack building this
   * container with a precondition that caller exists in the same AWS region and
   * account.
   */
  getImageUri(caller?: cdk.Construct): string {
    if (caller && this.repo) {
      // little hack so we can use this container cross-stacks without circular
      // errors thrown by CloudFormation. the build order is guaranteed so this
      // is safe here.
      const stack = cdk.Stack.of(caller);
      const uri = `${stack.account}.dkr.ecr.${stack.region}.${stack.urlSuffix}/${this._repositoryName}`;
      return uri;
    } else return this.props.uri as string;
  }

  /** @returns shell command containing "docker login" */
  get loginCommand(): string {
    const region = cdk.Stack.of(this).region;
    return this.repo
      ? `$(aws ecr get-login --no-include-email --region ${region})`
      : config.opts.docker.user && config.opts.docker.pass
      ? `docker login -u ${config.opts.docker.user} -p ${config.opts.docker.pass}`
      : 'echo "skipping docker login (credentials not provided)"';
  }

  /** @returns shell command containing "docker build" */
  get buildCommand(): string {
    assert.ok(this.needsBuilding, 'container is not part of the pipeline');
    const buildArgs = _.reduce(
      this.props.buildArgs,
      (accumulate, value, key) => `${accumulate} --build-arg ${key}="${value}"`,
      '',
    ).trim();
    const f = this.props.file;
    const t = this.getImageUri();
    const commitTag = `${t.substring(
      0,
      t.indexOf(':') < 0 ? undefined : t.indexOf(':'),
    )}:$mutato_opts__git__commit`;
    const ctx = this.props.context;
    return `docker build ${buildArgs} -t ${t} -t ${commitTag} -f ${f} ${ctx}`;
  }

  /** @returns shell command containing "docker push" */
  get pushCommand(): string {
    assert.ok(this.needsBuilding, 'container is not part of the pipeline');
    const t = this.getImageUri();
    const commitTag = `${t.substring(
      0,
      t.indexOf(':') < 0 ? undefined : t.indexOf(':'),
    )}:$mutato_opts__git__commit`;
    return `docker push ${t} && docker push ${commitTag}`;
  }
}
