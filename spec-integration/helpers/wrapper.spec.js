/* eslint-disable no-return-assign */
const { expect } = require('chai');
const nock = require('nock');
const { callJSForceMethod } = require('../../lib/helpers/wrapper');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('wrapper helper test', async () => {
  let invalidSecret;
  before(async () => {
    invalidSecret = {
      data: {
        attributes: {
          credentials: {
            access_token: 'access_token',
            instance_url: process.env.INSTANCE_URL,
          },
        },
      },
    };
  });

  it('should succeed call describe method, credentials from config', async () => {
    const testCfg = {
      oauth: getOauth(),
      sobject: 'Contact',
    };

    const result = await callJSForceMethod.call(getContext(), testCfg, 'describe');
    expect(result.name).to.eql('Contact');
  });

  it('should succeed call describe method', async () => {
    const testCfg = {
      oauth: getOauth(),
      sobject: 'Contact',
    };

    const result = await callJSForceMethod.call(getContext(), testCfg, 'describe');
    expect(result.name).to.eql('Contact');
  });

  it('should refresh token and succeed call describe method', async () => {
    const testCfg = {
      oauth: getOauth(),
      sobject: 'Contact',
    };

    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${testsCommon.secretId}`)
      .reply(200, invalidSecret);
    const result = await callJSForceMethod.call(getContext(), testCfg, 'describe');
    expect(result.name).to.eql('Contact');
  });
});
