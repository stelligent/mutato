import * as assert from 'assert';
import * as bluebird from 'bluebird';
import * as cp from 'child_process';
import * as debug from 'debug';
import { promises as fs } from 'fs';
import * as _ from 'lodash';
import * as nunjucks from 'nunjucks';
import * as px from './exceptions';

const log = debug('mu:parser:PreProcessor');

/**
 * global env function of our Nunjucks Environment
 *
 * @param {string} name environment variable name
 * @returns {string }environment variable value, empty string if not found
 * @throws {px.EnvironmentVariableNotValidError}
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
 * @param {string} command shell command execute. can contain shell operators
 * @returns {string} string output of the executed command the output is trimmed
 * from whitespace and newlines (trailing newline as well)
 * @throws {px.ShellCommandNotValidError}
 * @throws {px.ShellCommandFailedError}
 * @todo make this async
 * @todo make timeout to be read from config
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
        timeout: 10000
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
   * @todo implement the "ssm" Nunjucks global function
   * @todo implement the "asm" Nunjucks global function
   */
  constructor() {
    this.env = new nunjucks.Environment(null, {
      autoescape: false,
      noCache: true,
      throwOnUndefined: true,
      watch: false
    });
    this.ctx = { build_time: Date.now() };
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
   * @param {string} input unprocessed input template string
   * @returns {string} processed template
   * @throws {px.RenderFailedError}
   */
  public async renderString(input: string): Promise<string> {
    log('attempting to render a string: %s', input);
    // note: promisify is required because we have async filters. more info:
    // https://mozilla.github.io/nunjucks/api.html#asynchronous-support
    try {
      return (await bluebird.promisify(
        this.env.renderString.bind(this.env, input, this.ctx)
      )()) as string;
    } catch (err) {
      log('template rendering failed: %o', err);
      throw new px.RenderFailedError();
    }
  }

  /**
   * renders the input file template through our Nunjucks Environment
   *
   * @param {string} path unprocessed input template file
   * @returns {string} processed template
   * @throws {px.TemplateFileInaccessibleError}
   */
  public async renderFile(path: string): Promise<string> {
    log('attempting to render a file: %s', path);
    try {
      assert.ok((await fs.stat(path)).isFile());
    } catch (err) {
      log('template file is inaccessible: %o', err);
      throw new px.TemplateFileInaccessibleError(path);
    }
    const input = await fs.readFile(path, { encoding: 'utf-8' });
    return this.renderString(input.toString());
  }
}
