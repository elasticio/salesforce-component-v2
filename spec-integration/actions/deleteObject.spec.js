/* eslint-disable no-return-assign,no-unused-expressions */
const { expect } = require('chai');
const deleteObject = require('../../lib/actions/deleteObject');
const upsertObject = require('../../lib/actions/upsert_v2');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('Delete Object Integration Functionality', () => {
  it('Delete object by Id my config', async () => {
    const testCfg = {
      oauth: getOauth(),
      sobject: 'Contact',
      lookupField: 'Id',
    };
    const resultUpsert = await upsertObject.process.call(getContext(), { body: { LastName: 'LastName' } }, testCfg);
    const msg = { body: { Id: resultUpsert.body.id } };

    const resultDelete = await deleteObject.process.call(getContext(), msg, testCfg);
    expect(resultDelete.body.response.id).to.be.equal(msg.body.Id);
  });
});
