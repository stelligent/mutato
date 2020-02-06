import * as assert from 'assert';
import * as debug from 'debug';
import * as yaml from 'js-yaml';
import * as _ from 'lodash';

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
   */
  public convertString(input: string): object {
    log('attempting to convert the input YAML to JSON: %s', input);
    const json = yaml.load(input);
    assert.ok(_.isObject(json));
    return json;
  }
}
