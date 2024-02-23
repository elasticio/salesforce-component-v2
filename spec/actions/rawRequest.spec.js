/* eslint-disable no-return-assign, no-unused-expressions, camelcase */
const { expect } = require('chai');
const nock = require('nock');

const { globalConsts } = require('../../lib/common.js');
const {
  getContext, fetchToken, defaultCfg, testsCommon,
} = require('../common.js');
const processAction = require('../../lib/actions/rawRequest');

describe('Raw request test', () => {
  describe('Should succeed with method GET, relative URL, resource sobjects', () => {
    it('Retrieves the list of queryable sobjects', async () => {
      const testCfg = { ...defaultCfg };
      const msg = { body: { method: 'GET', path: 'sobjects' } };

      fetchToken();
      const scope = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, {
          sobjects: [{
            id: 382766725678,
          }],
        });

      const result = await processAction.process.call(getContext(), msg, testCfg);
      expect(result.body).to.have.own.property('sobjects');
      scope.done();
    });
  });

  describe('Should succeed with method GET, absolute URL, resource apexrest', () => {
    it('Retrieves the list of queryable sobjects', async () => {
      const testCfg = { ...defaultCfg };
      const msg = {
        body: {
          method: 'POST',
          path: `${testsCommon.instanceUrl}/services/apexrest/echoRequest`,
          body: {
            text: 'fool',
          },
        },
      };

      fetchToken();
      const scope = nock(testsCommon.instanceUrl)
        .post('/services/apexrest/echoRequest')
        .reply(200, 'No, you are fool');
      const result = await processAction.process.call(getContext(), msg, testCfg);
      expect(result.body).to.have.eql('No, you are fool');
      scope.done();
    });
  });

  describe('Should succeed with method POST request create record', () => {
    it('Retrieves the list of limits', async () => {
      const testCfg = { ...defaultCfg };
      const msg = { body: { method: 'GET', path: 'limits' } };

      fetchToken();
      const scope = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/limits`)
        .reply(200, {
          ActiveScratchOrgs: [{
            Limit: { description: 'ActiveScratchOrgs' },
          }],
        });

      const result = await processAction.process.call(getContext(), msg, testCfg);
      expect(result.body).to.have.own.property('ActiveScratchOrgs');
      scope.done();
    });
  });

  describe('Should succeed with method GET resource limits', () => {
    it('Retrieves the list of limits', async () => {
      const testCfg = { ...defaultCfg };
      const msg = { body: { method: 'POST', path: 'sobjects/Account' } };

      fetchToken();
      const scope = nock(testsCommon.instanceUrl)
        .post(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Account`)
        .reply(200, {
          id: '3498989438',
          success: true,
          errors: [],
        });

      const result = await processAction.process.call(getContext(), msg, testCfg);
      expect(result.body).to.have.own.property('id');
      expect(result.body.success).to.be.deep.eql(true);
      scope.done();
    });
  });

  describe('Should fail', () => {
    it('Failing', async () => {
      const testCfg = { ...defaultCfg };
      const msg = { body: { method: 'GET', path: 'sobjects' } };

      fetchToken();
      const scope = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .replyWithError('Request failed with status code 400');

      try {
        await processAction.process.call(getContext(), msg, testCfg);
      } catch (e) {
        expect(e.message).to.be.contains('Request failed with status code 400');
      }
      scope.done();
    });
  });
});
