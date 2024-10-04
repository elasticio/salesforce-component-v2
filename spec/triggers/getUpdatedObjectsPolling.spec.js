/* eslint-disable newline-per-chained-call, no-undef */
const { expect } = require('chai');
const sinon = require('sinon');
const { getContext } = require('../common');
const { callJSForceMethod } = require('../../lib/helpers/wrapper');
const { process } = require('../../lib/triggers/getUpdatedObjectsPolling');
const duplicateRecords = require('../testData/trigger.results.1612.json');

describe('getUpdatedObjectsPolling trigger', () => {
  let execRequest;
  describe('succeed', () => {
    afterEach(() => {
      sinon.restore();
    });
    it('emitIndividually', async () => {
      execRequest = sinon.stub(callJSForceMethod, 'call').returns(duplicateRecords);
      const cfg = {
        sobject: 'Document',
        pageSize: 100,
        linkedObjects: [],
        emitBehavior: 'emitIndividually',
        singlePagePerInterval: false,
      };
      const snapshot = {};
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg, snapshot);
      expect(context.emit.callCount).to.be.equal(28);
      expect(context.emit.getCall(27).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(1);
      expect(context.emit.getCall(0).lastArg.body).to.deep.equal(duplicateRecords[0]);
    });

    it('emitIndividually with selected fields', async () => {
      execRequest = sinon.stub(callJSForceMethod, 'call').returns(duplicateRecords);
      const cfg = {
        sobject: 'Document',
        pageSize: 100,
        linkedObjects: [],
        selectedFields: ['Id', 'Name'],
        emitBehavior: 'emitIndividually',
        singlePagePerInterval: false,
      };
      const snapshot = {};
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg, snapshot);
      expect(execRequest.firstCall.args[3].selectedObjects).to.be.equal('Id,Name,LastModifiedDate');
      expect(context.emit.callCount).to.be.equal(28);
      expect(context.emit.getCall(27).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(1);
      expect(context.emit.getCall(0).lastArg.body).to.deep.equal(duplicateRecords[0]);
    });

    it('fetchPage sizePage = 10, singlePagePerInterval = false', async () => {
      const duplicateRecordsCopy = structuredClone(duplicateRecords);
      execRequest = sinon.stub(callJSForceMethod, 'call')
        .onCall(0).returns(duplicateRecordsCopy.slice(0, 10))
        .onCall(1).returns(duplicateRecordsCopy.slice(10, 20))
        .onCall(2).returns(duplicateRecordsCopy.slice(20, 30));
      const cfg = {
        sobject: 'Document',
        pageSize: 10,
        linkedObjects: [],
        emitBehavior: 'fetchPage',
        singlePagePerInterval: false,
      };
      const snapshot = {};
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg, snapshot);
      expect(context.emit.callCount).to.be.equal(4);
      expect(context.emit.getCall(3).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(3);
      const resultArray = context.emit.getCall(0).lastArg.body.results;
      expect(resultArray).to.deep.equal(duplicateRecords.slice(0, 8));
    });

    it('fetchPage sizePage = 10, singlePagePerInterval = true', async () => {
      execRequest = sinon.stub(callJSForceMethod, 'call')
        .onCall(0).returns(duplicateRecords)
        .onCall(1).returns(duplicateRecords.slice(8))
        .onCall(2).returns(duplicateRecords.slice(19));
      const cfg = {
        sobject: 'Document',
        pageSize: 100,
        linkedObjects: [],
        emitBehavior: 'fetchPage',
        singlePagePerInterval: true,
      };
      const snapshot = {};
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg, snapshot);
      expect(context.emit.callCount).to.be.equal(2);
      expect(context.emit.getCall(1).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(1);
      expect(context.emit.getCall(0).lastArg.body.results).to.deep.equal(duplicateRecords.slice(0, 27));
      const resultArray = context.emit.getCall(0).lastArg.body.results;
      const emitedSnapshot = context.emit.getCall(1).lastArg;
      await process.call(context, msg, cfg, emitedSnapshot);
      expect(context.emit.callCount).to.be.equal(4);
      expect(context.emit.getCall(3).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(2);
      resultArray.push(...context.emit.getCall(2).lastArg.body.results);
      const emitedSnapshot2 = context.emit.getCall(3).lastArg;
      await process.call(context, msg, cfg, emitedSnapshot2);
      expect(context.emit.callCount).to.be.equal(6);
      expect(context.emit.getCall(5).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(3);
      resultArray.push(...context.emit.getCall(4).lastArg.body.results);
      expect(resultArray).to.deep.equal(duplicateRecords);
    });

    it('fetchPage sizePage = 100, singlePagePerInterval = true', async () => {
      execRequest = sinon.stub(callJSForceMethod, 'call')
        .onCall(0).returns(duplicateRecords);
      const cfg = {
        sobject: 'Document',
        pageSize: 100,
        linkedObjects: [],
        emitBehavior: 'fetchPage',
        singlePagePerInterval: true,
      };
      const snapshot = {};
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg, snapshot);
      expect(context.emit.callCount).to.be.equal(2);
      expect(context.emit.getCall(1).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(1);
      expect(context.emit.getCall(0).lastArg.body.results).to.deep.equal(duplicateRecords);
      const emitedSnapshot = context.emit.getCall(1).lastArg;
      expect(emitedSnapshot).to.have.property('nextStartTime');
      expect(emitedSnapshot).to.not.have.property('lastElementId');
    });

    it('startTime and endTime', async () => {
      execRequest = sinon.stub(callJSForceMethod, 'call').returns(duplicateRecords);
      const sobject = 'Document';
      const startTime = '2000-01-01T00:00:00.000Z';
      const endTime = '2022-01-01T00:00:00.000Z';
      const cfg = {
        sobject,
        startTime,
        endTime,
        pageSize: 300,
        linkedObjects: [],
        emitBehavior: 'fetchPage',
        singlePagePerInterval: false,
      };
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg);
      expect(execRequest.callCount).to.be.equal(1);
      expect(execRequest.firstCall.args[1]).to.deep.equal(cfg);
      expect(execRequest.firstCall.args[3]).to.deep.equal({
        linkedObjects: [],
        selectedObjects: '*',
        sobject,
        maxFetch: cfg.pageSize,
        whereCondition: `LastModifiedDate >= ${startTime} AND LastModifiedDate < ${endTime}`,
      });
      expect(context.emit.callCount).to.be.equal(2);
    });
  });
});
