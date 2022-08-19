/* eslint-disable newline-per-chained-call */
const { expect } = require('chai');
const sinon = require('sinon');
const { getContext } = require('../common');
const { callJSForceMethod } = require('../../lib/helpers/wrapper');
const { process } = require('../../lib/triggers/getUpdatedObjectsPolling');
const records = require('../testData/trigger.results.json');

describe.only('getUpdatedObjectsPolling trigger', () => {
  let execRequest;
  describe('succeed', () => {
    beforeEach(() => {
      execRequest = sinon.stub(callJSForceMethod, 'call')
        .onCall(0).returns(records.slice(0, 3))
        .onCall(1).returns(records.slice(3, 5));
    });
    afterEach(() => {
      sinon.restore();
    });
    it('emitIndividually', async () => {
      const cfg = {
        sobject: 'Document',
        // startTime,
        // endTime,
        pageSize: 3,
        linkedObjects: [],
        emitBehavior: 'emitIndividually',
        singlePagePerInterval: false,
      };
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg);
      expect(context.emit.getCall(2).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(2);
      expect(context.emit.callCount).to.be.equal(5);
    });
    it('fetchPage', async () => {
      const cfg = {
        sobject: 'Document',
        // startTime,
        // endTime,
        pageSize: 3,
        linkedObjects: [],
        emitBehavior: 'fetchPage',
        singlePagePerInterval: false,
      };
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg);
      expect(context.emit.getCall(1).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(2);
      expect(context.emit.callCount).to.be.equal(3);
    });
    it('startTime and endTime', async () => {
      const cfg = {
        sobject: 'Document',
        startTime: '2000-01-01T00:00:00.000Z',
        endTime: '2022-01-01T00:00:00.000Z',
        pageSize: 3,
        linkedObjects: [],
        emitBehavior: 'fetchPage',
        singlePagePerInterval: false,
      };
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg);
      expect(context.emit.getCall(1).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(2);
      expect(context.emit.callCount).to.be.equal(3);
    });
  });
});
