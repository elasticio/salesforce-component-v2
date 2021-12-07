const { expect } = require('chai');
const bulk = require('../../lib/actions/bulk_cud');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('bulk upsert', () => {
  it('upsert Contact by ExternalId ', async () => {
    const testCfg = {
      oauth: getOauth(),
      prodEnv: 'login',
      sobject: 'Contact',
      _account: '5be195b7c99b61001068e1d0',
      lookupField: 'AccountId',
      extIdField: 'extID__c',
      operation: 'upsert',
    };
    const msg = {
      body: {
        MobilePhone: '+38050888888',
        extID__c: '777777777777',
      },
    };

    const context = getContext();
    await bulk.process.call(context, msg, testCfg);
    expect(context.emit.getCall(0).args[1].body.MobilePhone).to.be.equal(msg.body.MobilePhone);
    expect(context.emit.getCall(0).args[1].body.extID__c).to.be.equal(msg.body.extID__c);
  });
});
