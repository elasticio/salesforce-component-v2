const { expect } = require('chai');
const upsert = require('../../lib/actions/upsert');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('upsert', () => {
  it('upsert Contact by Id ', async () => {
    const testCfg = {
      oauth: getOauth(),
      prodEnv: 'login',
      sobject: 'Contact',
      _account: '5be195b7c99b61001068e1d0',
      lookupField: 'AccountId',
    };
    const msg = {
      body: {
        Id: '00344000020qT3KAAU',
        MobilePhone: '+3805077777',
        extID__c: '777777777777',
      },
    };

    const context = getContext();
    await upsert.process.call(context, msg, testCfg);
    expect(context.emit.getCall(0).args[1].body.Id).to.be.equal(msg.body.Id);
    expect(context.emit.getCall(0).args[1].body.MobilePhone).to.be.equal(msg.body.MobilePhone);
    expect(context.emit.getCall(0).args[1].body.extID__c).to.be.equal(msg.body.extID__c);
  });

  it('upsert Contact by ExternalId ', async () => {
    const testCfg = {
      oauth: getOauth(),
      prodEnv: 'login',
      sobject: 'Contact',
      _account: '5be195b7c99b61001068e1d0',
      lookupField: 'AccountId',
      extIdField: 'extID__c',
    };
    const msg = {
      body: {
        MobilePhone: '+38050888888',
        extID__c: '777777777777',
      },
    };

    const context = getContext();
    await upsert.process.call(context, msg, testCfg);
    expect(context.emit.getCall(0).args[1].body.MobilePhone).to.be.equal(msg.body.MobilePhone);
    expect(context.emit.getCall(0).args[1].body.extID__c).to.be.equal(msg.body.extID__c);
  });
});
