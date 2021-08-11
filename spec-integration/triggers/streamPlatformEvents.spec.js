/* eslint-disable no-return-assign */
const { expect } = require('chai');
const trigger = require('../../lib/triggers/streamPlatformEvents');
const { SALESFORCE_API_VERSION } = require('../../lib/common.js');
const { getContext, defaultCfg } = require('../../spec/common');

describe('streamPlatformEvents trigger test', async () => {
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

  it('should succeed selectModel objectTypes', async () => {
    const testCfg = { ...configuration };
    const result = await trigger.objectTypes.call(getContext(), testCfg);
    expect(result).to.eql({
      Test__e: 'Integration Test event',
      UserCreateAcknowledge__e: 'UserCreateAcknowledge',
    });
  });

  xit('should succeed process trigger', async () => {
    const testCfg = { ...configuration, ...defaultCfg };
    const msg = { body: {} };

    const context = getContext();
    await trigger.process.call(context, msg, testCfg);
    expect(context.emit.callCount).to.eql(0);
  });
});
