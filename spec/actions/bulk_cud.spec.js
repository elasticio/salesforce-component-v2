/* eslint-disable guard-for-in,no-restricted-syntax */
const { expect } = require('chai');
const nock = require('nock');

const {
  getContext, fetchToken, defaultCfg, testsCommon,
} = require('../common.js');
const { globalConsts } = require('../../lib/common.js');
const testData = require('../testData/bulk_cud.json');
const bulk = require('../../lib/actions/bulk_cud.js');
const objectTypesReply = require('../testData/sfObjects.json');
const insertObjectTypes = require('./outMetadataSchemas/bulk_cud/insertObjectTypes.json');
const updateObjectTypes = require('./outMetadataSchemas/bulk_cud/updateObjectTypes.json');
const defaultObjectTypes = require('./outMetadataSchemas/bulk_cud/defaultObjectTypes.json');
const upsertMetaModel = require('./outMetadataSchemas/bulk_cud/upsertMetaModel.json');
const defaultMetaModel = require('./outMetadataSchemas/bulk_cud/defaultMetaModel.json');

describe('Salesforce bulk', () => {
  describe('bulk_cud module: getMetaModel', () => {
    it('Retrieves metadata for Document object', async () => {
      const testCfg = {
        ...defaultCfg,
        operation: 'upsert',
      };

      const result = await bulk.getMetaModel.call(getContext(), testCfg);
      expect(result).to.be.deep.equal(upsertMetaModel);
    });
    it('Retrieves metadata for Account object', async () => {
      const testCfg = {
        ...defaultCfg,
        operation: 'delete',
      };

      const result = await bulk.getMetaModel.call(getContext(), testCfg);
      expect(result).to.be.deep.equal(defaultMetaModel);
    });
    it('Retrieves metadata for Account object', async () => {
      const testCfg = {
        ...defaultCfg,
        operation: 'insert',
      };

      const result = await bulk.getMetaModel.call(getContext(), testCfg);
      expect(result).to.be.deep.equal(defaultMetaModel);
    });
  });
  describe('bulk_cud module: objectTypes', () => {
    it('Retrieves the list of objectTypes (insert)', async () => {
      const testCfg = {
        ...defaultCfg,
        operation: 'insert',
      };

      fetchToken();
      const sobjectsReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply);

      const result = await bulk.objectTypes.call(getContext(), testCfg);
      expect(result).to.deep.equal(insertObjectTypes);
      sobjectsReq.done();
    });
    it('Retrieves the list of objectTypes (update)', async () => {
      const testCfg = {
        ...defaultCfg,
        operation: 'update',
      };

      fetchToken();
      const sobjectsReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply);

      const result = await bulk.objectTypes.call(getContext(), testCfg);
      expect(result).to.deep.equal(updateObjectTypes);
      sobjectsReq.done();
    });
    it('Retrieves the list of objectTypes (default)', async () => {
      const testCfg = {
        ...defaultCfg,
        operation: 'delete',
      };

      fetchToken();
      const sobjectsReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply);

      const result = await bulk.objectTypes.call(getContext(), testCfg);
      expect(result).to.deep.equal(defaultObjectTypes);
      sobjectsReq.done();
    });
  });
  describe('bulk_cud module: process', () => {
    it('action create', async () => {
      const testApproach = testData.bulkInsertCase;
      const testCfg = {
        ...defaultCfg,
        ...testApproach.configuration,
      };
      const msg = { ...testApproach.message };
      const expectedResult = {
        result: [
          { id: '5002o00002E8FIIAA3', success: true, errors: [] },
          { id: '5002o00002E8FIJAA3', success: true, errors: [] },
          { id: '5002o00002E8FIKAA3', success: true, errors: [] },
        ],
      };

      fetchToken();
      const requests = [];
      for (const host in testApproach.responses) {
        for (const path in testApproach.responses[host]) {
          requests.push(nock(host)
            .intercept(path, testApproach.responses[host][path].method)
            .reply(200, testApproach.responses[host][path].response, testApproach.responses[host][path].header));
        }
      }

      const result = await bulk.process.call(getContext(), msg, testCfg);
      expect(result.body).to.deep.equal(expectedResult);
      for (let i = 0; i < requests.length; i += 1) requests[i].done();
    });
    it('action update', async () => {
      const testApproach = testData.bulkUpdateCase;
      const testCfg = {
        ...defaultCfg,
        ...testApproach.configuration,
      };
      const msg = { ...testApproach.message };
      const expectedResult = { result: [{ id: null, success: false, errors: ['ENTITY_IS_DELETED:entity is deleted:--'] }] };

      fetchToken();
      const requests = [];
      for (const host in testApproach.responses) {
        for (const path in testApproach.responses[host]) {
          requests.push(nock(host)
            .intercept(path, testApproach.responses[host][path].method)
            .reply(200, testApproach.responses[host][path].response, testApproach.responses[host][path].header));
        }
      }

      const result = await bulk.process.call(getContext(), msg, testCfg);
      expect(result.body).to.deep.equal(expectedResult);
      for (let i = 0; i < requests.length; i += 1) requests[i].done();
    });
    it('action delete', async () => {
      const testApproach = testData.bulkDeleteCase;
      const testCfg = {
        ...defaultCfg,
        ...testApproach.configuration,
      };
      const msg = { ...testApproach.message };
      const expectedResult = { result: [{ id: '5002o00002BT0IUAA1', success: true, errors: [] }] };

      fetchToken();
      const requests = [];
      for (const host in testApproach.responses) {
        for (const path in testApproach.responses[host]) {
          requests.push(nock(host)
            .intercept(path, testApproach.responses[host][path].method)
            .reply(200, testApproach.responses[host][path].response, testApproach.responses[host][path].header));
        }
      }

      const result = await bulk.process.call(getContext(), msg, testCfg);
      expect(result.body).to.deep.equal(expectedResult);
      for (let i = 0; i < requests.length; i += 1) requests[i].done();
    });
    it('should emit empty (attachment not found)', async () => {
      const testApproach = testData.bulkInsertCase;
      const testCfg = {
        ...defaultCfg,
        ...testApproach.configuration,
      };
      const msg = { body: {}, attachments: {} };

      const result = await bulk.process.call(getContext(), msg, testCfg);
      expect(result.body).to.deep.equal({});
    });
  });
});
