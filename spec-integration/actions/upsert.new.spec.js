const { expect } = require('chai');
const action = require('../../lib/actions/upsert');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('upsert action', async () => {
  it('should succeed selectModel objectTypes', async () => {
    const testCfg = { oauth: getOauth(), secretId: process.env.AUTH_SECRET_ID };

    const result = await action.objectTypes.call(getContext(), testCfg);
    expect(result.Contact).to.eql('Contact');
  });

  it('should succeed process sobject=Contact by extId', async () => {
    const testCfg = {
      oauth: getOauth(),
      secretId: process.env.AUTH_SECRET_ID,
      sobject: 'Contact',
      extIdField: 'extID__c',
    };
    const message = {
      body: {
        extID__c: 'watson',
        email: 'watsonExtId@test.com',
        LastName: 'LastName',
      },
    };

    const context = getContext();
    await action.process.call(context, message, testCfg);
    expect(context.emit.callCount).to.eql(1);
    expect(context.emit.args[0][0]).to.eql('data');
    expect(context.emit.args[0][1].body.extID__c).to.eql('watson');
    expect(context.emit.args[0][1].body.Email).to.eql('watsonextid@test.com');
  });
});
