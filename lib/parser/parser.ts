/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { Loader } from './loader';
import { PreProcessor } from './preprocessor';

const _debug = debug('mu:parser:Parser');

type ActionSpec = object;
type ResourceSpec = object;
type ContainerSpec = object;
type EnvironmentSpec = object | string;
export interface MuSpec {
  actions: ActionSpec[];
  containers: ContainerSpec[];
  environments: Map<EnvironmentSpec, ResourceSpec[]>;
}

/**
 * mu.yml parser
 *
 * this class glues all the components for the parser together
 * @todo "containers" and "actions" cannot be environment specific, handle it
 */
export class Parser {
  /**
   * parses the input mu.yml string
   *
   * @param input mu.yml as a string
   */
  public parse(input: string): MuSpec {
    _debug('attempting to parse mu.yml string: %s', input);
    _debug('going for the first pass, extracting environments');

    // during the first pass, we just want to figure out what environments we
    // are targeting, what containers we are building and what actions we are
    // constructing. during this pass, environment specific configuration is
    // not supported.
    const environmentLoader = new Loader();
    const environmentPreprocessor = new PreProcessor({ environment: '' });
    _debug('first pass preprocessing the YAML string: %s', input);
    const yaml = environmentPreprocessor.render(input);
    _debug('first pass loading the YAML string: %s', yaml);
    const parsed = environmentLoader.load(yaml);

    const queryRootTag = (
      name: string,
      parsed: object[],
      defaults: any = []
    ): object[] => {
      _debug('looking for a root tag: %s', name);
      const tag = parsed.filter(tags => _.isObject(_.get(tags, name)));
      assert.ok(tag.length <= 1, 'too many root tags');
      return _.get(_.head(tag) || {}, name, defaults) as object[];
    };

    const actionSpecs = queryRootTag('actions', parsed);
    _debug('actions: %o, ', actionSpecs);
    const containerSpecs = queryRootTag('containers', parsed);
    _debug('containers: %o', containerSpecs);
    const envSpecs = queryRootTag('environments', parsed, ['development']);
    _debug('environments %o', envSpecs);

    const environments = new Map<EnvironmentSpec, ResourceSpec[]>();

    // second pass parsing to create environment specific resources
    envSpecs.forEach((env: EnvironmentSpec) => {
      const key = (_.isObject(env) ? _.head(_.keys(env)) : env) as string;
      assert.ok(_.isString(key));
      const environmentLoader = new Loader();
      const environmentPreprocessor = new PreProcessor({ environment: key });
      const yaml = environmentPreprocessor.render(input);
      _debug('second pass rendered YAML string: %s', yaml);
      const parsed = environmentLoader.load(yaml);
      _debug('second pass parsed YAML: %o', parsed);
      const resources = queryRootTag('resources', parsed);
      _debug('resources for environment "%s": %o', key, resources);
      environments.set(env, resources);
    });

    return {
      actions: actionSpecs,
      containers: containerSpecs,
      environments
    };
  }
}
