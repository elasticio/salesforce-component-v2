const { expect } = require('chai');
const nock = require('nock');
const { globalConsts } = require('../../lib/common.js');
const {
  getContext, fetchToken, defaultCfg, testsCommon,
} = require('../common.js');
const { callJSForceMethod } = require('../../lib/helpers/wrapper');

describe('wrapper helper', () => {
  it('should succeed call describe method', async () => {
    const testCfg = {
      ...defaultCfg,
      sobject: 'Contact',
    };

    fetchToken();
    const describeReq = nock(testsCommon.instanceUrl)
      .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Contact/describe`)
      .reply(200, { name: 'Contact' });

    const result = await callJSForceMethod.call(getContext(), testCfg, 'describe');
    expect(result.name).to.eql('Contact');
    describeReq.done();
  });

  it('should succeed call describe method, credentials from config', async () => {
    const testCfg = {
      sobject: 'Contact',
      oauth: testsCommon.secret.data.attributes.credentials,
    };

    fetchToken();
    const describeReq = nock(testsCommon.instanceUrl)
      .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Contact/describe`)
      .reply(200, { name: 'Contact' });

    const result = await callJSForceMethod.call(getContext(), testCfg, 'describe');
    expect(result.name).to.eql('Contact');
    describeReq.done();
  });

  it('should refresh token and succeed call describe method', async () => {
    const cfg = {
      ...defaultCfg,
      sobject: 'Contact',
    };

    fetchToken();
    const reqWithTokenFailed = nock(testsCommon.instanceUrl)
      .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Contact/describe`)
      .replyWithError({ name: 'INVALID_SESSION_ID' });
    const refreshTokenReq = nock(process.env.ELASTICIO_API_URI)
      .post(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${testsCommon.secretId}/refresh`)
      .reply(200, testsCommon.secret);
    const validDescribeReq = nock(testsCommon.instanceUrl)
      .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Contact/describe`)
      .reply(200, { name: 'Contact' });

    const result = await callJSForceMethod.call(getContext(), cfg, 'describe');
    expect(result.name).to.eql('Contact');
    reqWithTokenFailed.done();
    refreshTokenReq.done();
    validDescribeReq.done();
  });
});
