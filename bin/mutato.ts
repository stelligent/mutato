import debug from 'debug';
import 'source-map-support/register';
import * as mutato from '../lib';

const _debug = debug('mutato');

(async (): Promise<void> => {
  _debug('creating a new Mutato App');
  const app = new mutato.App();
  _debug('synthesizing Mutato App');
  await app.synthesizeFromFile();
})()
  .then(() => {
    _debug('synthesized with Mutato.');
  })
  .catch((err) => {
    _debug('failed to deploy with Mutato: %o', err);
    process.exit(1);
  });
