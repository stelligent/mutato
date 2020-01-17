import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('Sanity Check', () => {
  it('should always pass sync', () => {
    chai.assert(2 + 2 === 4);
  });

  it('should always pass async', async () => {
    await chai.assert.isFulfilled(Promise.resolve());
    await chai.assert.isRejected(Promise.reject());
  });
});
