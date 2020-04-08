import * as ecr from '@aws-cdk/aws-ecr';
import * as cdk from '@aws-cdk/core';
import * as assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { config } from '../config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dockerImageParse = require('docker-parse-image');

interface ContainerProps {
  /** build time parameters passed to "docker build" */
  buildArgs?: { [key: string]: string };
  /** path to Dockerfile (default: Dockerfile) */
  file?: string;
  /** path to build context (default: current working directory) */
  context?: string;
  /** image's push URI. leave empty if using AWS ECR */
  uri?: string;
  /** optional array of tags to apply if we are building the container */
  tags?: string[];
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
  private readonly _ecrRepoName?: string;

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
      tags: [],
    });

    this._debug('creating a container construct with props: %o', this.props);
    assert.ok(this.props.context);
    assert.ok(_.isString(this.props.uri));

    if (this.props.file) {
      if (this.props.uri) {
        this._debug('container is building for Docker Hub');
        assert.ok(config.opts.docker.user && config.opts.docker.pass);
        const { tag } = dockerImageParse(this.props.uri);
        // if a tag is given in the URI, remove it and add it to "tags"
        if (tag) this.props.tags?.push(tag);
        this.props.uri = this.props.uri?.replace(`:${tag}`, '');
      } else {
        this._debug('container is building for AWS ECR');
        const git = config.getGithubMetaData();
        this._ecrRepoName = `mutato/${git.identifier}`;
        this.repo = new ecr.Repository(this, 'repository', {
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          repositoryName: this._ecrRepoName,
        });
        const uri = this.repo.repositoryUri;
        this._debug('overriding container uri to: %s', uri);
        this.props.uri = uri;
      }
    }

    assert.ok(this.props.uri);
    if (_.isEmpty(this.props.tags)) this.props.tags = ['latest'];
    this.props.tags?.push('$mutato_opts__git__commit');
    this._debug('uri: %s, tags: %o', this.props.uri, this._tags);
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
      const uri = `${stack.account}.dkr.ecr.${stack.region}.${stack.urlSuffix}/${this._ecrRepoName}`;
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
    const file = this.props.file;
    const context = this.props.context;
    const tagArgs = this._tags.map((tag) => `-t ${tag}`).join(' ');
    return `docker build ${buildArgs} ${tagArgs} -f ${file} ${context}`;
  }

  /** @returns shell command containing "docker push" */
  get pushCommand(): string {
    assert.ok(this.needsBuilding, 'container is not part of the pipeline');
    return this._tags.map((tag) => `docker push ${tag}`).join(' && ');
  }

  private get _tags(): string[] {
    const imageUri = this.getImageUri();
    return _.uniq(this.props.tags).map((tag) => `${imageUri}:${tag}`);
  }
}
