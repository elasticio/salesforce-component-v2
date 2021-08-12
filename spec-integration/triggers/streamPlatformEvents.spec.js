/* eslint-disable no-return-assign */
const { expect } = require('chai');
const jsforce = require('jsforce');
const sinon = require('sinon');
const trigger = require('../../lib/triggers/streamPlatformEvents');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('streamPlatformEvents trigger test', async () => {
  it('should succeed selectModel objectTypes', async () => {
    const testCfg = { oauth: getOauth(), sobject: 'Contact' };

    const result = await trigger.objectTypes.call(getContext(), testCfg);
    expect(result).to.eql({
      Test__e: 'Integration Test event',
      UserCreateAcknowledge__e: 'UserCreateAcknowledge',
    });
  });

  describe('process', () => {
    before(() => {
      sinon.stub(jsforce, 'Connection').callsFake(() => ({
        streaming: { createClient: () => ({ subscribe: async (_topic, emit) => { emit('some message'); } }) },
        StreamingExtension: { Replay: () => {}, AuthFailure: () => {} },
      }));
    });
    after(() => {
      sinon.reset();
    });
    it('should succeed process trigger', async () => {
      const secretId = process.env.AUTH_SECRET_ID;
      const testCfg = { oauth: getOauth(), secretId };
      const msg = { body: {} };

      const context = getContext();
      await trigger.process.call(context, msg, testCfg);
      expect(context.emit.callCount).to.eql(1);
      expect(context.emit.getCall(0).args[1].body).to.equal('some message');
    });
  });
});
