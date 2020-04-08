import assert from 'assert';
import cp from 'child_process';
import debug from 'debug';
import _ from 'lodash';
import ms from 'ms';
import nunjucks from 'nunjucks';
import { config } from '../config';

const _debug = debug('mutato:parser:PreProcessor');
type StringMap = { [key: string]: string };

/**
 * global env function of our Nunjucks Environment
 *
 * @param name environment variable name
 * @returns environment variable value, empty string if not found
 * @ignore
 */
function nunjucks_env_global(name: string): string {
  _debug('attempting to resolve environment variable %s', name);
  assert.ok(_.isString(name));
  return _.get(process.env, name, '');
}

/**
 * global cmd function of our Nunjucks Environment
 *
 * @param command shell command execute. can contain shell operators
 * @returns string output of the executed command the output is trimmed
 * from whitespace and newlines (trailing newline as well)
 * @ignore
 */
function nunjucks_cmd_global(command: string): string {
  _debug('attempting to execute command %s', command);
  assert.ok(_.isString(command));
  return _.trim(
    cp.execSync(command, {
      encoding: 'utf8',
      timeout: ms(config.opts.preprocessor.timeout),
    }),
  );
}

/**
 * mutato.yml template pre processor
 *
 * internally this class sets up a custom Nunjucks Environment with useful
 * helper functions and processes input Nunjucks templates
 */
export class PreProcessor {
  private readonly env: nunjucks.Environment;
  private readonly ctx: object;
  public readonly usedEnvironmentVariables: { [key: string]: string } = {};

  /**
   * @hideconstructor
   * @param context additional context variables given to Nunjucks
   * @todo implement the "ssm" Nunjucks global function
   * @todo implement the "asm" Nunjucks global function
   */
  constructor(context: StringMap = {}) {
    this.env = new nunjucks.Environment(null, {
      autoescape: false,
      noCache: true,
      throwOnUndefined: true,
      watch: false,
    });
    this.ctx = {
      ...context,
      build_time: Date.now(),
      git: {
        ...config.getGithubMetaData(),
        commit: config.opts.git.commit,
      },
    };
    _debug('a new preprocessor is initialized with context: %o', this.ctx);

    this.env.addGlobal('env', (name: string) => {
      const resolved = nunjucks_env_global(name);
      _.set(this.usedEnvironmentVariables, name, resolved);
      return resolved;
    });
    this.env.addGlobal('cmd', nunjucks_cmd_global);
  }

  /** @returns {object} build context of preprocessor */
  public get context(): object {
    return this.ctx;
  }

  /**
   * renders the input string template through our Nunjucks Environment
   *
   * @param input unprocessed input template string
   * @returns processed template
   */
  public render(input: string): string {
    _debug('attempting to render a string through Nunjucks: %s', input);
    return this.env.renderString(input, this.ctx);
  }
}
