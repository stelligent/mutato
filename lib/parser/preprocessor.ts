import * as assert from 'assert';
import * as bluebird from 'bluebird';
import * as cp from 'child_process';
import * as debug from 'debug';
import * as fsx from 'fs-extra';
import * as _ from 'lodash';
import * as nunjucks from 'nunjucks';

const log = debug('mu:PreProcessor');

/**
 * global env function of our Nunjucks Environment
 *
 * @param {string} name environment variable name
 * @returns {string }environment variable value, empty string if not found
 */
function nunjucks_env_global(name: string): string {
  log('attempting to resolve environment variable %s', name);
  assert.ok(_.isString(name), 'environment variable name must be a string');
  return _.get(process.env, name, '');
}

/**
 * global cmd function of our Nunjucks Environment
 *
 * @param {string} command shell command execute. can contain shell operators
 * @returns {string} string output of the executed command the output is trimmed
 * from whitespace and newlines (trailing newline as well)
 * @todo make this async
 */
function nunjucks_cmd_global(command: string): string {
  log('attempting to execute command %s', command);
  assert.ok(_.isString(command), 'shell command must be a string');
  return _.trim(
    cp.execSync(command, {
      encoding: 'utf8',
      timeout: 10000
    })
  );
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

  /** @hideconstructor */
  constructor() {
    this.env = new nunjucks.Environment(null, {
      autoescape: false,
      noCache: true,
      throwOnUndefined: true,
      watch: false
    });
    this.ctx = { build_time: Date.now() };
    log('a new preprocessor is initialized with context: %o', this.ctx);

    // TODO: add ssm and asm filters here
    this.env.addGlobal('env', nunjucks_env_global);
    this.env.addGlobal('cmd', nunjucks_cmd_global);
  }

  /**
   * renders the input string template through our Nunjucks Environment
   *
   * @param {string} input unprocessed input template string
   * @returns {string} processed template
   */
  public async renderString(input: string): Promise<string> {
    log('attempting to render a string: %s', input);
    // note: promisify is required because we have async filters. more info:
    // https://mozilla.github.io/nunjucks/api.html#asynchronous-support
    return (
      (await bluebird.promisify(
        this.env.renderString.bind(this.env, input, this.ctx)
      )()) || ''
    );
  }

  /**
   * renders the input file template through our Nunjucks Environment
   *
   * @param {string} path unprocessed input template file
   * @returns {string} processed template
   */
  public async renderFile(path: string): Promise<string> {
    log('attempting to render a file: %s', path);
    assert.ok(await fsx.pathExists(path), 'template file is inaccessible');
    const input = await fsx.readFile(path);
    return this.renderString(input.toString());
  }
}
