/* eslint-disable newline-per-chained-call */
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
        pageSize: 10,
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
        pageSize: 10,
        linkedObjects: [],
        selectedFields: ['Id', 'Name'],
        emitBehavior: 'emitIndividually',
        singlePagePerInterval: false,
      };
      const snapshot = {};
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg, snapshot);
      expect(execRequest.firstCall.args[3].selectedObjects).to.be.equal('Id,Name');
      expect(context.emit.callCount).to.be.equal(28);
      expect(context.emit.getCall(27).firstArg).to.be.equal('snapshot');
      expect(execRequest.callCount).to.be.equal(1);
      expect(context.emit.getCall(0).lastArg.body).to.deep.equal(duplicateRecords[0]);
    });

    it('fetchPage sizePage = 10, singlePagePerInterval = false', async () => {
      execRequest = sinon.stub(callJSForceMethod, 'call').returns(duplicateRecords);
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
      expect(execRequest.callCount).to.be.equal(1);
      const resultArray = context.emit.getCall(0).lastArg.body.results;
      resultArray.push(...context.emit.getCall(1).lastArg.body.results);
      resultArray.push(...context.emit.getCall(2).lastArg.body.results);
      expect(resultArray).to.deep.equal(duplicateRecords);
    });

    it('fetchPage sizePage = 10, singlePagePerInterval = true', async () => {
      execRequest = sinon.stub(callJSForceMethod, 'call')
        .onCall(0).returns(duplicateRecords)
        .onCall(1).returns(duplicateRecords.slice(8))
        .onCall(2).returns(duplicateRecords.slice(19));
      const cfg = {
        sobject: 'Document',
        pageSize: 10,
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
      expect(context.emit.getCall(0).lastArg.body.results).to.deep.equal(duplicateRecords.slice(0, 10));
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
        whereCondition: `LastModifiedDate >= ${startTime} AND LastModifiedDate < ${endTime}`,
      });
      expect(context.emit.callCount).to.be.equal(2);
    });

    it('fetchPage sizePage = 10 000, singlePagePerInterval = false with duplicate', async () => {
      const lastModifiedDate = '2050-01-01T10:00:00.000+0000';
      const records10000 = [];
      for (let i = 0; i < 371; i++) {
        if (i !== 370) records10000.push(...duplicateRecords);
        else {
          for (let j = 0; j < 10; j++) {
            records10000.push({
              Id: `0032R00002La0hgQAB${j}`,
              LastModifiedDate: lastModifiedDate,
              name: `lastObject${j}`,
            });
          }
        }
      }
      execRequest = sinon.stub(callJSForceMethod, 'call').returns(records10000);
      const cfg = {
        sobject: 'Document',
        pageSize: 9990,
        linkedObjects: [],
        emitBehavior: 'fetchPage',
        singlePagePerInterval: false,
      };
      const snapshot = {};
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg, snapshot);
      expect(context.emit.callCount).to.be.equal(3);
      expect(context.emit.getCall(0).firstArg).to.be.equal('data');
      expect(context.emit.getCall(0).lastArg.body.results.length).to.be.equal(9990);
      expect(context.emit.getCall(1).firstArg).to.be.equal('snapshot');
      expect(context.emit.getCall(1).lastArg).to.deep.equal({
        nextStartTime: lastModifiedDate,
      });
      expect(context.emit.getCall(2).firstArg).to.be.equal('end');
      expect(execRequest.callCount).to.be.equal(1);
    });

    it('fetchPage sizePage = 10 000, singlePagePerInterval = false without duplicate', async () => {
      const records10000 = [];
      for (let i = 0; i < 371; i++) {
        if (i !== 370) records10000.push(...duplicateRecords);
        else {
          for (let j = 0; j < 10; j++) {
            records10000.push({
              Id: `0032R00002La0hgQAB${j}`,
              LastModifiedDate: `2050-01-01T10:00:0${j}.000+0000`,
              name: `lastObject${j}`,
            });
          }
        }
      }
      execRequest = sinon.stub(callJSForceMethod, 'call').returns(records10000);
      const cfg = {
        sobject: 'Document',
        linkedObjects: [],
        emitBehavior: 'fetchPage',
        singlePagePerInterval: false,
      };
      const snapshot = {};
      const msg = {};
      const context = getContext();
      await process.call(context, msg, cfg, snapshot);
      expect(context.emit.callCount).to.be.equal(2);
      expect(context.emit.getCall(0).firstArg).to.be.equal('data');
      expect(context.emit.getCall(0).lastArg.body.results.length).to.be.equal(9999);
      expect(context.emit.getCall(1).firstArg).to.be.equal('snapshot');
      expect(context.emit.getCall(1).lastArg).to.deep.equal({
        nextStartTime: '2050-01-01T10:00:09.000+0000',
      });
      expect(execRequest.callCount).to.be.equal(1);
    });
  });
});
