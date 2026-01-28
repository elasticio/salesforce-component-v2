const { expect } = require('chai');
const sinon = require('sinon');

const trigger = require('../../lib/triggers/streamPlatformEventsPubSub');
const { getContext, defaultCfg } = require('../common.js');
const util = require('../../lib/util');

describe('streamPlatformEventsPubSub trigger', () => {
  describe('processTrigger - error handling', () => {
    it('should handle missing secretId', async () => {
      const testCfg = {
        ...defaultCfg,
        secretId: undefined,
      };
      const msg = { id: 'test-msg-id', body: {} };

      const context = getContext();
      try {
        await trigger.process.call(context, msg, testCfg);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.include('secretId is missing');
      }
    });

    it('should reset creationInProgress flag in finally block', async () => {
      const testCfg = {
        ...defaultCfg,
        secretId: 'test-secret-id',
        object: 'TestEvent__e',
      };
      const msg = { id: 'test-msg-id', body: {} };

      const sandbox = sinon.createSandbox();
      sandbox.stub(util, 'getSecret').rejects(new Error('Network error'));

      const context = getContext();

      try {
        await trigger.process.call(context, msg, testCfg);
      } catch (err) {
        // Expected error - testing that creationInProgress flag resets
      }

      try {
        await trigger.process.call(context, msg, testCfg);
      } catch (err) {
        expect(err.message).to.not.include('Subscription recreate in progress');
      }

      sandbox.restore();
    });
  });
});
