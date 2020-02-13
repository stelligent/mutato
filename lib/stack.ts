import * as cdk from '@aws-cdk/core';
import * as debug from 'debug';
import * as _ from 'lodash';
import * as path from 'path';
import { Parser } from './parser';
import { Registry } from './registry';

/**
 * @class Stack - primary stack deployed with Mu
 */
class Stack extends cdk.Stack {
  private readonly registry = new Registry(this);
  private readonly parser = new Parser();
  private readonly log: debug.Debugger;

  /**
   * @hideconstructor
   * @param {cdk.Construct} scope CDK scope
   * @param {string} id construct ID
   * @param {cdk.StackProps?} props stack props
   */
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.log = debug(`mu:Stack:${id}`);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML string
   *
   * @param {string} muString Mu YAML string
   */
  public async fromString(muString: string): Promise<void> {
    const muYml = await this.parser.parseString(muString);
    this.log('creating stack from string: %s', muString);
    await this.fromObject(muYml);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML file
   *
   * @param {string} muFile Mu YAML file path. By default it looks under your
   * current working directory for mu.yml
   */
  public async fromFile(
    muFile: string = path.resolve(process.cwd(), 'mu.yml')
  ): Promise<void> {
    const muYml = await this.parser.parseFile(muFile);
    this.log('creating stack from file: %s', muFile);
    await this.fromObject(muYml);
  }

  /**
   * initializes this Mu stack from a valid Mu YAML object
   *
   * @param {object} muYml a valid Mu YAML object
   */
  public async fromObject(muYml: object): Promise<void> {
    this.log('creating stack from object: %o', muYml);
    const networkProps = _.get(muYml, 'mu.network', {});
    await this.registry.create('network', 'network', networkProps);
  }
}

export { Stack as stack };
