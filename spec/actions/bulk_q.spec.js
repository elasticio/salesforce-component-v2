/* eslint-disable guard-for-in,no-restricted-syntax */
const { expect } = require('chai');
const nock = require('nock');

const {
  getContext, fetchToken, defaultCfg, testsCommon,
} = require('../common.js');
const { message, responses } = require('../testData/bulk_q.json');
const bulk = require('../../lib/actions/bulk_q.js');

describe('Salesforce bulk query', () => {
  it('action query', async () => {
    const testCfg = {
      ...defaultCfg,
    };
    const msg = { ...message };
    const expectedResult = { 'bulk_query.csv': { 'content-type': 'text/csv', url: testsCommon.EXT_FILE_STORAGE } };

    fetchToken();
    const requests = [];
    for (const host in responses) {
      for (const path in responses[host]) {
        requests.push(nock(host)
          .intercept(path, responses[host][path].method)
          .reply(200, responses[host][path].response, responses[host][path].header));
      }
    }

    const result = await bulk.process.call(getContext(), msg, testCfg);
    expect(result.attachments).to.deep.equal(expectedResult);
    for (let i = 0; i < requests.length; i += 1) requests[i].done();
  });
});
