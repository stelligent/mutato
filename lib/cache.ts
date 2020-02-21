import { CfnCacheCluster } from '@aws-cdk/aws-elasticache';
import { Construct } from '@aws-cdk/core';
import { BaseConstruct } from './base-construct';

/**
 * CacheNodeType: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-elasticache-cache-cluster.html#cfn-elasticache-cachecluster-cachenodetype
 */
export interface MuElasticacheProps {
  readonly cacheNodeType?: string;
  readonly engine?: string;
  readonly numCacheNodes?: number;
}

/**
 *
 */
export class MuElasticache extends BaseConstruct {
  public readonly props: MuElasticacheProps;
  /**
   * @param scope
   * @param id {string}
   * @param props {Object}
   * @param user_props {object} User passes optional properties.
   */
  constructor(
    scope: Construct,
    id: string,
    props: MuElasticacheProps = {},
    user_props?: object
  ) {
    super(scope, id);

    const defaults = {
      cacheNodeType: 'cache.t2.small',
      engine: 'memcached',
      numCacheNodes: 1
    };
    const combined = { ...defaults, ...user_props, ...props };

    new CfnCacheCluster(this, 'MyCacheCluster', combined);
  }
}
