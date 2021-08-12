const { expect } = require('chai');
const { callJSForceMethod } = require('../../lib/helpers/wrapper');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('wrapper helper test', async () => {
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
});
