const { expect } = require('chai');
const jsforce = require('jsforce');
const sinon = require('sinon');

const trigger = require('../../lib/triggers/streamPlatformEvents');
const {
  fetchToken, getContext, defaultCfg,
} = require('../common.js');

describe('streamPlatformEvents trigger', () => {
  describe('process module', () => {
    describe('should emit message', async () => {
      before(() => {
        sinon.stub(jsforce, 'Connection').callsFake(() => ({
          streaming: { createClient: () => ({ subscribe: async (_topic, emit) => { emit('some message'); }, on: () => {} }) },
          StreamingExtension: { Replay: () => {}, AuthFailure: () => {} },
        }));
      });
      after(() => {
        sinon.restore();
      });
      it('run', async () => {
        const testCfg = {
          ...defaultCfg,
        };

        fetchToken();

        const context = getContext();
        await trigger.process.call(context, {}, testCfg);
        expect(context.emit.callCount).to.eql(1);
        expect(context.emit.getCall(0).args[1].body).to.equal('some message');
      });
    });

    it('should throw error (no secretId)', async () => {
      const testCfg = {};

      try {
        await trigger.process.call(getContext(), {}, testCfg);
      } catch (err) {
        expect(err.message).to.be.equal('secretId is missing in configuration, credentials cannot be fetched');
      }
    });
  });
});
