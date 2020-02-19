/* eslint-disable @typescript-eslint/no-explicit-any */
import * as cdk from '@aws-cdk/core';
import * as debug from 'debug';
import * as _ from 'lodash';
import * as constructs from './constructs';
import { BaseConstruct } from './constructs/interfaces';

const log = debug('mu:Registry');

/**
 * this is the nasty bit that does string to type mapping
 *
 * @param {string} typeName construct type name as string
 * @param {cdk.Construct} scope construct's cdk scope
 * @param {string} id construct's cdk string id
 * @param {any[]} args arguments passed to the construct
 * @returns {BaseConstruct} instance of a construct
 */
function createConstruct(
  typeName: string,
  scope: cdk.Construct,
  id: string,
  ...args: any[]
): BaseConstruct {
  log('creating Mu construct of type: %s and args: %o', typeName, args);
  return new (constructs as any)[typeName](scope, id, ...args);
}

/**
 * construct type registry
 */
export class Registry {
  public readonly typeSet: Set<string> = new Set<string>();
  private readonly scope: cdk.Construct;

  /**
   * @hideconstructor
   * @param {cdk.Construct} scope cdk scope to use for all type instantiations
   */
  constructor(scope: cdk.Construct) {
    this.scope = scope;
    _.keys(constructs).forEach((typeName: string) => {
      log('registering Mu construct type: %s', typeName);
      this.typeSet.add(typeName);
    });
  }

  /**
   * Creates a construct from its string name
   *
   * @param {string} type construct type name as string
   * @param {string} name construct's cdk string id/name
   * @param {any[]} args arguments passed to the construct
   * @returns {Promise<BaseConstruct>} instance of a construct
   */
  public async create(
    type: string,
    name: string,
    ...args: any[]
  ): Promise<BaseConstruct> {
    const construct = createConstruct(type, this.scope, name, ...args);
    await construct.initialize();
    return construct;
  }
}
