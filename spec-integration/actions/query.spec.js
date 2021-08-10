/* eslint-disable no-return-assign */
const { expect } = require('chai');
const action = require('../../lib/actions/query');
const { getContext } = require('../../spec/common');
const { SALESFORCE_API_VERSION } = require('../../lib/common.js');

let configuration;
describe('query action', async () => {
  before(() => {
    configuration = {
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
  const msg = {
    body: {
      query: 'SELECT Id, Name FROM Contact limit 10',
    },
  };

  it('should succeed query allowResultAsSet', async () => {
    const testCfg = {
      ...configuration,
      allowResultAsSet: true,
    };
    const context = getContext();
    await action.process.call(context, msg, testCfg);
    expect(context.emit.callCount).to.eql(1);
    expect(context.emit.args[0][0]).to.eql('data');
    expect(context.emit.args[0][1].body.result.length).to.eql(10);
  });

  it('should succeed query batchSize', async () => {
    const testCfg = {
      ...configuration,
      batchSize: 3,
    };
    const context = getContext();
    await action.process.call(context, msg, testCfg);
    expect(context.emit.callCount).to.eql(4);
    expect(context.emit.args[0][0]).to.eql('data');
    expect(context.emit.args[0][1].body.result.length).to.eql(3);
  });
});
