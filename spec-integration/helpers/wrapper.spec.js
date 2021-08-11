/* eslint-disable no-return-assign */
const { expect } = require('chai');
const nock = require('nock');
const { callJSForceMethod } = require('../../lib/helpers/wrapper');
const { SALESFORCE_API_VERSION } = require('../../lib/common.js');
const { getContext } = require('../../spec/common');

describe('wrapper helper test', async () => {
  const secretId = 'secretId';
  let configuration;
  let invalidSecret;

  before(async () => {
    configuration = {
      apiVersion: SALESFORCE_API_VERSION,
      oauth: {
        undefined_params: {
          instance_url: process.env.INSTANCE_URL,
        },
        refresh_token: process.env.REFRESH_TOKEN,
        access_token: process.env.ACCESS_TOKEN,
      },
      sobject: 'Contact',
    };
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
    const result = await callJSForceMethod.call(getContext(), configuration, 'describe');
    expect(result.name).to.eql('Contact');
  });

  it('should succeed call describe method', async () => {
    const result = await callJSForceMethod.call(getContext(), configuration, 'describe');
    expect(result.name).to.eql('Contact');
  });

  it('should refresh token and succeed call describe method', async () => {
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .reply(200, invalidSecret);
    const result = await callJSForceMethod.call(getContext(), configuration, 'describe');
    expect(result.name).to.eql('Contact');
  });
});
