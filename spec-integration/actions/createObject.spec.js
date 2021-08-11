const { expect } = require('chai');
const action = require('../../lib/actions/createObject');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('create object action', async () => {
  it('should succeed selectModel objectTypes', async () => {
    const testCfg = { oauth: getOauth(), secretId: process.env.AUTH_SECRET_ID };

    const result = await action.objectTypes.call(getContext(), testCfg);
    expect(result.Contact).to.eql('Contact');
  });

  it('should succeed process create sobject=Contact', async () => {
    const testCfg = {
      oauth: getOauth(),
      secretId: process.env.AUTH_SECRET_ID,
      sobject: 'Contact',
    };
    const msg = {
      body: {
        LastName: 'IntegrationTest',
      },
    };

    const result = await action.process.call(getContext(), msg, testCfg);
    expect(result.body.LastName).to.eql('IntegrationTest');
    expect(Object.prototype.hasOwnProperty.call(result.body, 'id')).to.eql(true);
  });
});
