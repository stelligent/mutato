import * as assert from 'assert';
import * as debug from 'debug';
import * as yaml from 'js-yaml';
import * as _ from 'lodash';
import * as px from './exceptions';

const log = debug('mu:parser:Converter');

/**
 * mu.yml YAML to JSON converter
 *
 * This class is responsible for converting the processed YAML to JSON
 */
export class Converter {
  /**
   * converts the input YAML into a consumable JSON object
   *
   * @param {string} input input YAML string
   * @returns {object} JSON object
   * @throws {px.ConversionFailedError}
   */
  public convertString(input: string): object {
    log('attempting to convert the input YAML to JSON: %s', input);
    try {
      const json = yaml.load(input);
      assert.ok(_.isObject(json));
      return json;
    } catch (err) {
      log('YAML to JSON conversion failed: %o', err);
      throw new px.ConversionFailedError();
    }
  }
}
