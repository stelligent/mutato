import * as cdk from '@aws-cdk/core';
import * as debug from 'debug';
import 'source-map-support/register';
import { config } from '../lib/config';
import { MuApp, MuPipeline } from '../lib/stack';

const log = debug('mu');
const git = config.getGithubMetaData();

/** Mu CLI's entry point */
async function main(): Promise<void> {
  log('creating a new CDK app');
  const app = new cdk.App();
  log('creating a new Mu app stack');
  const stack = new MuApp(app, 'MuApp', {
    description: 'all application resources specified in mu.yml',
    stackName: `Mu-App-${git.owner}-${git.repo}-${git.branch}`
  });
  log('creating a new Mu pipeline stack');
  const pipeline = new MuPipeline(app, 'MuPipeline', {
    description: 'pipeline that manages deploy of mu.yml resources',
    stackName: `Mu-Pipeline-${git.owner}-${git.repo}-${git.branch}`,
    app: stack
  });
  log('reading constructs from mu.yml');
  await stack.fromFile();
  log('synthesizing Mu pipeline');
  await pipeline.initialize();
}

main()
  .then(() => {
    log('deployed with Mu.');
  })
  .catch(err => {
    log('failed to deploy with Mu: %o', err);
    process.exit(1);
  });
