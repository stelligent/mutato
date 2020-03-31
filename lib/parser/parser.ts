/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { Loader } from './loader';
import { PreProcessor } from './preprocessor';

const _debug = debug('mutato:parser:Parser');

type ActionSpec = object;
type ResourceSpec = object;
type ContainerSpec = object;
export interface MutatoSpec {
  actions: ActionSpec[];
  containers: ContainerSpec[];
  environments: Map<string, ResourceSpec[]>;
  environmentVariables: { [key: string]: string };
}

/**
 * mutato.yml parser
 *
 * this class glues all the components for the parser together
 */
export class Parser {
  /**
   * parses the input mutato.yml string
   *
   * @param input mutato.yml as a string
   * @returns parsed and organized mutato.yml object
   */
  public parse(input: string): MutatoSpec {
    _debug('attempting to parse mutato.yml string: %s', input);

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

    const actionSpecs = _.get(parsed, 'actions', []);
    _debug('actions: %o, ', actionSpecs);
    const containerSpecs = _.get(parsed, 'containers', []);
    _debug('containers: %o', containerSpecs);
    const environmentSpecs = _.get(parsed, 'environments', ['development']);
    _debug('environments %o', environmentSpecs);

    const environments = new Map<string, ResourceSpec[]>();

    // second pass parsing to create environment specific resources
    environmentSpecs.forEach((env: object) => {
      const key = (_.isObject(env) ? _.head(_.keys(env)) : env) as string;
      const tag = _.isObject(env) ? _.get(env, key) : {};
      assert.ok(_.isString(key));
      const environmentLoader = new Loader();
      const environmentPreprocessor = new PreProcessor({ environment: key });
      const yaml = environmentPreprocessor.render(input);
      _debug('second pass rendered YAML string: %s', yaml);
      const parsed = environmentLoader.load(yaml);
      _debug('second pass parsed YAML: %o', parsed);
      const resources = _.get(parsed, 'resources', []);
      resources.push({ environment: { ...tag } });
      _debug('resources for environment "%s": %o', key, resources);
      environments.set(key, resources);
    });

    return {
      actions: actionSpecs,
      containers: containerSpecs,
      environmentVariables: environmentPreprocessor.usedEnvironmentVariables,
      environments,
    };
  }
}
