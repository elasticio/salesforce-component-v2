/* eslint-disable no-return-assign */
const fs = require('fs');
const sinon = require('sinon');
const logger = require('@elastic.io/component-logger')();
const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const queryTrigger = require('../../lib/triggers/query');

chai.use(chaiAsPromised);
const { expect } = chai;

describe('queryTrigger', () => {
  let configuration;
  const snapshot = {};
  const message = {};

  before(async () => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }

    configuration = {
      apiVersion: '39.0',
      oauth: {
        undefined_params: {
          instance_url: process.env.INSTANCE_URL,
        },
        refresh_token: process.env.REFRESH_TOKEN,
        access_token: process.env.ACCESS_TOKEN,
      },
    };
  });

  const emitter = {
    emit: sinon.spy(),
    logger,
  };

  it('queryTrigger should succeed with valid query', async () => {
    const query = 'SELECT Id, Name FROM Contact LIMIT 2';
    const outputMethod = 'emitAll';
    const cfg = {
      ...configuration,
      query,
      outputMethod,
    };
    await queryTrigger.process.call(emitter, message, cfg, snapshot);
    expect(emitter.emit.callCount).to.eql(1);
    expect(emitter.emit.args[0][0]).to.eql('data');
    expect(emitter.emit.args[0][1].body.records.length).to.eql(2);
  });

  it('queryTrigger should fail with invalid query', async () => {
    const query = 'SELECT Id FROM Contact123';
    const cfg = {
      ...configuration,
      query,
    };
    await expect(queryTrigger.process.call(emitter, message, cfg, snapshot)).be.rejectedWith('^ ERROR at Row:1:Column:16 '
      + 'sObject type \'Contact123\' is not supported. '
      + 'If you are attempting to use a custom object, be sure to append the \'__c\' after the entity name. '
      + 'Please reference your WSDL or the describe call for the appropriate names.');
  });
});
