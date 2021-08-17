const { expect } = require('chai');
const nock = require('nock');
const { getSecret, refreshToken } = require('../lib/util');
const { fetchToken, testsCommon, getContext } = require('./common.js');

describe('util test', () => {
  afterEach(() => {
    nock.cleanAll();
  });
  it('should getSecret', async () => {
    fetchToken();

    const result = await getSecret(getContext(), testsCommon.secretId);
    expect(result).to.eql(testsCommon.secret.data.attributes);
  });

  it('should refreshToken', async () => {
    const refreshTokenReq = nock(process.env.ELASTICIO_API_URI)
      .post(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${testsCommon.secretId}/refresh`)
      .reply(200, testsCommon.secret);

    const result = await refreshToken(getContext(), testsCommon.secretId);
    expect(result).to.eql(testsCommon.secret.data.attributes.credentials.access_token);
    refreshTokenReq.done();
  });

  it('should refreshToken fail', async () => {
    const retryFlow = nock(process.env.ELASTICIO_API_URI)
      .post(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${testsCommon.secretId}/refresh`)
      .times(3)
      .reply(500, {})
      .post(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${testsCommon.secretId}/refresh`)
      .reply(200, testsCommon.secret);

    const result = await refreshToken(getContext(), testsCommon.secretId);
    expect(result).to.eql(testsCommon.secret.data.attributes.credentials.access_token);
    retryFlow.done();
  });
});
