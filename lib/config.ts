import rc = require('rc');
import parse = require('parse-strings-in-object');
import {
  BuildEnvironmentVariable,
  BuildEnvironmentVariableType
} from '@aws-cdk/aws-codebuild';
import * as cp from 'child_process';
import * as _ from 'lodash';
import * as traverse from 'traverse';

/**
 * @param {string} name "rc" namespace
 * @param {T} defaults default configuration object
 * @returns {T} overridden configuration with "rc"
 */
function rcTyped<T>(name: string, defaults: T): T {
  const userConfig = rc(name, defaults);
  const parsedConfig = parse(userConfig);
  return parsedConfig as T;
}

// args passed to cp.execSync down when we extract defaults from environment
const gitRemoteCmd = 'git config --get remote.origin.url || true';
const gitBranchCmd = 'git rev-parse --abbrev-ref HEAD || true';

type StringEnvironmentVariableMap = { [key: string]: string };
type BuildEnvironmentVariableMap = { [key: string]: BuildEnvironmentVariable };

export const config = rcTyped('mu', {
  opts: {
    git: {
      remote: cp
        .execSync(gitRemoteCmd, { encoding: 'utf8', timeout: 1000 })
        .trim(),
      branch: cp
        .execSync(gitBranchCmd, { encoding: 'utf8', timeout: 1000 })
        .trim(),
      secret: _.get(process.env, 'GITHUB_TOKEN', '')
    },
    docker: {
      user: _.get(process.env, 'DOCKER_USERNAME', ''),
      pass: _.get(process.env, 'DOCKER_PASSWORD', '')
    }
  },
  toStringEnvironmentMap: function() {
    return traverse(this).reduce(function(acc, x) {
      if (this.isLeaf && this.key !== '_' && !_.isFunction(x))
        acc[`mu_${this.path.join('__')}`] = `${x}`;
      return acc;
    }, {}) as StringEnvironmentVariableMap;
  },
  toBuildEnvironmentMap: function() {
    const stringMap = this.toStringEnvironmentMap();
    return _.transform(
      stringMap,
      (result: BuildEnvironmentVariableMap, value, key) => {
        result[key] = {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value
        };
      },
      {}
    );
  }
});
