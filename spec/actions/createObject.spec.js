const { expect } = require('chai');
const nock = require('nock');

const { globalConsts } = require('../../lib/common.js');
const {
  getContext, fetchToken, defaultCfg, testsCommon,
} = require('../common.js');
const createObject = require('../../lib/actions/createObject.js');
const objectTypesReply = require('../testData/sfObjects.json');
const metaModelDocumentReply = require('../testData/sfDocumentMetadata.json');
const metaModelAccountReply = require('../testData/sfAccountMetadata.json');
const metaModelDocumentResult = require('./outMetadataSchemas/createObject/Document_metadata.json');
const metaModelAccountResult = require('./outMetadataSchemas/createObject/Account_metadata.json');

describe('Create Object action test', () => {
  describe('Create Object module: objectTypes', () => {
    it('Retrieves the list of createable sobjects', async () => {
      const testCfg = { ...defaultCfg };
      const expectedResult = {};
      objectTypesReply.sobjects.forEach((object) => {
        if (object.createable) expectedResult[object.name] = object.label;
      });

      fetchToken();
      const getSobjectsReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply);

      const result = await createObject.objectTypes.call(getContext(), testCfg);
      expect(result).to.deep.equal(expectedResult);
      getSobjectsReq.done();
    });
  });

  describe('Create Object module: getMetaModel', async () => {
    it('Retrieves metadata for Document object', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
      };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
        .reply(200, metaModelDocumentReply);

      const result = await createObject.getMetaModel.call(getContext(), testCfg);
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

      const result = await createObject.getMetaModel.call(getContext(), testCfg);
      expect(result).to.deep.equal(metaModelAccountResult);
      describeReq.done();
    });
  });

  describe('Create Object module: createObject', () => {
    it('Sends request for Account creation', async () => {
      const testCfg = { ...defaultCfg, sobject: 'Account' };
      const msg = {
        body: {
          Name: 'Fred',
          BillingStreet: 'Elm Street',
        },
      };

      fetchToken();
      const getAccountReq = nock(testsCommon.instanceUrl)
        .post(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Account`, msg.body)
        .reply(200, {
          id: 'new_account_id',
          success: true,
        });

      const result = await createObject.process.call(getContext(), msg, testCfg);
      expect(result.body.Name).to.deep.equal(msg.body.Name);
      expect(result.body.BillingStreet).to.deep.equal(msg.body.BillingStreet);
      getAccountReq.done();
    });

    it('Sends request for Document creation not using input attachment', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        utilizeAttachment: false,
      };
      const msg = {
        body: {
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

      fetchToken();
      const getDocumentReq = nock(testsCommon.instanceUrl)
        .post(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document`, msg.body)
        .reply(200, {
          id: 'new_document_id',
          success: true,
        });

      const result = await createObject.process.call(getContext(), msg, testCfg);
      expect(result.body.FolderId).to.deep.equal(msg.body.FolderId);
      expect(result.body.Name).to.deep.equal(msg.body.Name);
      expect(result.body.IsPublic).to.deep.equal(msg.body.IsPublic);
      expect(result.body.Body).to.deep.equal(msg.body.Body);
      expect(result.body.ContentType).to.deep.equal(msg.body.ContentType);
      getDocumentReq.done();
    });

    it('Sends request for Document creation using input attachment', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        utilizeAttachment: true,

      };
      const msg = {
        body: {
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
      const newDocID = 'new_document_id';

      fetchToken();
      const getDocumentReq = nock(testsCommon.instanceUrl)
        .post(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document`, msg.body)
        .reply(200, {
          id: newDocID,
          success: true,
        });
      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);

      const binaryScope = nock('https://upload.wikimedia.org')
        .get('/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg')
        .reply(200, JSON.stringify(msg));

      const result = await createObject.process.call(getContext(), msg, testCfg);
      expect(result.body.FolderId).to.be.equal(msg.body.FolderId);
      expect(result.body.Name).to.be.equal(msg.body.Name);
      expect(result.body.IsPublic).to.be.equal(msg.body.IsPublic);
      expect(result.body.ContentType).to.be.equal('image/jpeg');
      expect(result.body.id).to.be.equal(newDocID);
      getDocumentReq.done();
      describeReq.done();
      binaryScope.done();
    });
  });
});
