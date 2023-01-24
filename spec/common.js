process.env.LOG_LEVEL = 'TRACE';
process.env.LOG_OUTPUT_MODE = 'short';
process.env.ELASTICIO_FLOW_TYPE = 'debug';
require('elasticio-rest-node');
const { getLogger } = require('@elastic.io/component-commons-library');
const nock = require('nock');
const { config } = require('dotenv');
const fs = require('fs');
const sinon = require('sinon');
const { expect } = require('chai');

if (fs.existsSync('.env')) {
  config();
}

process.env.OAUTH_CLIENT_ID = 'asd';
process.env.OAUTH_CLIENT_SECRET = 'sdc';
process.env.ELASTICIO_API_URI = 'https://app.example.io';
process.env.ELASTICIO_API_USERNAME = 'user';
process.env.ELASTICIO_API_KEY = 'apiKey';
process.env.ELASTICIO_WORKSPACE_ID = 'workspaceId';

const EXT_FILE_STORAGE = 'http://file.storage.server';
const instanceUrl = 'https://test.salesforce.com';
const secretId = 'secretId';
const secret = {
  data: {
    attributes: {
      credentials: {
        access_token: 'accessToken',
        undefined_params: {
          instance_url: instanceUrl,
        },
      },
    },
  },
};

require.cache[require.resolve('elasticio-rest-node')] = {
  exports: () => ({
    resources: {
      storage: {
        createSignedUrl: () => ({
          get_url: EXT_FILE_STORAGE,
          put_url: EXT_FILE_STORAGE,
        }),
      },
    },
  }),
};

module.exports = {
  testsCommon: {
    instanceUrl,
    secret,
    secretId,
    EXT_FILE_STORAGE,
    refresh_token: {
      url: 'https://login.salesforce.com/services/oauth2/token',
      response: {
        access_token: 'the unthinkable top secret access token',
        refresh_token: 'the not less important also unthinkable top secret refresh token',
      },
    },
    getOauth: () => ({
      undefined_params: {
        instance_url: process.env.INSTANCE_URL,
      },
      refresh_token: process.env.REFRESH_TOKEN,
      access_token: process.env.ACCESS_TOKEN,
    }),
    buildSOQL: (objectMeta, where) => {
      let soql = `SELECT%20${objectMeta.fields[0].name}`;

      for (let i = 1; i < objectMeta.fields.length; i += 1) soql += `%2C%20${objectMeta.fields[i].name}`;

      soql += `%20FROM%20${objectMeta.name}%20WHERE%20`;

      if (typeof (where) === 'string') {
        soql += where;
      } else {
        // eslint-disable-next-line guard-for-in,no-restricted-syntax
        for (const key in where) {
          soql += `${key}%20%3D%20`;
          const field = objectMeta.fields.find((f) => f.name === key);
          if (!field) {
            throw new Error(`There is not ${key} field in ${objectMeta.name} object`);
          }
          if (field.soapType === 'tns:ID' || field.soapType === 'xsd:string') {
            soql += `%27${where[key]}%27`;
          } else {
            soql += `${where[key]}`;
          }
        }
      }

      return soql;
    },
  },
  defaultCfg: {
    secretId,
  },
  getContext: () => ({
    emit: sinon.spy(),
    logger: getLogger(),
  }),
  fetchToken: () => {
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .reply(200, secret);
  },
  describeDocReq: (api, meta) => {
    nock(instanceUrl)
      .get(`/services/data/v${api}/sobjects/Document/describe`)
      .reply(200, meta);
  },
  validateEmitEqualsToData: (emit, data) => {
    expect(emit.callCount).to.be.equal(1);
    expect(emit.getCall(0).args[0]).to.be.equal('data');
    expect(emit.getCall(0).args[1].body).to.be.deep.equal(data);
  },
};
