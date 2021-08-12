/* eslint-disable no-return-assign */
const { expect } = require('chai');
const verify = require('../verifyCredentials');
const { getContext, testsCommon } = require('../spec/common');

const { getOauth } = testsCommon;

describe('verifyCredentials', async () => {
  it('should succeed', async () => {
    const testCfg = {
      oauth: getOauth(),
      sobject: 'Contact',
    };

    const result = await verify.call(getContext(), testCfg);
    expect(result.verified).to.eql(true);
  });
});
