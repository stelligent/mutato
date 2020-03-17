import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Parser } from '../lib';

chai.use(chaiAsPromised);

describe('Parser Tests', () => {
  it('should not throw when parsing an empty schema', () => {
    const parser = new Parser();
    chai.assert.doesNotThrow(() => {
      parser.parse('');
    });
  });

  it('should make a development environment by default', () => {
    const parser = new Parser();
    const parsed = parser.parse('---');
    chai.assert.isTrue(parsed.environments.size === 1);
    chai.assert.isTrue(parsed.environments.has('development'));
    const development = parsed.environments.get('development');
    chai.assert.deepEqual(development, [{ environment: {} }]);
    chai.assert.deepEqual(parsed.actions, []);
    chai.assert.deepEqual(parsed.containers, []);
  });

  it('should be able to parse environments', () => {
    const parser = new Parser();
    const parsed = parser.parse(`---
    environments:
      - develop:
          events:
            pre-deploy: action-name
            post-deploy: action-name
      - acceptance
      - production`);
    chai.assert.deepEqual(parsed.actions, []);
    chai.assert.deepEqual(parsed.containers, []);
    chai.assert.isTrue(parsed.environments.size === 3);
    chai.assert.isTrue(parsed.environments.has('develop'));
    chai.assert.isTrue(parsed.environments.has('acceptance'));
    chai.assert.isTrue(parsed.environments.has('production'));
    chai.assert.deepEqual(parsed.environments.get('develop'), [
      {
        environment: {
          events: {
            'pre-deploy': 'action-name',
            'post-deploy': 'action-name'
          }
        }
      }
    ]);
    chai.assert.deepEqual(parsed.environments.get('acceptance'), [
      { environment: {} }
    ]);
    chai.assert.deepEqual(parsed.environments.get('production'), [
      { environment: {} }
    ]);
  });

  it('should support env() and cmd() in environments', () => {
    const parser = new Parser();
    const parsed = parser.parse(`---
    environments:
      - acceptance:
          user: {{ env("USER") }}
      - production:
          data: {{ cmd("whoami | xargs echo") }}`);
    chai.assert.isTrue(parsed.environments.size === 2);
    chai.assert.isTrue(parsed.environments.has('acceptance'));
    chai.assert.isTrue(parsed.environments.has('production'));
    chai.assert.deepEqual(parsed.environments.get('acceptance'), [
      {
        environment: { user: process.env.USER }
      }
    ]);
    chai.assert.deepEqual(parsed.environments.get('production'), [
      {
        environment: { data: process.env.USER }
      }
    ]);
  });

  it('should support environment specific configuration', () => {
    const parser = new Parser();
    const parsed = parser.parse(`
---
    environments:
      - acceptance
      - production
---
    containers:
      - nginx:
          uri: nginx:latest
---
    actions:
      - action-name-1:
          foo: bar
      - action-name-2:
          test: val
---
    resources:
      - service:
          name: web-server-{{ environment }}
          provider: fargate
          container: nginx
      - network:
          cluster:
            maxAzs: {{ 1 if environment == "acceptance" else 3 }}`);
    chai.assert.isTrue(parsed.environments.size === 2);
    chai.assert.isTrue(parsed.environments.has('acceptance'));
    chai.assert.isTrue(parsed.environments.has('production'));
    chai.assert.deepEqual(parsed.actions, [
      { 'action-name-1': { foo: 'bar' } },
      { 'action-name-2': { test: 'val' } }
    ]);
    chai.assert.deepEqual(parsed.containers, [
      { nginx: { uri: 'nginx:latest' } }
    ]);
    chai.assert.deepEqual(parsed.environments.get('acceptance'), [
      {
        service: {
          name: 'web-server-acceptance',
          provider: 'fargate',
          container: 'nginx'
        }
      },
      { network: { cluster: { maxAzs: 1 } } },
      { environment: {} }
    ]);
    chai.assert.deepEqual(parsed.environments.get('production'), [
      {
        service: {
          name: 'web-server-production',
          provider: 'fargate',
          container: 'nginx'
        }
      },
      { network: { cluster: { maxAzs: 3 } } },
      { environment: {} }
    ]);
  });
});
