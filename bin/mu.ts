import * as debug from 'debug';
import 'source-map-support/register';
import * as mu from '../lib';

const log = debug('mu');

(async (): Promise<void> => {
  log('creating a new Mu App');
  const app = new mu.App();
  log('synthesizing Mu App');
  await app.synthesizeFromFile();
})()
  .then(() => {
    log('synthesized with Mu.');
  })
  .catch(err => {
    log('failed to deploy with Mu: %o', err);
    process.exit(1);
  });
