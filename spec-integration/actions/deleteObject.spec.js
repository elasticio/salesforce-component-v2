/* eslint-disable no-return-assign,no-unused-expressions */
const { expect } = require('chai');
const { SALESFORCE_API_VERSION } = require('../../lib/common.js');
const deleteObject = require('../../lib/actions/deleteObject');
const upsertObject = require('../../lib/actions/upsert_v2');
const { getContext } = require('../../spec/common');

describe('Delete Object Integration Functionality', () => {
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

  it('Delete object by Id my config', async () => {
    const testCfg = {
      ...configuration,
      lookupField: 'Id',
    };
    const resultUpsert = await upsertObject.process.call(getContext(), { body: { LastName: 'LastName' } }, testCfg);
    const msg = { body: { Id: resultUpsert.body.id } };

    const resultDelete = await deleteObject.process.call(getContext(), msg, testCfg);
    expect(resultDelete.body.response.id).to.be.equal(msg.body.Id);
  });
});
