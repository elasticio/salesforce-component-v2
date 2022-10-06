/* eslint-disable no-return-assign */
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

  it('Get metadata', async () => {
    const testCfg = { oauth: getOauth(), sobject: 'Contact', outputMethod: 'emitAll' };

    const result = await polling.getMetaModel.call(getContext(), testCfg);
    expect(result).to.be.equal(true);
  });
});
