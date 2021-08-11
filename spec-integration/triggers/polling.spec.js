/* eslint-disable no-return-assign */
const polling = require('../../lib/entry');
const { SALESFORCE_API_VERSION } = require('../../lib/common.js');
const { getContext } = require('../../spec/common');

describe('polling', () => {
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

  it('Account polling with empty snapshot', async () => {
    const testCfg = { ...configuration };
    const msg = { body: {} };
    await polling.process.call(getContext(), msg, testCfg, {});
  });

  it('Account polling with not empty snapshot', async () => {
    const testCfg = { ...configuration };
    const msg = { body: {} };
    const snapshot = '2018-11-12T13:06:01.179Z';

    await polling.process.call(getContext(), msg, testCfg, snapshot);
  });

  it('Account polling with not snapshot.previousLastModified', async () => {
    const testCfg = { ...configuration };
    const msg = { body: {} };
    const snapshot = { previousLastModified: '2018-11-12T13:06:01.179Z' };

    await polling.process.call(getContext(), msg, testCfg, snapshot);
  });
});
