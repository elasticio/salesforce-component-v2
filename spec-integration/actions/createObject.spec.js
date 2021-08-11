/* eslint-disable no-return-assign */
const fs = require('fs');
const logger = require('@elastic.io/component-logger')();
const { expect } = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const action = require('../../lib/actions/createObject');

xdescribe('creare object action', async () => {
  let emitter;
  const secretId = 'secretId';
  let configuration;
  let secret;

  before(async () => {
    emitter = {
      emit: sinon.spy(),
      logger,
    };
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    process.env.ELASTICIO_API_URI = 'https://app.example.io';
    process.env.ELASTICIO_API_USERNAME = 'user';
    process.env.ELASTICIO_API_KEY = 'apiKey';
    process.env.ELASTICIO_WORKSPACE_ID = 'workspaceId';
    secret = {
      data: {
        attributes: {
          credentials: {
            access_token: process.env.ACCESS_TOKEN,
            instance_url: process.env.INSTANCE_URL,
          },
        },
      },
    };

    configuration = {
      secretId,
    };

    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .times(10)
      .reply(200, secret);
  });
  afterEach(() => {
    emitter.emit.resetHistory();
  });

  it('should succeed selectModel objectTypes', async () => {
    const result = await action.objectTypes.call(emitter, configuration);
    expect(result.Contact).to.eql('Contact');
  });

  it('should succeed process create sobject=Contact', async () => {
    const cfg = {
      ...configuration,
      sobject: 'Contact',
    };
    const message = {
      body: {
        LastName: 'IntegrationTest',
      },
    };
    const result = await action.process.call(emitter, message, cfg);
    expect(result.body.LastName).to.eql('IntegrationTest');
    expect(Object.prototype.hasOwnProperty.call(result.body, 'id')).to.eql(true);
  });
});
