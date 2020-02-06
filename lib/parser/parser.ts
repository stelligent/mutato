import * as assert from 'assert';
import * as debug from 'debug';
import { Converter } from './converter';
import * as px from './exceptions';
import { PreProcessor } from './preprocessor';
import { Validator } from './validator';

const log = debug('mu:parser:Parser');

/**
 * mu.yml parser
 *
 * this class glues all the components for the parser together
 */
export class Parser {
  private readonly preprocessor: PreProcessor;
  private readonly converter: Converter;
  private readonly validator: Validator;

  /** @hideconstructor */
  constructor() {
    this.preprocessor = new PreProcessor();
    this.converter = new Converter();
    this.validator = new Validator();
  }

  /**
   * @returns {object} build context of parser
   * @todo I am not happy about this, make this typed and managed by the parser
   * instead of the preprocessor, but this does it for now
   */
  public get context(): object {
    return this.preprocessor.context;
  }

  /**
   * parses the input mu.yml as a string
   *
   * @param {string} input mu.yml as a string
   * @returns {object} mu.yml objects
   */
  public async parseString(input: string): Promise<object> {
    log('attempting to parse mu.yml string: %s', input);
    const yaml = await this.preprocessor.renderString(input);
    return this.parseYAML(yaml);
  }

  /**
   * parses the input mu.yml as a file
   *
   * @param {string} path mu.yml file path
   * @returns {object} mu.yml objects
   */
  public async parseFile(path: string): Promise<object> {
    log('attempting to parse mu.yml file: %s', path);
    const yaml = await this.preprocessor.renderFile(path);
    return this.parseYAML(yaml);
  }

  /**
   * shared code path for public methods of parser
   *
   * @param {string} yamlString YAML string to parse
   * @returns {object} YAML to JSON converted object
   * @throws {px.ValidationFailedError}
   */
  private parseYAML(yamlString: string): object {
    const json = this.converter.convertString(yamlString);
    try {
      assert.ok(this.validator.validateObject(json));
    } catch (err) {
      log('schema validation failed: %o', err);
      throw new px.ValidationFailedError();
    }
    return json;
  }
}
