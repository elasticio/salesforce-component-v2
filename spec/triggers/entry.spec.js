/* eslint-disable max-len */
const { expect } = require('chai');
const nock = require('nock');
const { globalConsts } = require('../../lib/common.js');
const polling = require('../../lib/entry');
const records = require('../testData/trigger.results.json');
const {
  defaultCfg, testsCommon, getContext, fetchToken,
} = require('../common.js');
const metaModelDocumentReply = require('../testData/sfDocumentMetadata.json');
const objectTypesReply = require('../testData/sfObjects.json');
const enrtyMetaModel = require('./outMetadataSchemas/entryObjectTypes.json');

describe('Polling trigger test', () => {
  describe('entry module: objectTypes', () => {
    it('Retrieves the list of objectTypes', async () => {
      const testCfg = {
        ...defaultCfg,
      };

      fetchToken();
      const sobjectsReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply);

      const result = await polling.objectTypes.call(getContext(), testCfg);
      expect(result).to.deep.equal(enrtyMetaModel);
      sobjectsReq.done();
    });
  });
  describe('entry module: getMetaModel', () => {
    it('should success generate metadata', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
      };

      fetchToken();
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);

      const result = await polling.getMetaModel.call(getContext(), testCfg);
      expect(result.in.properties).to.deep.equal({});
      expect(result.out.properties.Id).to.deep.equal({
        default: null,
        required: false,
        title: 'Document ID',
        type: 'string',
      });
      describeReq.done();
    });
  });
  describe('entry module: process', () => {
    it('should be called with arg data five times', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
      };
      const msg = { body: {} };
      const snapshot = {};

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=SELECT%20Id%2C%20FolderId%2C%20IsDeleted%2C%20Name%2C%20DeveloperName%2C%20NamespacePrefix%2C%20ContentType%2C%20Type%2C%20IsPublic%2C%20BodyLength%2C%20Body%2C%20Url%2C%20Description%2C%20Keywords%2C%20IsInternalUseOnly%2C%20AuthorId%2C%20CreatedDate%2C%20CreatedById%2C%20LastModifiedDate%2C%20LastModifiedById%2C%20SystemModstamp%2C%20IsBodySearchable%2C%20LastViewedDate%2C%20LastReferencedDate%20FROM%20Document%20WHERE%20LastModifiedDate%20%3E%3D%201970-01-01T00%3A00%3A00.000Z%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 5, records });

      const context = getContext();
      await polling.process.call(context, msg, testCfg, snapshot);
      expect(context.emit.withArgs('data').callCount).to.be.equal(records.length);
      expect(context.emit.withArgs('snapshot').callCount).to.be.equal(1);
      expect(context.emit.withArgs('snapshot').getCall(0).args[1].previousLastModified).to.be.equal(records[records.length - 1].LastModifiedDate);
      queryReq.done();
    });
    it('should be called with arg data five times, convert snapshot for backward compatibility', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
      };
      const msg = { body: {} };
      const snapshot = '1970-01-01T00:00:00.000Z';

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=SELECT%20Id%2C%20FolderId%2C%20IsDeleted%2C%20Name%2C%20DeveloperName%2C%20NamespacePrefix%2C%20ContentType%2C%20Type%2C%20IsPublic%2C%20BodyLength%2C%20Body%2C%20Url%2C%20Description%2C%20Keywords%2C%20IsInternalUseOnly%2C%20AuthorId%2C%20CreatedDate%2C%20CreatedById%2C%20LastModifiedDate%2C%20LastModifiedById%2C%20SystemModstamp%2C%20IsBodySearchable%2C%20LastViewedDate%2C%20LastReferencedDate%20FROM%20Document%20WHERE%20LastModifiedDate%20%3E%3D%201970-01-01T00%3A00%3A00.000Z%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 5, records });

      const context = getContext();
      await polling.process.call(context, msg, testCfg, snapshot);
      expect(context.emit.withArgs('data').callCount).to.be.equal(records.length);
      expect(context.emit.withArgs('snapshot').callCount).to.be.equal(1);
      expect(context.emit.withArgs('snapshot').getCall(0).args[1].previousLastModified).to.be.equal(records[records.length - 1].LastModifiedDate);
      queryReq.done();
    });
    it('should not be called with arg data and snapshot', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
      };
      const msg = { body: {} };
      const snapshot = {};

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=SELECT%20Id%2C%20FolderId%2C%20IsDeleted%2C%20Name%2C%20DeveloperName%2C%20NamespacePrefix%2C%20ContentType%2C%20Type%2C%20IsPublic%2C%20BodyLength%2C%20Body%2C%20Url%2C%20Description%2C%20Keywords%2C%20IsInternalUseOnly%2C%20AuthorId%2C%20CreatedDate%2C%20CreatedById%2C%20LastModifiedDate%2C%20LastModifiedById%2C%20SystemModstamp%2C%20IsBodySearchable%2C%20LastViewedDate%2C%20LastReferencedDate%20FROM%20Document%20WHERE%20LastModifiedDate%20%3E%3D%201970-01-01T00%3A00%3A00.000Z%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 0, records: [] });

      const context = getContext();
      await polling.process.call(context, msg, testCfg, snapshot);
      expect(context.emit.withArgs('data').callCount).to.be.equal(0);
      expect(context.emit.withArgs('snapshot').callCount).to.be.equal(0);
      queryReq.done();
    });
    it('should not be called with arg data', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
      };
      const msg = { body: {} };
      const snapshot = { previousLastModified: '2019-28-03T00:00:00.000Z' };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=SELECT%20Id%2C%20FolderId%2C%20IsDeleted%2C%20Name%2C%20DeveloperName%2C%20NamespacePrefix%2C%20ContentType%2C%20Type%2C%20IsPublic%2C%20BodyLength%2C%20Body%2C%20Url%2C%20Description%2C%20Keywords%2C%20IsInternalUseOnly%2C%20AuthorId%2C%20CreatedDate%2C%20CreatedById%2C%20LastModifiedDate%2C%20LastModifiedById%2C%20SystemModstamp%2C%20IsBodySearchable%2C%20LastViewedDate%2C%20LastReferencedDate%20FROM%20Document%20WHERE%20LastModifiedDate%20%3E%202019-28-03T00%3A00%3A00.000Z%20ORDER%20BY%20LastModifiedDate%20ASC`)
        .reply(200, { done: true, totalSize: 5, records: [] });

      const context = getContext();
      await polling.process.call(context, msg, testCfg, snapshot);
      expect(context.emit.withArgs('data').callCount).to.be.equal(0);
      expect(context.emit.withArgs('snapshot').callCount).to.be.equal(0);
      queryReq.done();
    });
  });
});
