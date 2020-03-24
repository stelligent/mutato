import debug from 'debug';
import 'source-map-support/register';
import * as mu from '../lib';

const _debug = debug('mu');

(async (): Promise<void> => {
  _debug('creating a new Mu App');
  const app = new mu.App();
  _debug('synthesizing Mu App');
  await app.synthesizeFromFile();
})()
  .then(() => {
    _debug('synthesized with Mu.');
  })
  .catch((err) => {
    _debug('failed to deploy with Mu: %o', err);
    process.exit(1);
  });
