/* eslint-disable camelcase */
const nock = require('nock');
const { expect } = require('chai');

const documentWith_1_searchTerm = require('./outMetadataSchemas/lookupObjects/DocumentWith_1_searchTerm.json');
const documentWith_2_searchTerms = require('./outMetadataSchemas/lookupObjects/DocumentWith_2_searchTerms.json');
const accountWith_2_searchTerms = require('./outMetadataSchemas/lookupObjects/AccountWith_2_searchTerms.json');
const { globalConsts } = require('../../lib/common.js');
const {
  getContext, fetchToken, defaultCfg, testsCommon, validateEmitEqualsToData,
} = require('../common.js');
const objectTypesReply = require('../testData/sfObjects.json');
const metaModelDocumentReply = require('../testData/sfDocumentMetadata.json');
const metaModelAccountReply = require('../testData/sfAccountMetadata.json');

process.env.HASH_LIMIT_TIME = 1000;
const DEFAULT_LIMIT_EMITALL = 1000;
const lookupObjects = require('../../lib/actions/lookupObjects.js');

describe('Lookup Objects action test', () => {
  describe('Lookup Objects module: objectTypes', () => {
    it('Retrieves the list of queryable sobjects', async () => {
      fetchToken();
      const scope = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply);

      const expectedResult = {};
      objectTypesReply.sobjects.forEach((object) => {
        if (object.queryable) expectedResult[object.name] = object.label;
      });

      const result = await lookupObjects.objectTypes.call(getContext(), defaultCfg);
      expect(result).to.deep.equal(expectedResult);
      scope.done();
    });
  });

  describe('Lookup Objects module: getMetaModel', () => {
    describe('valid input', () => {
      it('Retrieves metadata for Document object', async () => {
        const testCfg = {
          ...defaultCfg,
          sobject: 'Document',
          outputMethod: 'emitAll',
          termNumber: '1',
        };
        fetchToken();
        const describeReq = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
          .reply(200, metaModelDocumentReply);

        const result = await lookupObjects.getMetaModel.call(getContext(), testCfg);
        expect(result).to.be.deep.equal(documentWith_1_searchTerm);
        describeReq.done();
      });
      it('Retrieves metadata for Document object 2 terms', async () => {
        const testCfg = {
          ...defaultCfg,
          sobject: 'Document',
          outputMethod: 'emitAll',
          termNumber: '2',
        };
        fetchToken();
        const describeReq = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
          .reply(200, metaModelDocumentReply);

        const result = await lookupObjects.getMetaModel.call(getContext(), testCfg);
        expect(result).to.be.deep.equal(documentWith_2_searchTerms);
        describeReq.done();
      });
      it('Retrieves metadata for Account object 2 terms', async () => {
        const testCfg = {
          ...defaultCfg,
          sobject: 'Account',
          outputMethod: 'emitPage',
          termNumber: '2',
        };
        fetchToken();
        const describeReq = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
          .reply(200, metaModelAccountReply);

        const result = await lookupObjects.getMetaModel.call(getContext(), testCfg);
        expect(result).to.be.deep.equal(accountWith_2_searchTerms);
        describeReq.done();
      });
    });
    describe('invalid input', () => {
      it('Should throw an error (termNumber is not valid)', async () => {
        const testCfg = {
          ...defaultCfg,
          sobject: 'Account',
          outputMethod: 'emitPage',
          termNumber: 'invalid',
        };
        fetchToken();
        const scope = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
          .reply(200, metaModelAccountReply);
        try {
          await lookupObjects.getMetaModel.call(getContext(), testCfg);
        } catch (err) {
          expect(err.message).to.be.equal('Number of search terms must be an integer value from the interval [0-99]');
        }
        scope.done();
      });
      it('Should throw an error (termNumber is not valid)', async () => {
        const testCfg = {
          ...defaultCfg,
          sobject: 'Account',
          outputMethod: 'emitPage',
          termNumber: '',
        };
        fetchToken();
        const scope = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
          .reply(200, metaModelAccountReply);
        try {
          await lookupObjects.getMetaModel.call(getContext(), testCfg);
        } catch (err) {
          expect(err.message).to.be.equal('Number of search terms must be an integer value from the interval [0-99]');
        }
        scope.done();
      });
      it('Should throw an error (termNumber is not valid)', async () => {
        const testCfg = {
          ...defaultCfg,
          sobject: 'Account',
          outputMethod: 'emitPage',
          termNumber: undefined,
        };
        fetchToken();
        const scope = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
          .reply(200, metaModelAccountReply);
        try {
          await lookupObjects.getMetaModel.call(getContext(), testCfg);
        } catch (err) {
          expect(err.message).to.be.equal('Number of search terms must be an integer value from the interval [0-99]');
        }
        scope.done();
      });
      it('Should throw an error (termNumber is not valid)', async () => {
        const testCfg = {
          ...defaultCfg,
          sobject: 'Account',
          outputMethod: 'emitPage',
          termNumber: [1, 2],
        };
        fetchToken();
        const scope = nock(testsCommon.instanceUrl)
          .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/${testCfg.sobject}/describe`)
          .reply(200, metaModelAccountReply);
        try {
          await lookupObjects.getMetaModel.call(getContext(), testCfg);
        } catch (err) {
          expect(err.message).to.be.equal('Number of search terms must be an integer value from the interval [0-99]');
        }
        scope.done();
      });
    });
  });

  describe('Lookup Objects module: processAction', () => {
    it('Gets Document objects: 2 string search terms, emitAll, limit', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        includeDeleted: false,
        outputMethod: 'emitAll',
        termNumber: '2',
      };
      const msg = {
        body: {
          limit: 30,
          sTerm_1: {
            fieldName: 'Document Name',
            fieldValue: 'NotVeryImportantDoc',
            condition: '=',
          },
          link_1_2: 'AND',
          sTerm_2: {
            fieldName: 'Folder ID',
            fieldValue: 'Some folder ID',
            condition: '=',
          },
        },
      };
      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
        ],
      };

      let expectedQuery = testsCommon.buildSOQL(metaModelDocumentReply,
        `Name%20%3D%20%27${msg.body.sTerm_1.fieldValue}%27%20`
        + `${msg.body.link_1_2}%20`
        + `FolderId%20%3D%20%27${msg.body.sTerm_2.fieldValue}%27%20`
        + `%20LIMIT%20${msg.body.limit}`);
      expectedQuery = expectedQuery.replace(/ /g, '%20');

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });

      const context = getContext();
      await lookupObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, testReply);
      describeReq.done();
      queryReq.done();
    });
    it('Gets Document objects: 2 string search terms, IN operator, emitAll, limit', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        includeDeleted: false,
        outputMethod: 'emitAll',
        termNumber: '2',
      };
      const msg = {
        body: {
          limit: 30,
          sTerm_1: {
            fieldName: 'Document Name',
            fieldValue: 'NotVeryImportantDoc,Value_1,Value_2',
            condition: 'IN',
          },
          link_1_2: 'AND',
          sTerm_2: {
            fieldName: 'Folder ID',
            fieldValue: 'Some folder ID',
            condition: '=',
          },
        },
      };
      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
        ],
      };

      let expectedQuery = testsCommon.buildSOQL(metaModelDocumentReply,
        'Name%20IN%20(%27NotVeryImportantDoc%27%2C%27Value_1%27%2C%27Value_2%27)%20'
        + `${msg.body.link_1_2}%20`
        + `FolderId%20%3D%20%27${msg.body.sTerm_2.fieldValue}%27%20`
        + `%20LIMIT%20${msg.body.limit}`);
      expectedQuery = expectedQuery.replace(/ /g, '%20');

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });

      const context = getContext();
      await lookupObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, testReply);
      describeReq.done();
      queryReq.done();
    });
    it('Gets Document objects: 2 string search terms, NOT IN operator, emitAll, limit', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        includeDeleted: false,
        outputMethod: 'emitAll',
        termNumber: '2',
      };
      const msg = {
        body: {
          limit: 30,
          sTerm_1: {
            fieldName: 'Body Length',
            fieldValue: '32,12,234',
            condition: 'NOT IN',
          },
          link_1_2: 'AND',
          sTerm_2: {
            fieldName: 'Folder ID',
            fieldValue: 'Some folder ID',
            condition: '=',
          },
        },
      };
      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
        ],
      };

      let expectedQuery = testsCommon.buildSOQL(metaModelDocumentReply,
        'BodyLength%20NOT%20IN%20(32%2C12%2C234)%20'
        + `${msg.body.link_1_2}%20`
        + `FolderId%20%3D%20%27${msg.body.sTerm_2.fieldValue}%27%20`
        + `%20LIMIT%20${msg.body.limit}`);
      expectedQuery = expectedQuery.replace(/ /g, '%20');

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });

      const context = getContext();
      await lookupObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, testReply);
      describeReq.done();
      queryReq.done();
    });
    it('Gets Document objects: 2 string search terms, INCLUDES operator, emitAll, limit', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        includeDeleted: false,
        outputMethod: 'emitAll',
        termNumber: '2',
      };
      const msg = {
        body: {
          limit: 30,
          sTerm_1: {
            fieldName: 'Document Name',
            fieldValue: 'NotVeryImportantDoc,Value_1,Value_2',
            condition: 'INCLUDES',
          },
          link_1_2: 'AND',
          sTerm_2: {
            fieldName: 'Folder ID',
            fieldValue: 'Some folder ID',
            condition: '=',
          },
        },
      };
      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
        ],
      };

      let expectedQuery = testsCommon.buildSOQL(metaModelDocumentReply,
        'Name%20INCLUDES%20(%27NotVeryImportantDoc%27%2C%27Value_1%27%2C%27Value_2%27)%20'
        + `${msg.body.link_1_2}%20`
        + `FolderId%20%3D%20%27${msg.body.sTerm_2.fieldValue}%27%20`
        + `%20LIMIT%20${msg.body.limit}`);
      expectedQuery = expectedQuery.replace(/ /g, '%20');

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });

      const context = getContext();
      await lookupObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, testReply);
      describeReq.done();
      queryReq.done();
    });
    it('Gets Document objects: 2 string search terms, EXCLUDES operator, emitAll, limit', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        includeDeleted: false,
        outputMethod: 'emitAll',
        termNumber: '2',
      };

      const msg = {
        body: {
          limit: 30,
          sTerm_1: {
            fieldName: 'Body Length',
            fieldValue: '32,12,234',
            condition: 'EXCLUDES',
          },
          link_1_2: 'AND',
          sTerm_2: {
            fieldName: 'Folder ID',
            fieldValue: 'Some folder ID',
            condition: '=',
          },
        },
      };

      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
        ],
      };

      let expectedQuery = testsCommon.buildSOQL(metaModelDocumentReply,
        'BodyLength%20EXCLUDES%20(32%2C12%2C234)%20'
        + `${msg.body.link_1_2}%20`
        + `FolderId%20%3D%20%27${msg.body.sTerm_2.fieldValue}%27%20`
        + `%20LIMIT%20${msg.body.limit}`);
      expectedQuery = expectedQuery.replace(/ /g, '%20');

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });

      const context = getContext();
      await lookupObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, testReply);
      describeReq.done();
      queryReq.done();
    });
    it('Gets Account objects: 2 numeric search term, emitAll', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Account',
        includeDeleted: false,
        outputMethod: 'emitAll',
        termNumber: '2',
      };
      const msg = {
        body: {
          sTerm_1: {
            fieldName: 'Employees',
            fieldValue: '123',
            condition: '=',
          },
          link_1_2: 'OR',
          sTerm_2: {
            fieldName: 'Employees',
            fieldValue: '1000',
            condition: '>',
          },
        },
      };
      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
        ],
      };

      const expectedQuery = testsCommon.buildSOQL(metaModelAccountReply,
        `NumberOfEmployees%20%3D%20${msg.body.sTerm_1.fieldValue}%20`
        + `${msg.body.link_1_2}%20`
        + `NumberOfEmployees%20%3E%20${msg.body.sTerm_2.fieldValue}%20`
        + '%20LIMIT%201000');

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Account/describe`)
        .reply(200, metaModelAccountReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });

      const context = getContext();
      await lookupObjects.process.call(context, msg, testCfg);
      describeReq.done();
      queryReq.done();
    });
    it('Gets Account objects: 2 numeric search term, emitIndividually, limit = 2', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Account',
        includeDeleted: false,
        outputMethod: 'emitIndividually',
        termNumber: '2',
      };
      const msg = {
        body: {
          limit: 2,
          sTerm_1: {
            fieldName: 'Employees',
            fieldValue: '123',
            condition: '=',
          },
          link_1_2: 'OR',
          sTerm_2: {
            fieldName: 'Employees',
            fieldValue: '1000',
            condition: '>',
          },
        },
      };
      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
          {
            Id: 'tes12jId',
            FolderId: '123sdfyyyzzz',
            Name: 'sdfsdfg',
            IsPublic: true,
            Body: 'dfg.org',
            ContentType: 'imagine/noHell',
          },
        ],
      };

      const expectedQuery = testsCommon.buildSOQL(metaModelAccountReply,
        `NumberOfEmployees%20%3D%20${msg.body.sTerm_1.fieldValue}%20`
        + `${msg.body.link_1_2}%20`
        + `NumberOfEmployees%20%3E%20${msg.body.sTerm_2.fieldValue}%20`
        + `%20LIMIT%20${msg.body.limit}`);

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Account/describe`)
        .reply(200, metaModelAccountReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });

      const context = getContext();
      await lookupObjects.process.call(context, msg, testCfg);
      const { emit } = context;
      expect(emit.callCount).to.be.equal(2);
      expect(emit.getCall(0).args[0]).to.be.equal('data');
      expect(emit.getCall(0).args[1].body).to.be.deep.equal({ results: [testReply.results.shift()] });
      describeReq.done();
      queryReq.done();
    });
    it('Gets Account objects: 2 numeric search term, emitPage, pageNumber = 0, pageSize = 2, includeDeleted', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Account',
        includeDeleted: true,
        outputMethod: 'emitPage',
        termNumber: '2',
      };
      const msg = {
        body: {
          pageNumber: 0,
          pageSize: 2,
          sTerm_1: {
            fieldName: 'Employees',
            fieldValue: '123',
            condition: '=',
          },
          link_1_2: 'OR',
          sTerm_2: {
            fieldName: 'Employees',
            fieldValue: '1000',
            condition: '>',
          },
        },
      };
      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
          {
            Id: 'tes12jId',
            FolderId: '123sdfyyyzzz',
            Name: 'sdfsdfg',
            IsPublic: true,
            Body: 'dfg.org',
            ContentType: 'imagine/noHell',
          },
          {
            Id: 't123es12jId',
            FolderId: '123sdfysdfyyzzz',
            Name: 'sdfsdfg',
            IsPublic: true,
            Body: 'dfg.osdfrg',
            ContentType: 'imagine/nasdoHell',
          },
          {
            Id: 'zzzzzzz',
            FolderId: '123sdfysdfyyzzz',
            Name: 'sdfsdfg',
            IsPublic: true,
            Body: 'dfg.osdfrg',
            ContentType: 'imagine/nasdoHell',
          },
        ],
      };

      const expectedQuery = testsCommon.buildSOQL(metaModelAccountReply,
        `NumberOfEmployees%20%3D%20${msg.body.sTerm_1.fieldValue}%20`
        + `${msg.body.link_1_2}%20`
        + `NumberOfEmployees%20%3E%20${msg.body.sTerm_2.fieldValue}%20`
        + `%20LIMIT%20${msg.body.pageSize}`);

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Account/describe`)
        .reply(200, metaModelAccountReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/queryAll?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });

      const context = getContext();
      await lookupObjects.process.call(context, msg, testCfg);
      const { emit } = context;
      expect(emit.getCall(0).args[1].body).to.be.deep.equal({ results: [testReply.results[0], testReply.results[1]] });
      describeReq.done();
      queryReq.done();
    });
    it('Gets Account objects: 3 search term, emitPage, pageNumber = 1, pageSize = 2', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Account',
        includeDeleted: false,
        outputMethod: 'emitPage',
        termNumber: '3',
      };
      const msg = {
        body: {
          pageNumber: 1,
          pageSize: 2,
          sTerm_1: {
            fieldName: 'Employees',
            fieldValue: '123',
            condition: '=',
          },
          link_1_2: 'OR',
          sTerm_2: {
            fieldName: 'Employees',
            fieldValue: '1000',
            condition: '>',
          },
          link_2_3: 'AND',
          sTerm_3: {
            fieldName: 'Account Name',
            fieldValue: 'noname',
            condition: 'LIKE',
          },
        },
      };
      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
          {
            Id: 'tes12jId',
            FolderId: '123sdfyyyzzz',
            Name: 'sdfsdfg',
            IsPublic: true,
            Body: 'dfg.org',
            ContentType: 'imagine/noHell',
          },
          {
            Id: 't123es12jId',
            FolderId: '123sdfysdfyyzzz',
            Name: 'sdfsdfg',
            IsPublic: true,
            Body: 'dfg.osdfrg',
            ContentType: 'imagine/nasdoHell',
          },
          {
            Id: 'zzzzzzz',
            FolderId: '123sdfysdfyyzzz',
            Name: 'sdfsdfg',
            IsPublic: true,
            Body: 'dfg.osdfrg',
            ContentType: 'imagine/nasdoHell',
          },
        ],
      };

      const expectedQuery = testsCommon.buildSOQL(metaModelAccountReply,
        `NumberOfEmployees%20%3D%20${msg.body.sTerm_1.fieldValue}%20`
        + `${msg.body.link_1_2}%20`
        + `NumberOfEmployees%20%3E%20${msg.body.sTerm_2.fieldValue}%20`
        + `${msg.body.link_2_3}%20`
        + `Name%20LIKE%20%27${msg.body.sTerm_3.fieldValue}%27%20`
        + `%20LIMIT%20${msg.body.pageSize}`
        + `%20OFFSET%20${msg.body.pageSize}`);

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Account/describe`)
        .reply(200, metaModelAccountReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });

      const context = getContext();
      await lookupObjects.process.call(context, msg, testCfg);
      const { emit } = context;
      expect(emit.callCount).to.be.equal(1);
      expect(emit.getCall(0).args[0]).to.be.equal('data');
      expect(emit.getCall(0).args[1].body).to.be.deep.equal({ results: [testReply.results[0], testReply.results[1]] });
      describeReq.done();
      queryReq.done();
    });
    it('Should use default limit value', async () => {
      const testsCfg = {
        sobject: 'Document',
        includeDeleted: false,
        outputMethod: 'emitAll',
        termNumber: '2',
      };
      const msg = {
        body: {
          limit: 0,
          sTerm_1: {
            fieldName: 'Document Name',
            fieldValue: 'NotVeryImportantDoc',
            condition: '=',
          },
          link_1_2: 'AND',
          sTerm_2: {
            fieldName: 'Folder ID',
            fieldValue: 'Some folder ID',
            condition: '=',
          },
        },
      };
      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
        ],
      };

      let expectedQuery = testsCommon.buildSOQL(metaModelDocumentReply,
        `Name%20%3D%20%27${msg.body.sTerm_1.fieldValue}%27%20`
        + `${msg.body.link_1_2}%20`
        + `FolderId%20%3D%20%27${msg.body.sTerm_2.fieldValue}%27%20`
        + `%20LIMIT%20${DEFAULT_LIMIT_EMITALL}`);
      expectedQuery = expectedQuery.replace(/ /g, '%20');

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });

      const context = getContext();
      await lookupObjects.process.call(context, msg, { ...defaultCfg, ...testsCfg });
      validateEmitEqualsToData(context.emit, testReply);
      describeReq.done();
      queryReq.done();
    });
    it('emitIndividually, no results found => should emit empty array', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        includeDeleted: false,
        outputMethod: 'emitIndividually',
        termNumber: '2',
      };
      const msg = {
        body: {
          limit: 30,
          sTerm_1: {
            fieldName: 'Document Name',
            fieldValue: 'NotVeryImportantDoc',
            condition: '=',
          },
          link_1_2: 'AND',
          sTerm_2: {
            fieldName: 'Folder ID',
            fieldValue: 'Some folder ID',
            condition: '=',
          },
        },
      };

      let expectedQuery = testsCommon.buildSOQL(metaModelDocumentReply,
        `Name%20%3D%20%27${msg.body.sTerm_1.fieldValue}%27%20`
        + `${msg.body.link_1_2}%20`
        + `FolderId%20%3D%20%27${msg.body.sTerm_2.fieldValue}%27%20`
        + `%20LIMIT%20${msg.body.limit}`);
      expectedQuery = expectedQuery.replace(/ /g, '%20');

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: 0, records: [] });

      const context = getContext();
      await lookupObjects.process.call(context, msg, testCfg);
      const spy = context.emit;
      expect(spy.callCount).to.be.equal(1);
      expect(spy.getCall(0).args[0]).to.be.equal('data');
      expect(spy.getCall(0).args[1].body).to.be.deep.equal({ results: [] });
      describeReq.done();
      queryReq.done();
    });
    it('Use cache', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        includeDeleted: false,
        outputMethod: 'emitAll',
        termNumber: '2',
        enableCacheUsage: true,
      };
      const msg = {
        body: {
          limit: 30,
          sTerm_1: {
            fieldName: 'Document Name',
            fieldValue: 'NotVeryImportantDoc',
            condition: '=',
          },
          link_1_2: 'AND',
          sTerm_2: {
            fieldName: 'Folder ID',
            fieldValue: 'Some folder ID',
            condition: '=',
          },
        },
      };
      const testReply = {
        results: [
          {
            Id: 'testObjId',
            FolderId: 'xxxyyyzzz',
            Name: 'NotVeryImportantDoc',
            IsPublic: false,
            Body: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
            ContentType: 'imagine/noHeaven',
          },
          {
            Id: 'testObjId',
            FolderId: '123yyyzzz',
            Name: 'VeryImportantDoc',
            IsPublic: true,
            Body: 'wikipedia.org',
            ContentType: 'imagine/noHell',
          },
        ],
      };

      let expectedQuery = testsCommon.buildSOQL(metaModelDocumentReply,
        `Name%20%3D%20%27${msg.body.sTerm_1.fieldValue}%27%20`
        + `${msg.body.link_1_2}%20`
        + `FolderId%20%3D%20%27${msg.body.sTerm_2.fieldValue}%27%20`
        + `%20LIMIT%20${msg.body.limit}`);
      expectedQuery = expectedQuery.replace(/ /g, '%20');

      // first call (result will be set to cache)
      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.results.length, records: testReply.results });
      // second call (used result from cache)
      fetchToken();
      const describeReq2 = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);

      const context = getContext();
      await lookupObjects.process.call(getContext(), msg, testCfg);
      await lookupObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, testReply);
      describeReq.done();
      queryReq.done();
      describeReq2.done();
    });
  });
});
