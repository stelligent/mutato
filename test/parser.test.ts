import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fsx from 'fs-extra';
import * as path from 'path';
import { Converter } from '../lib/parser/converter';
import { PreProcessor } from '../lib/parser/preprocessor';

chai.use(chaiAsPromised);

describe('Parser Tests', () => {
  describe('Converter tests', () => {
    describe('.convertString tests', () => {
      it('should be able to convert a basic string', () => {
        const convert = new Converter();
        const result = convert.convertString(
          fsx.readFileSync(path.resolve(__dirname, 'fixtures/basic-yaml.yml'), {
            encoding: 'utf-8'
          })
        );
        chai.assert.isObject(result);
        chai.assert.deepEqual(result, {
          version: 0.1,
          mu: { fargate: { name: 'app', test: 'foo' } }
        });
      });

      it('should throw if the input is not YAML', () => {
        const convert = new Converter();
        chai.assert.throws(() => {
          convert.convertString('string');
        });
      });
    });
  });

  describe('PreProcessor tests', () => {
    describe('.renderString tests', () => {
      it('should be able to render a basic string template', async () => {
        const pp = new PreProcessor();
        const input = 'time: {{ build_time }}';
        const result = await pp.renderString(input);
        chai.assert(!result.includes('{{ build_time }}'));
      });

      it('should throw with a string template and invalid context', async () => {
        const pp = new PreProcessor();
        const input = 'time: {{ invalid }}';
        chai.assert.isRejected(pp.renderString(input));
      });

      it('should be able to resolve environment variables', async () => {
        const pp = new PreProcessor();
        const result = await pp.renderString('user: {{ env("USER") }}');
        chai.assert.equal(result, `user: ${process.env.USER}`);
      });

      it('should throw when environment variable is not a string', async () => {
        const pp = new PreProcessor();
        await chai.assert.isRejected(pp.renderString('{{ env(USER) }}'));
        await chai.assert.isRejected(pp.renderString('{{ env(123) }}'));
        await chai.assert.isRejected(pp.renderString('{{ env() }}'));
      });

      it('should be able to resolve shell commands', async () => {
        const pp = new PreProcessor();
        const result = await pp.renderString(
          'user: {{ cmd("whoami | xargs echo") }}'
        );
        chai.assert.equal(result, `user: ${process.env.USER}`);
      });

      it('should throw when shell command is not a string', async () => {
        const pp = new PreProcessor();
        await chai.assert.isRejected(pp.renderString('{{ cmd(whomai) }}'));
        await chai.assert.isRejected(pp.renderString('{{ cmd(123) }}'));
        await chai.assert.isRejected(pp.renderString('{{ cmd() }}'));
      });

      it('should throw when shell commands exits with non zero code', async () => {
        const pp = new PreProcessor();
        await chai.assert.isRejected(
          pp.renderString('user: {{ cmd("exit 1") }}')
        );
      });
    });

    describe('.renderFile tests', () => {
      it('should be able to render a basic file template', async () => {
        const pp = new PreProcessor();
        const result = await pp.renderFile(
          path.resolve(__dirname, 'fixtures/basic-schema.yml')
        );
        chai.assert(!result.includes('{{'));
      });

      it('should throw when given an invalid file path', async () => {
        const pp = new PreProcessor();
        await chai.assert.isRejected(pp.renderFile('aliens.yml'));
      });
    });
  });
});
