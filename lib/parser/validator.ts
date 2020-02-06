import * as ajv from 'ajv';
import * as debug from 'debug';
import * as fs from 'fs';
import * as path from 'path';
import * as px from './exceptions';

const log = debug('mu:parser:Validator');

/**
 * mu.yaml schema validator
 *
 * This class is responsible for static validation of mu.yaml against its spec
 */
export class Validator {
  private readonly ajv: ajv.Ajv;
  private readonly validator: ajv.ValidateFunction;

  /** @hideconstructor */
  constructor() {
    this.ajv = new ajv({ allErrors: true });
    try {
      this.validator = this.ajv.compile(
        JSON.parse(
          fs.readFileSync(path.resolve(__dirname, 'mu.yml.schema.json'), {
            encoding: 'utf-8'
          })
        )
      );
    } catch (err) {
      log('invalid mu.yml schema! this is fatal: %o', err);
      throw new px.InvalidMuSchemaError();
    }
  }

  /**
   * validates the given object against json schema of mu.yml
   *
   * @param {object} input JSON to be validated
   * @returns {boolean} true if a valid schema, false otherwise
   */
  public validateObject(input: object): boolean {
    const result = this.validator(input);
    if (!result) log('validation failed: %o', this.validator.errors);
    return result as boolean;
  }
}
