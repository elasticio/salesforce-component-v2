const { expect } = require('chai');
const nock = require('nock');

const upsertObject = require('../../lib/actions/upsert.js');
const { globalConsts } = require('../../lib/common.js');
const {
  getContext, fetchToken, defaultCfg, testsCommon, validateEmitEqualsToData,
} = require('../common.js');
const metaModelDocumentResult = require('./outMetadataSchemas/upsert/Document_metadata.json');
const metaModelAccountResult = require('./outMetadataSchemas/upsert/Account_metadata.json');
const objectTypesReply = require('../testData/sfObjects.json');
const metaModelDocumentReply = require('../testData/sfDocumentMetadata.json');
const metaModelAccountReply = require('../testData/sfAccountMetadata.json');

describe('Upsert Object test', () => {
  describe('Upsert Object module: objectTypes', () => {
    it('Retrieves the list of createable/updateable sobjects', async () => {
      const testCfg = { ...defaultCfg };

      const expectedResult = {};
      objectTypesReply.sobjects.forEach((object) => {
        if (object.createable && object.updateable) expectedResult[object.name] = object.label;
      });

      fetchToken();
      const getSobjectsReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply);

      const result = await upsertObject.objectTypes.call(getContext(), testCfg);
      expect(result).to.deep.equal(expectedResult);
      getSobjectsReq.done();
    });
  });

  describe('Upsert Object module: getMetaModel', () => {
    it('Retrieves metadata for Document object', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
      };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
        .reply(200, metaModelDocumentReply);

      const result = await upsertObject.getMetaModel.call(getContext(), testCfg);
      expect(result).to.deep.equal(metaModelDocumentResult);
      describeReq.done();
    });
    it('Retrieves metadata for Account object', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Account',
      };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
        .reply(200, metaModelAccountReply);

      const result = await upsertObject.getMetaModel.call(getContext(), testCfg);
      expect(result).to.deep.equal(metaModelAccountResult);
      describeReq.done();
    });
  });

  describe('Upsert Object module: upsertObject', () => {
    it('Sends request for Document update not using input attachment', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        utilizeAttachment: false,
      };
      const msg = {
        body: {
          Id: 'testObjId',
          FolderId: 'xxxyyyzzz',
          Name: 'NotVeryImportantDoc',
          IsPublic: false,
          Body: 'not quite binary data',
          ContentType: 'application/octet-stream',
        },
        attachments: {
          theFile: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            'content-type': 'image/jpeg',
          },
        },
      };

      const resultRequestBody = { ...msg.body };
      delete resultRequestBody.Id;

      fetchToken();
      const patchDocumentReq = nock(testsCommon.instanceUrl)
        .patch(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/${msg.body.Id}`, resultRequestBody)
        .reply(204);
      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: msg.body.Id })
        }`)
        .reply(200, { done: true, totalSize: 1, records: [msg.body] });

      const context = getContext();
      await upsertObject.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, msg.body);
      patchDocumentReq.done();
      describeReq.done();
      queryReq.done();
    });
  });
});
