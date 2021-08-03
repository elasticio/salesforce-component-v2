/* eslint-disable camelcase, max-len */
const { expect } = require('chai');
const nock = require('nock');

const { globalConsts } = require('../../lib/common.js');
const {
  getContext, fetchToken, defaultCfg, testsCommon, validateEmitEqualsToData,
} = require('../common.js');
const objectTypesReply = require('../testData/sfObjects.json');
const metaModelDocumentReply = require('../testData/sfDocumentMetadata.json');
const document_lookupField_id = require('./outMetadataSchemas/lookupObject/Document_lookupField_id.json');
const account_lookupField_id = require('./outMetadataSchemas/lookupObject/Account_lookupField_id.json');

process.env.HASH_LIMIT_TIME = 1000;
const lookupObject = require('../../lib/actions/lookupObject.js');

describe('Lookup Object (at most 1) test', () => {
  describe('Lookup Object (at most 1) module: objectTypes', () => {
    it('Retrieves the list of queryable sobjects', async () => {
      fetchToken();
      const sobjectsReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply);

      const expectedResult = {};
      objectTypesReply.sobjects.forEach((object) => {
        if (object.queryable) expectedResult[object.name] = object.label;
      });

      const result = await lookupObject.objectTypes.call(getContext(), { ...defaultCfg });
      expect(result).to.deep.equal(expectedResult);
      sobjectsReq.done();
    });
  });

  describe('Lookup Object (at most 1) module: getLookupFieldsModel', () => {
    it('Retrieves the list of unique fields of specified sobject', async () => {
      const testCfg = {
        ...defaultCfg,
        typeOfSearch: 'uniqueFields',
        sobject: 'Document',
      };
      const expectedResult = {};
      metaModelDocumentReply.fields.forEach((field) => {
        if (field.type === 'id' || field.unique) expectedResult[field.name] = `${field.label} (${field.name})`;
      });

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
        .reply(200, metaModelDocumentReply);
      // const refreshTokenReq = nock(testsCommon.refresh_token.url) IDK
      //   .post('/')
      //   .reply(200, testsCommon.refresh_token.response);

      const result = await lookupObject.getLookupFieldsModel.call(getContext(), testCfg);
      expect(result).to.deep.equal(expectedResult);
      describeReq.done();
    });
  });

  describe('Lookup Object (at most 1) module: getLinkedObjectsModel', () => {
    it('Retrieves the list of linked objects (their relationshipNames) from the specified object', async () => {
      const testCfg = {
        ...defaultCfg,
        typeOfSearch: 'uniqueFields',
        sobject: 'Document',
      };
      const expectedResult = {
        Folder: 'Folder, User (Folder)',
        Author: 'User (Author)',
        CreatedBy: 'User (CreatedBy)',
        LastModifiedBy: 'User (LastModifiedBy)',
      };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
        .reply(200, metaModelDocumentReply);
      // const refreshTokenReq = nock(testsCommon.refresh_token.url) IDK
      //   .post('/')
      //   .reply(200, testsCommon.refresh_token.response);

      const result = await lookupObject.getLinkedObjectsModel.call(getContext(), testCfg);
      expect(result).to.deep.equal(expectedResult);
      describeReq.done();
    });
  });

  describe('Lookup Object module: getMetaModel', () => {
    it('Retrieves metadata for Document object', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        lookupField: 'Id',
        allowCriteriaToBeOmitted: true,
      };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
        .reply(200, metaModelDocumentReply);
      // const refreshTokenReq = nock(testsCommon.refresh_token.url) IDK
      //   .post('/')
      //   .reply(200, testsCommon.refresh_token.response);

      const result = await lookupObject.getMetaModel.call(getContext(), testCfg);
      expect(result).to.be.deep.equal(document_lookupField_id);
      describeReq.done();
    });

    it('Retrieves metadata for Account object', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Account',
        lookupField: 'Id',
        allowCriteriaToBeOmitted: true,
      };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
        .reply(200, metaModelDocumentReply);
      // const refreshTokenReq = nock(testsCommon.refresh_token.url) IDK
      //   .post('/')
      //   .reply(200, testsCommon.refresh_token.response);

      const result = await lookupObject.getMetaModel.call(getContext(), testCfg);
      expect(result).to.be.deep.equal(account_lookupField_id);
      describeReq.done();
    });
  });

  describe('Lookup Object module: processAction', () => {
    const processActionDefaultCfg = {
      ...defaultCfg,
      sobject: 'Document',
      lookupField: 'Id',
      allowCriteriaToBeOmitted: false,
      allowZeroResults: false,
      passBinaryData: false,
    };
    const processActionDefaultMsgBody = {
      Id: 'testObjId',
      FolderId: 'xxxyyyzzz',
      Name: 'NotVeryImportantDoc',
      IsPublic: false,
      Body: '/Everest_kalapatthar.jpg',
      ContentType: 'image/jpeg',
    };
    it('Gets a Document object without its attachment', async () => {
      const testCfg = { ...processActionDefaultCfg };
      const msg = { body: { ...processActionDefaultMsgBody } };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: msg.body.Id })
        }%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [msg.body] });

      const context = getContext();
      await lookupObject.process.call(context, msg, testCfg);
      const spyEmit = context.emit;
      validateEmitEqualsToData(spyEmit, msg.body);
      expect(spyEmit.getCall(0).args[1].attachments).to.be.deep.equal({});
      describeReq.done();
      queryReq.done();
    });

    it('Gets a Document object with its attachment', async () => {
      const testCfg = {
        ...processActionDefaultCfg,
        passBinaryData: true,
      };
      const msg = { body: { ...processActionDefaultMsgBody } };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const describeReq2 = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryPicture = nock(testsCommon.instanceUrl)
        .get(msg.body.Body)
        .reply(200, JSON.stringify(msg));
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: msg.body.Id })
        }%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [msg.body] });
      nock(testsCommon.EXT_FILE_STORAGE).put('/', JSON.stringify(msg)).reply(200);

      const context = getContext();
      await lookupObject.process.call(context, msg, testCfg);
      const spyEmit = context.emit;
      validateEmitEqualsToData(spyEmit, msg.body);
      expect(spyEmit.getCall(0).args[1].attachments).to.be.deep.equal({
        [`${msg.body.Name}.jpeg`]: {
          url: testsCommon.EXT_FILE_STORAGE,
          'content-type': msg.body.ContentType,
        },
      });

      describeReq.done();
      describeReq2.done();
      queryPicture.done();
      queryReq.done();
    });

    it('Omitted criteria', async () => {
      const testCfg = {
        ...processActionDefaultCfg,
        lookupField: 'Ids',
        allowCriteriaToBeOmitted: true,
      };
      const msg = { body: { ...processActionDefaultMsgBody } };

      const context = getContext();
      await lookupObject.process.call(context, msg, testCfg);
      const spyEmit = context.emit;
      validateEmitEqualsToData(spyEmit, {});
    });

    it('No unique criteria provided', async () => {
      const testCfg = {
        ...processActionDefaultCfg,
        lookupField: 'Ids',
        allowCriteriaToBeOmitted: false,
      };
      const msg = { body: { ...processActionDefaultMsgBody } };

      try {
        await lookupObject.process.call(getContext(), msg, testCfg);
      } catch (err) {
        expect(err.message).to.deep.equal('No unique criteria provided');
      }
    });

    it('Linked objects', async () => {
      const testCfg = {
        ...processActionDefaultCfg,
        lookupField: 'Id',
        passBinaryData: false,
        linkedObjects: ['uno'],
      };
      const msg = { body: { ...processActionDefaultMsgBody } };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: msg.body.Id })
        }%20ORDER%20BY%20LastModifiedDate%20ASC`).reply(200, { done: true, totalSize: 1, records: [msg.body] });

      const context = getContext();
      await lookupObject.process.call(context, msg, testCfg);
      const spyEmit = context.emit;
      validateEmitEqualsToData(spyEmit, msg.body);
      expect(spyEmit.getCall(0).args[1].attachments).to.be.deep.equal({});
      describeReq.done();
      queryReq.done();
    });

    it('Allow zero results', async () => {
      const testCfg = {
        ...processActionDefaultCfg,
        type: '',
        allowZeroResults: true,
        linkedObjects: [],
      };
      const msg = { body: { ...processActionDefaultMsgBody } };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${// seems, query should look by another way
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: msg.body.Id })
        }%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [] });

      const context = getContext();
      await lookupObject.process.call(context, msg, testCfg);
      const spyEmit = context.emit;
      validateEmitEqualsToData(spyEmit, {});
      expect(spyEmit.getCall(0).args[1].attachments).to.be.deep.equal({});
      describeReq.done();
      queryReq.done();
    });

    it('No objects found', async () => {
      const testCfg = {
        ...processActionDefaultCfg,
        allowZeroResults: false,
      };
      const msg = { body: { ...processActionDefaultMsgBody } };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: msg.body.Id })
        }%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [] });

      try {
        await lookupObject.process.call(getContext(), msg, testCfg);
      } catch (err) {
        expect(err.message).to.deep.equal('No objects found');
      }
      describeReq.done();
      queryReq.done();
    });

    it('More than one object found', async () => {
      const testCfg = {
        ...processActionDefaultCfg,
        allowZeroResults: false,
        linkedObjects: [],
        type: '',
      };
      const msg = { body: { ...processActionDefaultMsgBody } };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: msg.body.Id })
        }%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 2, records: ['', ''] });

      try {
        await lookupObject.process.call(getContext(), msg, testCfg);
      } catch (err) {
        expect(err.message).to.deep.equal('More than one object found');
      }
      describeReq.done();
      queryReq.done();
    });

    it('Lookup Object error occurred', async () => {
      const testCfg = {
        ...processActionDefaultCfg,
      };
      const msg = { body: { ...processActionDefaultMsgBody } };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: msg.body.Id })
        }%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: '1' });

      try {
        await lookupObject.process.call(getContext(), msg, testCfg);
      } catch (err) {
        expect(err.message).to.deep.equal('Lookup Object error occurred');
      }
      describeReq.done();
      queryReq.done();
    });

    it('Use cache', async () => {
      const testCfg = {
        ...processActionDefaultCfg,
        enableCacheUsage: true,
      };
      const msg = { body: { ...processActionDefaultMsgBody } };

      // first call (result will be set to cache)
      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: msg.body.Id })
        }%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [msg.body] });
      // second call (used result from cache)
      fetchToken();
      const describeReq2 = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);

      const context = getContext();
      await lookupObject.process.call(getContext(), msg, testCfg);
      await lookupObject.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, msg.body);
      describeReq.done();
      queryReq.done();
      describeReq2.done();
    });
  });
});
