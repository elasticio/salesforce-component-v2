/* eslint-disable no-return-assign */
// const { expect } = require('chai');
// const jsforce = require('jsforce');
const sinon = require('sinon');

const trigger = require('../../lib/triggers/streamPlatformEventsPubSub');
const { getContext } = require('../../spec/common');

require('dotenv').config();

describe.only('streamPlatformEvents trigger test', async () => {
  describe.only('process', () => {
    before(() => {
    });
    after(() => {
      sinon.reset();
    });
    it('should succeed process trigger', async () => {
      const secretId = process.env.AUTH_SECRET_ID;
      const testCfg = {
        object: 'product_updates__e',
        eventCountPerRequest: '2',
        secretId,
      };
      const msg = { body: {} };

      const context = getContext();
      await trigger.process.call(context, msg, testCfg);
      // expect(context.emit.callCount).to.eql(1);
      // expect(context.emit.getCall(0).args[1].body).to.equal('some message');
    });
  });
});
