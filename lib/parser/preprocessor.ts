import assert from 'assert';
import cp from 'child_process';
import debug from 'debug';
import _ from 'lodash';
import ms from 'ms';
import nunjucks from 'nunjucks';
import { config } from '../config';
import * as px from './exceptions';

const log = debug('mu:parser:PreProcessor');
type StringMap = { [key: string]: string };

/**
 * global env function of our Nunjucks Environment
 *
 * @param name environment variable name
 * @returns environment variable value, empty string if not found
 */
function nunjucks_env_global(name: string): string {
  log('attempting to resolve environment variable %s', name);
  try {
    assert.ok(_.isString(name));
  } catch (err) {
    log('environment variable resolution failed: %o', err);
    throw new px.EnvironmentVariableNotValidError(name);
  }
  return _.get(process.env, name, '');
}

/**
 * global cmd function of our Nunjucks Environment
 *
 * @param command shell command execute. can contain shell operators
 * @returns string output of the executed command the output is trimmed
 * from whitespace and newlines (trailing newline as well)
 */
function nunjucks_cmd_global(command: string): string {
  log('attempting to execute command %s', command);
  try {
    assert.ok(_.isString(command));
  } catch (err) {
    log('shell command must be a string: %o', err);
    throw new px.ShellCommandNotValidError(command);
  }
  try {
    return _.trim(
      cp.execSync(command, {
        encoding: 'utf8',
        timeout: ms(config.opts.preprocessor.timeout)
      })
    );
  } catch (err) {
    log('shell command exited with non-zero status: %o', err);
    throw new px.ShellCommandFailedError(command);
  }
}

/**
 * mu.yml template pre processor
 *
 * internally this class sets up a custom Nunjucks Environment with useful
 * helper functions and processes input Nunjucks templates
 */
export class PreProcessor {
  private readonly env: nunjucks.Environment;
  private readonly ctx: object;

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
      watch: false
    });
    this.ctx = { ...context, build_time: Date.now() };
    log('a new preprocessor is initialized with context: %o', this.ctx);

    this.env.addGlobal('env', nunjucks_env_global);
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
    log('attempting to render a string through Nunjucks: %s', input);
    try {
      return this.env.renderString(input, this.ctx);
    } catch (err) {
      log('template rendering failed: %o', err);
      throw new px.RenderFailedError();
    }
  }
}
