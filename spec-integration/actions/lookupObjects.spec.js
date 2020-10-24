/* eslint-disable no-return-assign */
const fs = require('fs');
const sinon = require('sinon');
const chai = require('chai');
const logger = require('@elastic.io/component-logger')();
const lookupObjects = require('../../lib/actions/lookupObjects');

const { expect } = chai;
let configuration;
let emitter;

describe('lookupObjects', () => {
  before(async () => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    configuration = {
      apiVersion: '45.0',
      oauth: {
        undefined_params: {
          instance_url: process.env.INSTANCE_URL,
        },
        refresh_token: process.env.REFRESH_TOKEN,
        access_token: process.env.ACCESS_TOKEN,
      },
    };

    emitter = {
      emit: sinon.spy(),
      logger,
    };
  });

  it('looks up Contact Objects', async () => {
    const cfg = {
      ...configuration,
      sobject: 'Contact',
      termNumber: 1,
      outputMethod: 'emitIndividually',
    };
    const message = {
      body: {
        sTerm_1: {
          fieldName: 'extID',
          condition: '=',
          fieldValue: '22016aa0-2222-4048-4048-4e191e1a1638',
        },
      },
    };
    await lookupObjects.process.call(emitter, message, cfg);
    expect(emitter.emit.callCount).to.eql(1);
    expect(emitter.emit.args[0][0]).to.eql('data');
    expect(emitter.emit.args[0][1].body.results[0].attributes.type).to.eql(cfg.sobject);
  });
});
