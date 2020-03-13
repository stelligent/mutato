import assert from 'assert';
import debug from 'debug';
import _ from 'lodash';
import { Loader } from './loader';
import { PreProcessor } from './preprocessor';

const _debug = debug('mu:parser:Parser');
export type MuEnvironmentSpecMap = Map<string, MuEnvironmentSpec>;
export interface MuEnvironmentSpec {
  environment?: object;
  containers?: object[];
  resources?: object[];
  actions?: object[];
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
  public parse(input: string): MuEnvironmentSpecMap {
    _debug('attempting to parse mu.yml string: %s', input);
    _debug('going for the first pass, extracting environments');

    // during the first pass, we just want to figure out what environments we
    // are targeting. in this pass, environment-specific configuration is not
    // supported. we just want to extract "environments:" section.
    const environmentLoader = new Loader();
    const environmentPreprocessor = new PreProcessor({ environment: '' });
    _debug('first pass preprocessing the YAML string to look for environments');
    const firstPassYaml = environmentPreprocessor.render(input);
    _debug('first pass loading the YAML string to look for environments');
    const firstPassParsed = environmentLoader.load(firstPassYaml);
    _debug('looking for an environment tag');
    const environments = firstPassParsed.filter(tags =>
      _.isObject(_.get(tags, 'environments'))
    );
    assert.ok(environments.length <= 1, 'too many environment tags specified');
    _debug('extracting the environment tag');
    const environmentTag = _.isEmpty(environments)
      ? { environments: ['development'] } // default environment
      : (_.head(environments) as object);
    _debug('environment is set to: %o', environmentTag);
    const environmentArray = _.get(environmentTag, 'environments', []);
    assert.ok(_.isArray(environmentArray) && !_.isEmpty(environmentArray));
    const environmentKeys = environmentArray.map((e: object | string) =>
      _.isObject(e) ? _.head(_.keys(e)) : e
    );
    _debug('environment keys: %o', environmentKeys);

    const resources = new Map<string, MuEnvironmentSpec>();

    // during the second pass, we now load and parse the rest of the file. this
    // time we have environment keys so we can do environment specific configs.
    environmentKeys.map((key: string) => {
      assert.ok(_.isString(key));
      const environmentLoader = new Loader();
      const environmentPreprocessor = new PreProcessor({ environment: key });
      _debug(
        'second pass preprocessing the YAML string to look for environments'
      );
      const yaml = environmentPreprocessor.render(input);
      _debug(
        'second pass loading the YAML string to look for non-environments'
      );
      const parsed = environmentLoader.load(yaml);
      _debug('looking for non-environment tags');
      const nonEnvironments = parsed.filter(
        tags => !_.isObject(_.get(tags, 'environments'))
      );
      // todo: do validation here
      resources.set(key, {
        ..._.transform(
          _.filter(nonEnvironments),
          (result, value, key) => {
            const tag = _.head(_.keys(_.get(nonEnvironments, key))) as string;
            assert.ok(tag && _.isString(tag));
            _.set(result, tag, _.get(value, tag));
          },
          {}
        ),
        environment: _.head(
          _.filter(environmentArray.map((e: object | string) => _.get(e, key)))
        )
      } as MuEnvironmentSpec);
    });

    return resources;
  }
}
