/* eslint-disable no-return-assign */
process.env.ELASTICIO_FLOW_TYPE = 'debug';
const { expect } = require('chai');
const polling = require('../../lib/triggers/getUpdatedObjectsPolling');
const { getContext, testsCommon } = require('../../spec/common');
const enrtyMetaModel = require('../../spec/triggers/outMetadataSchemas/entryObjectTypes.json');

const { getOauth } = testsCommon;

describe('polling', () => {
  it('Account polling with empty snapshot', async () => {
    const testCfg = {
      oauth: getOauth(),
      sobject: 'Contact',
      emitBehavior: 'fetchPage',
      pageSize: 500,
      singlePagePerInterval: true,
    };
    const snapshot = {
      lastElementId: '0032R00002La0YtQAJ',
    };
    const msg = { body: {} };
    const context = getContext();
    await polling.process.call(context, msg, testCfg, snapshot);
    expect(context).to.deep.equal(enrtyMetaModel);
  });

  it('Account polling with not empty snapshot', async () => {
    const testCfg = { oauth: getOauth(), sobject: 'Contact' };
    const msg = { body: {} };
    const snapshot = '2018-11-12T13:06:01.179Z';

    await polling.process.call(getContext(), msg, testCfg, snapshot);
  });

  it('Account polling with not snapshot.previousLastModified', async () => {
    const testCfg = { oauth: getOauth(), sobject: 'Contact' };
    const msg = { body: {} };
    const snapshot = { previousLastModified: '2018-11-12T13:06:01.179Z' };

    await polling.process.call(getContext(), msg, testCfg, snapshot);
  });

  it('Custom Object 300+ custom fields polling', async () => {
    const testCfg = {
      oauth: getOauth(),
      sobject: 'TestBook__c',
      emitBehavior: 'fetchPage',
      pageSize: 10,
      linkedObjects: ['CreatedBy'],
      selectedFields: ['Book_Description__c', 'Test_Book_Custom_Field_1__c'],
    };
    const snapshot = {};
    const msg = { body: {} };
    const context = getContext();
    await polling.process.call(context, msg, testCfg, snapshot);
    expect(context.emit.firstCall.args[0]).to.deep.equal('data');
    expect(context.emit.firstCall.args[1].body.results[0].Book_Description__c).to.deep.equal('First book');
  });

  it('Get metadata', async () => {
    const testCfg = {
      oauth: getOauth(),
      sobject: 'Contact',
      outputMethod: 'emitAll',
      selectedFields: ['Id', 'LastName'],
    };

    const result = await polling.getMetaModel.call(getContext(), testCfg);
    expect(result).to.be.equal(true);
  });

  it('Get object Fields', async () => {
    const testCfg = { oauth: getOauth(), sobject: 'TestBook__c' };

    const result = await polling.getObjectFields.call(getContext(), testCfg);
    expect(result.Id).to.be.equal('Record ID');
  });

  it('Get linkedObjectTypes', async () => {
    const testCfg = { oauth: getOauth(), sobject: 'TestBook__c' };

    const result = await polling.linkedObjectTypes.call(getContext(), testCfg);
    expect(result.CreatedBy).to.be.equal('User (CreatedBy)');
  });
});
