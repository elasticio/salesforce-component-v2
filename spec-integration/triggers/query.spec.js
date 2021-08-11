/* eslint-disable no-return-assign */
const { expect } = require('chai');
const queryTrigger = require('../../lib/triggers/query');
const { SALESFORCE_API_VERSION } = require('../../lib/common.js');
const { getContext } = require('../../spec/common');

describe('queryTrigger', () => {
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

  it('queryTrigger should succeed with valid query', async () => {
    const query = 'SELECT Id, Name FROM Contact LIMIT 2';
    const outputMethod = 'emitAll';
    const testCfg = {
      ...configuration,
      query,
      outputMethod,
    };
    const msg = { body: {} };

    const context = getContext();
    await queryTrigger.process.call(context, msg, testCfg, {});
    expect(context.emit.callCount).to.eql(1);
    expect(context.emit.args[0][0]).to.eql('data');
    expect(context.emit.args[0][1].body.records.length).to.eql(2);
  });

  it('queryTrigger should fail with invalid query', async () => {
    const query = 'SELECT Id FROM Contact123';
    const testCfg = {
      ...configuration,
      query,
    };
    const msg = { body: {} };

    try {
      await queryTrigger.process.call(getContext(), msg, testCfg, {});
    } catch (err) {
      expect(err.message).to.be.equal(
        'INVALID_TYPE: ^ ERROR at Row:1:Column:16 sObject type \'Contact123\' is not supported. '
      + 'If you are attempting to use a custom object, be sure to append the \'__c\' after the entity name. '
      + 'Please reference your WSDL or the describe call for the appropriate names.',
      );
    }
  });
});
