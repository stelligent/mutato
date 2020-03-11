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
    chai.assert.isTrue(parsed.size === 1);
    chai.assert.isTrue(parsed.has('development'));
    const development = parsed.get('development');
    chai.assert.isObject(development);
    chai.assert.deepEqual(development, { environment: undefined });
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
    chai.assert.isTrue(parsed.size === 3);
    chai.assert.isTrue(parsed.has('develop'));
    chai.assert.isTrue(parsed.has('acceptance'));
    chai.assert.isTrue(parsed.has('production'));
    chai.assert.deepEqual(parsed.get('develop'), {
      environment: {
        events: {
          'pre-deploy': 'action-name',
          'post-deploy': 'action-name'
        }
      }
    });
    chai.assert.deepEqual(parsed.get('acceptance'), { environment: undefined });
    chai.assert.deepEqual(parsed.get('production'), { environment: undefined });
  });

  it('should support env() and cmd() in environments', () => {
    const parser = new Parser();
    const parsed = parser.parse(`---
    environments:
      - acceptance:
          user: {{ env("USER") }}
      - production:
          data: {{ cmd("whoami | xargs echo") }}`);
    chai.assert.isTrue(parsed.size === 2);
    chai.assert.isTrue(parsed.has('acceptance'));
    chai.assert.isTrue(parsed.has('production'));
    chai.assert.deepEqual(parsed.get('acceptance'), {
      environment: { user: process.env.USER }
    });
    chai.assert.deepEqual(parsed.get('production'), {
      environment: { data: process.env.USER }
    });
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
    resources:
      - service:
          name: web-server-{{ environment }}
          provider: fargate
          container: nginx
      - network:
          cluster:
            maxAzs: {{ 1 if environment == "acceptance" else 3 }}`);
    chai.assert.isTrue(parsed.size === 2);
    chai.assert.isTrue(parsed.has('acceptance'));
    chai.assert.isTrue(parsed.has('production'));
    chai.assert.deepEqual(parsed.get('acceptance'), {
      environment: undefined,
      containers: [{ nginx: { uri: 'nginx:latest' } }],
      resources: [
        {
          service: {
            name: 'web-server-acceptance',
            provider: 'fargate',
            container: 'nginx'
          }
        },
        {
          network: {
            cluster: {
              maxAzs: 1
            }
          }
        }
      ]
    });
    chai.assert.deepEqual(parsed.get('production'), {
      environment: undefined,
      containers: [{ nginx: { uri: 'nginx:latest' } }],
      resources: [
        {
          service: {
            name: 'web-server-production',
            provider: 'fargate',
            container: 'nginx'
          }
        },
        {
          network: {
            cluster: {
              maxAzs: 3
            }
          }
        }
      ]
    });
  });
});
