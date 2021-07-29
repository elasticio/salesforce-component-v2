/* eslint-disable max-len */
const chai = require('chai');
const nock = require('nock');
const _ = require('lodash');

const common = require('../../lib/common.js');
const testCommon = require('../common.js');
const objectTypesReply = require('../testData/sfObjects.json');
const metaModelDocumentReply = require('../testData/sfDocumentMetadata.json');
const metaModelAccountReply = require('../testData/sfAccountMetadata.json');

process.env.HASH_LIMIT_TIME = 1000;
const lookupObject = require('../../lib/actions/lookupObject.js');

describe('Lookup Object (at most 1) test', () => {
  beforeEach(() => {
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${testCommon.secretId}`)
      .times(4)
      .reply(200, testCommon.secret);
  });
  afterEach(() => {
    nock.cleanAll();
  });
  describe('Lookup Object (at most 1) module: objectTypes', () => {
    it('Retrieves the list of queryable sobjects', async () => {
      const scope = nock(testCommon.instanceUrl)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply);

      const expectedResult = {};
      objectTypesReply.sobjects.forEach((object) => {
        if (object.queryable) expectedResult[object.name] = object.label;
      });

      const result = await lookupObject.objectTypes.call(testCommon, testCommon.configuration);
      chai.expect(result).to.deep.equal(expectedResult);

      scope.done();
    });
  });

  describe('Lookup Object (at most 1) module: getLookupFieldsModel', () => {
    async function testUniqueFields(object, getMetaModelReply) {
      const sfScope = nock(testCommon.instanceUrl)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/${object}/describe`)
        .reply(200, getMetaModelReply);

      nock(testCommon.refresh_token.url)
        .post('/')
        .reply(200, testCommon.refresh_token.response);

      const expectedResult = {};
      getMetaModelReply.fields.forEach((field) => {
        if (field.type === 'id' || field.unique) expectedResult[field.name] = `${field.label} (${field.name})`;
      });

      testCommon.configuration.typeOfSearch = 'uniqueFields';
      testCommon.configuration.sobject = object;

      const result = await lookupObject.getLookupFieldsModel
        .call(testCommon, testCommon.configuration);

      chai.expect(result).to.deep.equal(expectedResult);
      sfScope.done();
    }

    it('Retrieves the list of unique fields of specified sobject', testUniqueFields.bind(null, 'Document', metaModelDocumentReply));
  });

  describe('Lookup Object (at most 1) module: getLinkedObjectsModel', () => {
    async function testLinkedObjects(object, getMetaModelReply) {
      const sfScope = nock(testCommon.instanceUrl)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/${object}/describe`)
        .reply(200, getMetaModelReply);

      nock(testCommon.refresh_token.url)
        .post('/')
        .reply(200, testCommon.refresh_token.response);

      const expectedResult = {
        Folder: 'Folder, User (Folder)',
        Author: 'User (Author)',
        CreatedBy: 'User (CreatedBy)',
        LastModifiedBy: 'User (LastModifiedBy)',
      };

      testCommon.configuration.typeOfSearch = 'uniqueFields';
      testCommon.configuration.sobject = object;

      const result = await lookupObject.getLinkedObjectsModel
        .call(testCommon, testCommon.configuration);

      chai.expect(result).to.deep.equal(expectedResult);
      sfScope.done();
    }

    // eslint-disable-next-line max-len
    it('Retrieves the list of linked objects (their relationshipNames) from the specified object', testLinkedObjects.bind(null, 'Document', metaModelDocumentReply));
  });

  describe('Lookup Object module: getMetaModel', () => {
    function testMetaData(configuration, getMetaModelReply) {
      const sfScope = nock(testCommon.instanceUrl)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/${configuration.sobject}/describe`)
        .reply(200, getMetaModelReply);

      nock(testCommon.refresh_token.url)
        .post('/')
        .reply(200, testCommon.refresh_token.response);

      const expectedResult = {
        in: {
          type: 'object',
          properties: {},
        },
        out: {
          type: 'object',
          properties: {},
        },
      };

      getMetaModelReply.fields.forEach((field) => {
        const fieldDescriptor = {
          title: field.label,
          default: field.defaultValue,
          type: (() => {
            switch (field.soapType) {
              case 'xsd:boolean': return 'boolean';
              case 'xsd:double': return 'number';
              case 'xsd:int': return 'number';
              case 'urn:address': return 'object';
              default: return 'string';
            }
          })(),
          required: !field.nillable && !field.defaultedOnCreate,
        };

        if (field.soapType === 'urn:address') {
          fieldDescriptor.properties = {
            city: { type: 'string' },
            country: { type: 'string' },
            postalCode: { type: 'string' },
            state: { type: 'string' },
            street: { type: 'string' },
          };
        }

        if (field.type === 'textarea') fieldDescriptor.maxLength = 1000;

        if (field.picklistValues !== undefined && field.picklistValues.length !== 0) {
          fieldDescriptor.enum = [];
          field.picklistValues.forEach((pick) => { fieldDescriptor.enum.push(pick.value); });
        }

        if (configuration.lookupField === field.name) {
          expectedResult.in.properties[field.name] = {
            ...fieldDescriptor, required: !configuration.allowCriteriaToBeOmitted,
          };
        }

        expectedResult.out.properties[field.name] = fieldDescriptor;
      });

      return lookupObject.getMetaModel.call(testCommon, configuration)
        .then((data) => {
          chai.expect(data).to.deep.equal(expectedResult);
          sfScope.done();
        });
    }

    it('Retrieves metadata for Document object', testMetaData.bind(null, {
      ...testCommon.configuration,
      sobject: 'Document',
      lookupField: 'Id',
      allowCriteriaToBeOmitted: true,
    }, metaModelDocumentReply));

    it('Retrieves metadata for Account object', testMetaData.bind(null, {
      ...testCommon.configuration,
      sobject: 'Account',
      lookupField: 'Id',
      allowCriteriaToBeOmitted: true,
    }, metaModelAccountReply));
  });

  describe('Lookup Object module: processAction', () => {
    const configuration = {
      sobject: 'Document',
      lookupField: 'Id',
      allowCriteriaToBeOmitted: false,
      allowZeroResults: false,
      passBinaryData: false,
    };

    const message = {
      body: {
        Id: 'testObjId',
        FolderId: 'xxxyyyzzz',
        Name: 'NotVeryImportantDoc',
        IsPublic: false,
        Body: '/Everest_kalapatthar.jpg',
        ContentType: 'image/jpeg',
      },
    };

    it('Gets a Document object without its attachment', async () => {
      const scope = nock(testCommon.instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: message.body.Id })}%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [message.body] });

      const getResult = new Promise((resolve) => {
        testCommon.emitCallback = (what, msg) => {
          if (what === 'data') resolve(msg);
        };
      });
      testCommon.configuration = { ...testCommon.configuration, ...configuration };
      await lookupObject.process.call(testCommon, message, testCommon.configuration);
      const result = await getResult;

      chai.expect(result.body).to.deep.equal(message.body);
      chai.expect(result.attachments).to.deep.equal({});
      scope.done();
    });

    it('Gets a Document object with its attachment', async () => {
      testCommon.configuration.passBinaryData = true;

      const scope = nock(testCommon.instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .times(2)
        .reply(200, metaModelDocumentReply)
        .get(message.body.Body)
        .reply(200, JSON.stringify(message))
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: message.body.Id })}%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [message.body] });

      nock(testCommon.EXT_FILE_STORAGE).put('/', JSON.stringify(message)).reply(200);

      const getResult = new Promise((resolve) => {
        testCommon.emitCallback = (what, msg) => {
          if (what === 'data') resolve(msg);
        };
      });

      await lookupObject.process.call(testCommon, message, testCommon.configuration);
      const result = await getResult;

      chai.expect(result.body).to.deep.equal(message.body);
      chai.expect(result.attachments).to.deep.equal({
        [`${message.body.Name}.jpeg`]: {
          url: testCommon.EXT_FILE_STORAGE,
          'content-type': message.body.ContentType,
        },
      });

      scope.done();
    });

    it('Omitted criteria', async () => {
      testCommon.configuration.lookupField = 'Ids';
      testCommon.configuration.allowCriteriaToBeOmitted = true;

      const getResult = new Promise((resolve) => {
        testCommon.emitCallback = (what, msg) => {
          if (what === 'data') resolve(msg);
        };
      });

      await lookupObject.process.call(testCommon, message, testCommon.configuration);
      const result = await getResult;

      chai.expect(result.body).to.deep.equal({});
    });

    it('No unique criteria provided', async () => {
      testCommon.configuration.lookupField = 'Ids';
      testCommon.configuration.allowCriteriaToBeOmitted = false;

      const getResult = new Promise((resolve) => {
        testCommon.emitCallback = (what, msg) => {
          if (what === 'data') resolve(msg);
        };
      });

      try {
        await lookupObject.process.call(testCommon, message, testCommon.configuration);
        await getResult;
      } catch (err) {
        chai.expect(err.message).to.deep.equal('No unique criteria provided');
      }
    });

    it('Linked objects', async () => {
      testCommon.configuration.lookupField = 'Id';
      testCommon.configuration.passBinaryData = false;
      testCommon.configuration.linkedObjects = ['uno', '!'];

      nock(testCommon.instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: message.body.Id })}%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [message.body] })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/CustomBrandAsset/describe`)
        .reply(200, metaModelDocumentReply)
        .get(/.*/)
        .reply(200, { done: true, totalSize: 1, records: [message.body] });

      const getResult = new Promise((resolve) => {
        testCommon.emitCallback = (what, msg) => {
          if (what === 'data') resolve(msg);
        };
      });

      await lookupObject.process.call(testCommon, message, testCommon.configuration);
      const result = await getResult;

      chai.expect(result.body).to.deep.equal(message.body);
      chai.expect(result.attachments).to.deep.equal({});
    });

    it('Allow zero results', async () => {
      testCommon.configuration.linkedObjects = [];
      testCommon.configuration.type = '';
      testCommon.configuration.allowZeroResults = true;

      const scope = nock(testCommon.instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: message.body.Id })}%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [] });

      const getResult = new Promise((resolve) => {
        testCommon.emitCallback = (what, msg) => {
          if (what === 'data') resolve(msg);
        };
      });

      await lookupObject.process.call(testCommon, message, testCommon.configuration);
      const result = await getResult;

      chai.expect(result.body).to.deep.equal({});
      chai.expect(result.attachments).to.deep.equal({});
      scope.done();
    });

    it('No objects found', async () => {
      testCommon.configuration.allowZeroResults = false;

      const scope = nock(testCommon.instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: message.body.Id })}%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [] });

      const getResult = new Promise((resolve) => {
        testCommon.emitCallback = (what, msg) => {
          if (what === 'data') resolve(msg);
        };
      });

      try {
        await lookupObject.process.call(testCommon, message, testCommon.configuration);
        await getResult;
      } catch (err) {
        chai.expect(err.message).to.deep.equal('No objects found');
      }
      scope.done();
    });

    it('More than one object found', async () => {
      testCommon.configuration.linkedObjects = [];
      testCommon.configuration.type = '';
      testCommon.configuration.allowZeroResults = false;

      const scope = nock(testCommon.instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: message.body.Id })}%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: ['', ''] });

      const getResult = new Promise((resolve) => {
        testCommon.emitCallback = (what, msg) => {
          if (what === 'data') resolve(msg);
        };
      });

      try {
        await lookupObject.process.call(testCommon, message, testCommon.configuration);
        await getResult;
      } catch (err) {
        chai.expect(err.message).to.deep.equal('More than one object found');
      }
      scope.done();
    });

    it('Lookup Object error occurred', async () => {
      const scope = nock(testCommon.instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: message.body.Id })}%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: '1' });

      const testCommon2 = _.cloneDeep(testCommon);
      testCommon2.emit = async () => new Promise(() => {
        throw new Error('Lookup Object error occurred');
      });

      try {
        await lookupObject.process.call(testCommon2, message, testCommon.configuration);
      } catch (err) {
        chai.expect(err.message).to.deep.equal('Lookup Object error occurred');
      }
      scope.done();
    });

    it('Use cache', async () => {
      testCommon.configuration.enableCacheUsage = true;
      nock(testCommon.instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .times(2)
        .reply(200, metaModelDocumentReply)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: message.body.Id })}%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 1, records: [message.body] });

      const getResult = new Promise((resolve) => {
        testCommon.emitCallback = (what, msg) => {
          if (what === 'data') resolve(msg);
        };
      });

      await lookupObject.process.call(testCommon, message, testCommon.configuration);
      await lookupObject.process.call(testCommon, message, testCommon.configuration);
      const result = await getResult;
      chai.expect(result.body).to.deep.equal(message.body);
    });
  });
});
