/* eslint-disable no-return-assign */
const { expect } = require('chai');
const verify = require('../verifyCredentials');
const { SALESFORCE_API_VERSION } = require('../lib/common.js');
const { getContext } = require('../spec/common');

xdescribe('verifyCredentials', async () => {
  let configuration;

  before(async () => {
    configuration = {
      sobject: 'Contact',
      apiVersion: SALESFORCE_API_VERSION,
      oauth: {
        undefined_params: {
          instance_url: process.env.INSTANCE_URL,
        },
        refresh_token: process.env.REFRESH_TOKEN,
        access_token: process.env.ACCESS_TOKEN,
      },
    };
  });

  it('should succeed', async () => {
    const result = await verify.call(getContext(), configuration);
    expect(result.verified).to.eql(true);
  });
});
