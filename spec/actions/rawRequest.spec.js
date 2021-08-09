/* eslint-disable camelcase */
/* eslint-disable no-return-assign,no-unused-expressions */
const fs = require('fs');
const chai = require('chai');
const nock = require('nock');
const sinon = require('sinon');
const logger = require('@elastic.io/component-logger')();

const { expect } = chai;
const common = require('../../lib/common.js');
const testCommon = require('../common.js');
const processAction = require('../../lib/actions/rawRequest');

const emitter = {
  emit: sinon.spy(),
  logger,
};
if (fs.existsSync('.env')) {
  // eslint-disable-next-line global-require
  require('dotenv').config();
}

describe('Raw request test', () => {
  beforeEach(() => {
    emitter.emit.resetHistory();
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${testCommon.secretId}`)
      .times(4)
      .reply(200, testCommon.secret);
  });
  afterEach(() => {
    nock.cleanAll();
  });

  describe('Should succeed with method GET resource sobjects', () => {
    it('Retrieves the list of queryable sobjects', async () => {
      const scope = nock(testCommon.instanceUrl)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, {
          sobjects: [{
            id: 382766725678,
          }],
        });

      const msg = { body: { method: 'GET', path: 'sobjects' } };
      const cfg = { secretId: testCommon.secretId };

      const result = await processAction.process.call(emitter, msg, cfg);
      expect(result.body).to.have.own.property('sobjects');

      scope.done();
    });
  });

  describe('Should succeed with method POST request create record', () => {
    it('Retrieves the list of limits', async () => {
      const scope = nock(testCommon.instanceUrl)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/limits`)
        .reply(200, {
          ActiveScratchOrgs: [{
            Limit: { description: 'ActiveScratchOrgs' },
          }],
        });

      const msg = { body: { method: 'GET', path: 'limits' } };
      const cfg = { secretId: testCommon.secretId };

      const result = await processAction.process.call(emitter, msg, cfg);
      expect(result.body).to.have.own.property('ActiveScratchOrgs');

      scope.done();
    });
  });

  describe('Should succeed with method GET resource limits', () => {
    it('Retrieves the list of limits', async () => {
      const scope = nock(testCommon.instanceUrl)
        .post(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Account/`)
        .reply(200, {
          id: '3498989438',
          success: true,
          errors: [],
        });

      const msg = { body: { method: 'POST', path: 'sobjects/Account/' } };
      const cfg = { secretId: testCommon.secretId };

      const result = await processAction.process.call(emitter, msg, cfg);
      expect(result.body).to.have.own.property('id');
      expect(result.body.success).to.be.deep.eql(true);

      scope.done();
    });
  });

  describe('Should fail', () => {
    it('Failing', async () => {
      const msg = { body: { method: 'GET', path: 'sobjects' } };
      const cfg = { secretId: testCommon.secretId };

      try {
        await processAction.process.call(emitter, msg, cfg, () => {
          throw new Error('Test case does not expect success response');
        });
      } catch (e) {
        expect(e.message).to.be.contains('Request failed with status code 400');
      }
    });
  });
});
