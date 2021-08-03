/* eslint-disable guard-for-in,no-restricted-syntax */
const { expect } = require('chai');
const nock = require('nock');

const {
  getContext, fetchToken, defaultCfg,
} = require('../common.js');
const testData = require('../testData/bulk_cud.json');
const bulk = require('../../lib/actions/bulk_cud.js');

describe('Salesforce bulk', () => {
  it('action create', async () => {
    const testApproach = testData.bulkInsertCase;
    const testCfg = {
      ...defaultCfg,
      ...testApproach.configuration,
    };
    const msg = { ...testApproach.message };
    const expectedResult = {
      result: [
        { id: '5002o00002E8FIIAA3', success: true, errors: [] },
        { id: '5002o00002E8FIJAA3', success: true, errors: [] },
        { id: '5002o00002E8FIKAA3', success: true, errors: [] },
      ],
    };

    fetchToken();
    const requests = [];
    for (const host in testApproach.responses) {
      for (const path in testApproach.responses[host]) {
        requests.push(nock(host)
          .intercept(path, testApproach.responses[host][path].method)
          .reply(200, testApproach.responses[host][path].response, testApproach.responses[host][path].header));
      }
    }

    const result = await bulk.process.call(getContext(), msg, testCfg);
    expect(result.body).to.deep.equal(expectedResult);
    for (let i = 0; i < requests.length; i += 1) requests[i].done();
  });

  it('action update', async () => {
    const testApproach = testData.bulkUpdateCase;
    const testCfg = {
      ...defaultCfg,
      ...testApproach.configuration,
    };
    const msg = { ...testApproach.message };
    const expectedResult = { result: [{ id: null, success: false, errors: ['ENTITY_IS_DELETED:entity is deleted:--'] }] };

    fetchToken();
    const requests = [];
    for (const host in testApproach.responses) {
      for (const path in testApproach.responses[host]) {
        requests.push(nock(host)
          .intercept(path, testApproach.responses[host][path].method)
          .reply(200, testApproach.responses[host][path].response, testApproach.responses[host][path].header));
      }
    }

    const result = await bulk.process.call(getContext(), msg, testCfg);
    expect(result.body).to.deep.equal(expectedResult);
    for (let i = 0; i < requests.length; i += 1) requests[i].done();
  });

  it('action delete', async () => {
    const testApproach = testData.bulkDeleteCase;
    const testCfg = {
      ...defaultCfg,
      ...testApproach.configuration,
    };
    const msg = { ...testApproach.message };
    const expectedResult = { result: [{ id: '5002o00002BT0IUAA1', success: true, errors: [] }] };

    fetchToken();
    const requests = [];
    for (const host in testApproach.responses) {
      for (const path in testApproach.responses[host]) {
        requests.push(nock(host)
          .intercept(path, testApproach.responses[host][path].method)
          .reply(200, testApproach.responses[host][path].response, testApproach.responses[host][path].header));
      }
    }

    const result = await bulk.process.call(getContext(), msg, testCfg);
    expect(result.body).to.deep.equal(expectedResult);
    for (let i = 0; i < requests.length; i += 1) requests[i].done();
  });
});
