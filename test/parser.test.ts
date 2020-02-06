import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
import { PreProcessor } from '../lib/parser/preprocessor';

chai.use(chaiAsPromised);

describe('Parser Tests', () => {
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
