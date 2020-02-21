import Mu = require('../lib/mu-stack');
import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { MuElasticache } from '../lib/cache';

describe('Elasticache Module Tests', function() {
  describe('Elasticache Simple Configuration', () => {
    it('should create Memcached stack with default values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'ElasticacheTestStack');
      new MuElasticache(stack, 'MyMemcached');

      expectCDK(stack).to(
        haveResource('AWS::ElastiCache::CacheCluster', {
          CacheNodeType: 'cache.t2.small',
          Engine: 'memcached',
          NumCacheNodes: 1
        })
      );
    });
    it('should create Redis stack with custom values', () => {
      const app = new cdk.App();
      const stack = new Mu.MuStack(app, 'MyTestStack');
      const props = {
        cacheNodeType: 'cache.m5.large',
        engine: 'redis',
        numCacheNodes: 2,
        clusterName: 'MyRedisCluster'
      };
      new MuElasticache(stack, 'MyRedis', props);
      expectCDK(stack).to(
        haveResource('AWS::ElastiCache::CacheCluster', {
          CacheNodeType: props.cacheNodeType,
          Engine: props.engine,
          NumCacheNodes: props.numCacheNodes,
          ClusterName: props.clusterName
        })
      );
    });
  });
});
