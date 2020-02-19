import rc = require('rc');
import parse = require('parse-strings-in-object');
import * as cp from 'child_process';
import * as _ from 'lodash';

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

export const config = rcTyped('mu', {
  opts: {
    git: {
      remote: cp.execSync(gitRemoteCmd, { encoding: 'utf8', timeout: 1000 }),
      branch: cp.execSync(gitBranchCmd, { encoding: 'utf8', timeout: 1000 }),
      secret: _.get(process.env, 'GITHUB_TOKEN', '')
    }
  }
});
