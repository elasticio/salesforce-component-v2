/* eslint-disable no-return-assign */
const { expect } = require('chai');
const action = require('../../lib/actions/query');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('query action', async () => {
  it('should succeed query allowResultAsSet', async () => {
    const testCfg = {
      oauth: getOauth(),
      allowResultAsSet: true,
    };
    const msg = {
      body: {
        query: 'SELECT Id, Name FROM Contact limit 10',
      },
    };

    const context = getContext();
    await action.process.call(context, msg, testCfg);
    expect(context.emit.callCount).to.eql(1);
    expect(context.emit.args[0][0]).to.eql('data');
    expect(context.emit.args[0][1].body.result.length).to.eql(10);
  });

  it('should succeed query batchSize', async () => {
    const testCfg = {
      oauth: getOauth(),
      batchSize: 3,
    };
    const msg = {
      body: {
        query: 'SELECT Id, Name FROM Contact limit 10',
      },
    };

    const context = getContext();
    await action.process.call(context, msg, testCfg);
    expect(context.emit.callCount).to.eql(4);
    expect(context.emit.args[0][0]).to.eql('data');
    expect(context.emit.args[0][1].body.result.length).to.eql(3);
  });
});
