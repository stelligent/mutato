import debug from 'debug';
import assert from 'assert';
import _ from 'lodash';
import yaml from 'yaml';

const _debug = debug('mutato:parser:Loader');

/** single document YAML loader */
export class Loader {
  /**
   * @param input a single-document YAML string
   * @returns YAML document in the form of single JSON object
   */
  public load(input: string): object {
    _debug('loading input YAML: %s', input);
    const document = yaml.parseDocument(input);
    _debug('parsed document: %o', document);
    assert.ok(_.isEmpty(document.errors), 'failed to parse the input YAML');
    return document.toJSON();
  }
}
