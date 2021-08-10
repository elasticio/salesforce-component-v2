/* eslint-disable no-return-assign,no-unused-expressions */
const sinon = require('sinon');
const { expect } = require('chai');
const logger = require('@elastic.io/component-logger')();
const { SALESFORCE_API_VERSION } = require('../../lib/common.js');
const deleteObject = require('../../lib/actions/deleteObject');
const upsertObject = require('../../lib/actions/upsert');
const { getContext } = require('../../spec/common');

describe('Delete Object Integration Functionality', () => {
  let emitter;
  let testObjLst;
  let configuration;

  before(async () => {
    emitter = {
      emit: sinon.spy(),
      logger,
    };
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

  beforeEach(() => {
    emitter.emit.resetHistory();
  });

  it('Delete object by Id my config', async () => {
    const testCfg = {
      ...configuration,
      lookupField: 'Id',
    };
    const msg = {
      body: {
        Id: '0032R00002AHsqLQAT',
      },
    };
    const context = getContext();
    const resultUpsert = await upsertObject.process.call(context, { body: {} }, testCfg);
    console.log(resultUpsert);
    const result = await deleteObject.process.call(context, msg, testCfg);
    console.log(result.body);
    expect(result.body.id).to.be.eq('id');
  });

  xit('Correctly identifies a lack of response on a non-existent Contact', async () => {
    await deleteObject.process.call(emitter, testObjLst[0].message, testObjLst[0].config);
    expect(emitter.emit.args[2][1].body).to.be.empty;
  });

  xit('Correctly deletes an existent Contact', async () => {
    const testObj = await deleteObject.process.call(
      emitter, testObjLst[1].message, testObjLst[1].config,
    );
    expect(emitter.emit.args[2][1].body).to.be.deep.equal(testObj.response);
  });

  xit('Correctly identifies when more than one object is found and throws', async () => {
    await deleteObject.process.call(emitter, testObjLst[2].message, testObjLst[2].config);
    expect(emitter.emit.args[2][1]).to.be.instanceOf(Error);
  });

  xit('Correctly deletes based on different criteria: allFields ( Date/Time )', async () => {
    const testObj = await deleteObject.process.call(
      emitter, testObjLst[3].message, testObjLst[3].config,
    );
    expect(emitter.emit.args[2][1].body).to.be.deep.equal(testObj.response);
  });
});
