/* eslint-disable camelcase */
const { expect } = require('chai');
const nock = require('nock');

const { globalConsts } = require('../../lib/common.js');
const {
  getContext, fetchToken, defaultCfg, testsCommon,
} = require('../common.js');
const deleteObject = require('../../lib/actions/deleteObject.js');

const metaModelDocumentReply = require('../testData/sfDocumentMetadata.json');
const document_lookupField_id = require('./outMetadataSchemas/deleteObject/Document_lookupField_id.json');
const account_without_lookupField = require('./outMetadataSchemas/deleteObject/Account_without_lookupField.json');

describe('Delete Object (at most 1) action', () => {
  describe('Delete Object (at most 1) module: getMetaModel', () => {
    it('Retrieves metadata for Document object', async () => {
      const testCfg = {
        sobject: 'Document',
        lookupField: 'Id',
      };
      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
        .reply(200, metaModelDocumentReply);

      const result = await deleteObject.getMetaModel.call(getContext(), { ...defaultCfg, ...testCfg });
      expect(result).to.be.deep.equal(document_lookupField_id);
      describeReq.done();
    });
    it('Retrieves metadata for Account object without lookupField', async () => {
      const testCfg = {
        sobject: 'Account',
      };
      const result = await deleteObject.getMetaModel.call(getContext(), { ...defaultCfg, ...testCfg });
      expect(result).to.be.deep.equal(account_without_lookupField);
    });
  });

  describe('Delete Object (at most 1) module: getLookupFieldsModel', () => {
    it('Retrieves the list of unique fields of specified sobject', async () => {
      const testCfg = {
        sobject: 'Document',
        typeOfSearch: 'uniqueFields',
      };
      const expectedResult = {};
      metaModelDocumentReply.fields.forEach((field) => {
        if (field.type === 'id' || field.unique) expectedResult[field.name] = `${field.label} (${field.name})`;
      });

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
        .reply(200, metaModelDocumentReply);
      const result = await deleteObject.getLookupFieldsModel.call(getContext(), { ...defaultCfg, ...testCfg });
      expect(result).to.deep.equal(expectedResult);
      describeReq.done();
    });
  });

  describe('Delete Object (at most 1) module: process', () => {
    describe('valid input', () => {
      it('Deletes a document object without an attachment', async () => {
        const testCfg = {
          sobject: 'Document',
          lookupField: 'Id',
        };
        const msg = {
          body: {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'image/jpeg',
          },
        };

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
        fetchToken();
        const deleteReq = nock(testsCommon.instanceUrl)
          .delete(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/testObjId`)
          .reply(200, { id: 'deletedId' });

        const result = await deleteObject.process.call(getContext(), msg, { ...defaultCfg, ...testCfg });
        expect(result.body).to.deep.equal({ response: { id: 'deletedId' } });
        describeReq.done();
        queryReq.done();
        deleteReq.done();
      });
      it('Deletes a document object with an attachment', async () => {
        const testCfg = {
          sobject: 'Document',
          lookupField: 'Id',
        };
        const msg = {
          body: {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: '/upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'image/jpeg',
          },
        };

        fetchToken();
        const describeReq = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
          .reply(200, metaModelDocumentReply);
        fetchToken();
        const queryReq = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${testsCommon.buildSOQL(metaModelDocumentReply,
            { Id: msg.body.Id })}`)
          .reply(200, { done: true, totalSize: 1, records: [msg.body] });
        fetchToken();
        const deleteReq = nock(testsCommon.instanceUrl)
          .delete(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/testObjId`)
          .reply(200, { id: 'deletedId' });
        // nock(testsCommon.EXT_FILE_STORAGE).put('/', JSON.stringify(msg)).reply(200); IDK

        const result = await deleteObject.process.call(getContext(), msg, { ...defaultCfg, ...testCfg });
        expect(result.body).to.deep.equal({ response: { id: 'deletedId' } });
        describeReq.done();
        queryReq.done();
        deleteReq.done();
      });
      it('Should delete object by id (lookupField was not provided)', async () => {
        const testCfg = {
          sobject: 'Document',
        };
        const msg = {
          body: {
            id: 'testObjId',
          },
        };

        fetchToken();
        const deleteReq = nock(testsCommon.instanceUrl)
          .delete(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/testObjId`)
          .reply(200, { id: 'deletedId' });

        const result = await deleteObject.process.call(getContext(), msg, { ...defaultCfg, ...testCfg });
        expect(result.body).to.deep.equal({ response: { id: 'deletedId' } });
        deleteReq.done();
      });
      it('Should emit empty message (no objects found by criteria)', async () => {
        const testCfg = {
          sobject: 'Document',
          lookupField: 'Id',
        };
        const msg = {
          body: {
            Id: 'testObjId',
          },
        };

        fetchToken();
        const describeReq = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
          .reply(200, metaModelDocumentReply);
        fetchToken();
        const queryReq = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${testsCommon.buildSOQL(metaModelDocumentReply,
            { Id: msg.body.Id })}`)
          .reply(200, { done: true, totalSize: 0, records: [] });

        const result = await deleteObject.process.call(getContext(), msg, { ...defaultCfg, ...testCfg });
        expect(result.body).to.deep.equal({});
        describeReq.done();
        queryReq.done();
      });
      it('Should throw an error (more then 1 object can`t be deleted)', async () => {
        const testCfg = {
          sobject: 'Document',
          lookupField: 'Id',
        };
        const msg = {
          body: {
            Id: 'testObjId',
          },
        };

        fetchToken();
        const describeReq = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
          .reply(200, metaModelDocumentReply);
        fetchToken();
        const queryReq = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${testsCommon.buildSOQL(metaModelDocumentReply,
            { Id: msg.body.Id })}`)
          .reply(200, { done: true, totalSize: 0, records: [msg.body, msg.body] });

        try {
          await deleteObject.process.call(getContext(), msg, { ...defaultCfg, ...testCfg });
        } catch (error) {
          expect(error.message).to.be.equal('More than one object found, can only delete 1');
        }
        describeReq.done();
        queryReq.done();
      });
      it('Should emit empty message (Error occurred)', async () => {
        const testCfg = {
          sobject: 'Document',
          lookupField: 'Id',
        };
        const msg = {
          body: {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'image/jpeg',
          },
        };

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
        fetchToken();
        const deleteReq = nock(testsCommon.instanceUrl)
          .delete(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/testObjId`)
          .replyWithError('some error');

        let result;
        try {
          result = await deleteObject.process.call(getContext(), msg, { ...defaultCfg, ...testCfg });
        } catch (error) {
          expect(error.message).to.be.equal('some error');
        }
        expect(result.body).to.be.deep.equal({});
        describeReq.done();
        queryReq.done();
        deleteReq.done();
      });
    });
    describe('invalid input', () => {
      it('Should emit empty message', async () => {
        const testCfg = { };
        const msg = { body: {} };

        const result = await deleteObject.process.call(getContext(), msg, { ...defaultCfg, ...testCfg });
        expect(result.body).to.deep.equal({});
      });
    });
  });
});
