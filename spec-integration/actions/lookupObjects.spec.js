/* eslint-disable no-return-assign */
const fs = require('fs');
const { expect } = require('chai');
const { SALESFORCE_API_VERSION } = require('../../lib/common.js');
const lookupObjects = require('../../lib/actions/lookupObjects');
const { getContext } = require('../../spec/common');

let configuration;

describe('lookupObjects', () => {
  before(async () => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
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

  it('looks up Contact Objects', async () => {
    const testCfg = {
      ...configuration,
      sobject: 'Contact',
      termNumber: 1,
      outputMethod: 'emitIndividually',
    };
    const msg = {
      body: {
        sTerm_1: {
          fieldName: 'extID',
          condition: '=',
          fieldValue: 'stas2j3z4dittdc79cfe71akit',
        },
      },
    };

    const context = getContext();
    await lookupObjects.process.call(context, msg, testCfg);
    expect(context.emit.callCount).to.eql(1);
    expect(context.emit.args[0][0]).to.eql('data');
    expect(context.emit.args[0][1].body.results[0].attributes.type).to.eql(testCfg.sobject);
  });
});
