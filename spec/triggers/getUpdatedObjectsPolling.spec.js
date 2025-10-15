/* eslint-disable newline-per-chained-call, no-undef */
const { expect } = require('chai');
const sinon = require('sinon');
const { getContext } = require('../common');
const { callJSForceMethod } = require('../../lib/helpers/wrapper');
const { process } = require('../../lib/triggers/getUpdatedObjectsPolling');
const duplicateRecords = require('../testData/trigger.results.1612.json');

describe('getUpdatedObjectsPolling trigger', () => {
  let execRequest;

  beforeEach(() => {
    execRequest = sinon.stub(callJSForceMethod, 'call');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should handle multiple pages of records with the same timestamp without data loss', async () => {
    const sameTimestamp = '2025-10-08T10:00:00.000Z';
    const records = [
      { Id: '001a', Name: 'Record 1', LastModifiedDate: sameTimestamp },
      { Id: '001b', Name: 'Record 2', LastModifiedDate: sameTimestamp },
      { Id: '001c', Name: 'Record 3', LastModifiedDate: sameTimestamp },
      { Id: '001d', Name: 'Record 4', LastModifiedDate: sameTimestamp },
      { Id: '001e', Name: 'Record 5', LastModifiedDate: sameTimestamp },
    ];
    const whereConditions = [];

    // Mock the initial COUNT query
    execRequest.onCall(0).returns({ totalSize: 5 });

    execRequest.callsFake((...args) => {
      // Skip the COUNT query call
      if (execRequest.callCount > 1) {
        whereConditions.push(args[3].whereCondition);
      }
      // Return data for polling calls
      if (execRequest.callCount === 1) return { totalSize: 5 }; // COUNT call
      if (execRequest.callCount === 2) return [records[0], records[1]];
      if (execRequest.callCount === 3) return [records[2], records[3]];
      if (execRequest.callCount === 4) return [records[4]];
      return [];
    });

    const cfg = {
      sobject: 'Document',
      pageSize: 2,
      emitBehavior: 'emitIndividually',
      singlePagePerInterval: false,
    };
    const context = getContext();
    await process.call(context, {}, cfg, {});

    // 1 for COUNT, 3 for data
    expect(execRequest.callCount).to.be.equal(4);
    // 5 data emits, 1 snapshot emit
    expect(context.emit.callCount).to.be.equal(6);

    expect(whereConditions[0]).to.include('LastModifiedDate >= 1970-01-01T00:00:00.000Z');
    expect(whereConditions[1]).to.include(`(LastModifiedDate = ${sameTimestamp} AND Id > '${records[1].Id}')`);
    expect(whereConditions[2]).to.include(`(LastModifiedDate = ${sameTimestamp} AND Id > '${records[3].Id}')`);

    // Check final snapshot
    expect(context.emit.getCall(5).args[0]).to.equal('snapshot');
    expect(context.emit.getCall(5).args[1]).to.deep.equal({
      lastModificationTime: sameTimestamp,
      lastSeenId: '001e',
    });
  });

  it('should handle backward compatibility with old snapshot format', async () => {
    execRequest.onCall(0).returns({ totalSize: 1 });
    execRequest.onCall(1).returns([duplicateRecords[0]]);
    const cfg = { sobject: 'Document' };
    const oldSnapshot = { nextStartTime: '2022-07-01T00:00:00.000Z' };
    const context = getContext();

    await process.call(context, {}, cfg, oldSnapshot);

    const whereClause = execRequest.getCall(1).args[3].whereCondition;
    expect(whereClause).to.include('LastModifiedDate >= 2022-07-01T00:00:00.000Z');

    expect(context.emit.lastCall.args[0]).to.equal('snapshot');
    expect(context.emit.lastCall.args[1]).to.deep.equal({
      lastModificationTime: duplicateRecords[0].LastModifiedDate,
      lastSeenId: duplicateRecords[0].Id,
    });
  });

  it('should emit individually and create correct snapshot', async () => {
    execRequest.onFirstCall().returns({ totalSize: duplicateRecords.length });
    execRequest.onSecondCall().returns(duplicateRecords);

    const cfg = {
      sobject: 'Document',
      pageSize: 100,
      emitBehavior: 'emitIndividually',
    };
    const context = getContext();
    await process.call(context, {}, cfg, {});

    expect(execRequest.callCount).to.be.equal(2);
    expect(context.emit.callCount).to.be.equal(duplicateRecords.length + 1);
    expect(context.emit.getCall(0).args[0]).to.equal('data');
    expect(context.emit.lastCall.args[0]).to.equal('snapshot');
    expect(context.emit.lastCall.args[1]).to.deep.equal({
      lastModificationTime: duplicateRecords[duplicateRecords.length - 1].LastModifiedDate,
      lastSeenId: duplicateRecords[duplicateRecords.length - 1].Id,
    });
  });

  it('should work with singlePagePerInterval', async () => {
    execRequest.onCall(0).returns({ totalSize: 8 });
    execRequest.onCall(1).returns(duplicateRecords.slice(0, 5));
    execRequest.onCall(2).returns({ totalSize: 3 });
    execRequest.onCall(3).returns(duplicateRecords.slice(5, 8));

    const cfg = {
      sobject: 'Document',
      pageSize: 5,
      emitBehavior: 'emitIndividually',
      singlePagePerInterval: true,
    };
    const context = getContext();

    // First run
    await process.call(context, {}, cfg, {});
    expect(execRequest.callCount).to.be.equal(2); // 1 for count, 1 for data
    expect(context.emit.callCount).to.be.equal(6); // 5 data, 1 snapshot
    const snapshot = context.emit.lastCall.args[1];
    expect(snapshot).to.deep.equal({
      lastModificationTime: duplicateRecords[4].LastModifiedDate,
      lastSeenId: duplicateRecords[4].Id,
    });

    // Second run
    await process.call(context, {}, cfg, snapshot);
    expect(execRequest.callCount).to.be.equal(4); // 2 from previous run, 1 for count, 1 for data
    expect(context.emit.callCount).to.be.equal(10); // 5 + 3 data, 2 snapshots total
    const finalSnapshot = context.emit.lastCall.args[1];
    expect(finalSnapshot).to.deep.equal({
      lastModificationTime: duplicateRecords[7].LastModifiedDate,
      lastSeenId: duplicateRecords[7].Id,
    });
  });

  describe('validation', () => {
    it('should throw an error for pageSize 0', async () => {
      const cfg = { pageSize: 0, sobject: 'Document' };
      const context = getContext();
      try {
        await process.call(context, {}, cfg, {});
        throw new Error('Test failed: Error was not thrown');
      } catch (e) {
        expect(e.message).to.include('"Size of Polling Page" must be valid number between 1 and 10000');
      }
    });

    it('should throw an error for pageSize "0"', async () => {
      const cfg = { pageSize: '0', sobject: 'Document' };
      const context = getContext();
      try {
        await process.call(context, {}, cfg, {});
        throw new Error('Test failed: Error was not thrown');
      } catch (e) {
        expect(e.message).to.include('"Size of Polling Page" must be valid number between 1 and 10000');
      }
    });

    it('should throw an error for negative pageSize', async () => {
      const cfg = { pageSize: -1, sobject: 'Document' };
      const context = getContext();
      try {
        await process.call(context, {}, cfg, {});
        throw new Error('Test failed: Error was not thrown');
      } catch (e) {
        expect(e.message).to.include('"Size of Polling Page" must be valid number between 1 and 10000');
      }
    });

    it('should throw an error for pageSize > MAX_FETCH', async () => {
      const cfg = { pageSize: 10001, sobject: 'Document' };
      const context = getContext();
      try {
        await process.call(context, {}, cfg, {});
        throw new Error('Test failed: Error was not thrown');
      } catch (e) {
        expect(e.message).to.include('"Size of Polling Page" must be valid number between 1 and 10000');
      }
    });

    it('should throw an error for non-numeric pageSize', async () => {
      const cfg = { pageSize: 'abc', sobject: 'Document' };
      const context = getContext();
      try {
        await process.call(context, {}, cfg, {});
        throw new Error('Test failed: Error was not thrown');
      } catch (e) {
        expect(e.message).to.include('"Size of Polling Page" must be valid number between 1 and 10000');
      }
    });
  });
});
