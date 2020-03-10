import debug from 'debug';
import _ from 'lodash';
import yaml from 'yaml';

const log = debug('mu:parser:Loader');

/** fault tolerant multi document YAML loader */
export class Loader {
  /**
   * Loads a multi-document YAML string into JSON objects. This method is fault
   * tolerant and does not throw if one of the documents fail to load. Returns
   * only successfully loaded ones.
   * @param input a multi-document YAML string
   */
  public load(input: string): object[] {
    log('loading input YAML: %s', input);
    const parsed = yaml.parseAllDocuments(input);
    log('parsed YAML: %o', parsed);
    const documents = parsed.filter(document => _.isEmpty(document.errors));
    log('no-error documents: %o', documents);
    const converted = documents.map(document => document.toJSON());
    log('converted documents: %o', converted);
    return converted;
  }
}
