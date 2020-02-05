import * as assert from 'assert';
import * as bluebird from 'bluebird';
import * as cp from 'child_process';
import * as debug from 'debug';
import * as fsx from 'fs-extra';
import * as _ from 'lodash';
import * as nunjucks from 'nunjucks';

const log = debug('mu:PreProcessor');

function nunjucks_env_filter(name: string): string {
  log('attempting to resolve environment variable %s', name);
  assert.ok(_.isString(name), 'environment variable name must be a string');
  return _.get(process.env, name, '');
}

// TODO: make this async
function nunjucks_cmd_filter(command: string): string {
  log('attempting to execute command %s', command);
  assert.ok(_.isString(command), 'shell command must be a string');
  return _.trim(
    cp.execSync(command, {
      encoding: 'utf8',
      timeout: 10000
    })
  );
}

export class PreProcessor {
  private readonly env: nunjucks.Environment;
  private readonly ctx: object;

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
    this.env.addGlobal('env', nunjucks_env_filter);
    this.env.addGlobal('cmd', nunjucks_cmd_filter);
  }

  public async renderString(input: string): Promise<string> {
    log('attempting to render a string: %s', input);
    // note 1: bluebird typings is broken, we have to ts-ignore its arguments
    // note 2: promisify is required because we have async filters. more info:
    // https://mozilla.github.io/nunjucks/api.html#asynchronous-support
    return bluebird.promisify(this.env.renderString, { context: this.env })(
      input,
      // @ts-ignore
      this.ctx
    );
  }

  public async renderFile(path: string): Promise<string> {
    log('attempting to render a file: %s', path);
    assert.ok(await fsx.pathExists(path), 'template file is inaccessible');
    const input = await fsx.readFile(path);
    return this.renderString(input.toString());
  }
}
