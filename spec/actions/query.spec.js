const { expect } = require('chai');
const nock = require('nock');

const { globalConsts } = require('../../lib/common.js');
const {
  getContext, fetchToken, defaultCfg, testsCommon, validateEmitEqualsToData,
} = require('../common.js');
const queryObjects = require('../../lib/actions/query.js');

describe('Query module: processAction', () => {
  const testReply = {
    result: [
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
  const msg = {
    body: {
      query: 'select name, id from account where name = \'testtest\'',
    },
  };
  const expectedQuery = 'select%20name%2C%20id%20from%20account%20where%20name%20%3D%20%27testtest%27';

  describe('valid input', () => {
    it('Gets objects not including deleted', async () => {
      const testCfg = {
        ...defaultCfg,
        includeDeleted: false,
        allowResultAsSet: true,
      };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.result.length, records: testReply.result });

      const context = getContext();
      await queryObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, testReply);
      queryReq.done();
    });
    it('Gets objects including deleted', async () => {
      const testCfg = {
        ...defaultCfg,
        includeDeleted: true,
        allowResultAsSet: true,
      };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/queryAll?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.result.length, records: testReply.result });

      const context = getContext();
      await queryObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, testReply);
      queryReq.done();
    });
    it('Gets objects batchSize=1, allowResultAsSet = false', async () => {
      const testCfg = {
        ...defaultCfg,
        includeDeleted: true,
        allowResultAsSet: false,
        batchSize: 1,
      };

      fetchToken();
      const scope = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/queryAll?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.result.length, records: testReply.result });

      const context = getContext();
      await queryObjects.process.call(context, msg, testCfg);
      expect(context.emit.getCalls().length).to.be.equal(2);
      expect(context.emit.getCall(0).lastArg.body).to.deep.equal({ result: [testReply.result[0]] });
      expect(context.emit.getCall(1).lastArg.body).to.deep.equal({ result: [testReply.result[1]] });
      scope.done();
    });
    it('Gets objects batchSize=1, allowResultAsSet = true', async () => {
      const testCfg = {
        ...defaultCfg,
        includeDeleted: true,
        allowResultAsSet: true,
        batchSize: 1,
      };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/queryAll?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.result.length, records: testReply.result });

      const context = getContext();
      await queryObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, testReply);
      queryReq.done();
    });
    it('Gets objects batchSize=0, allowResultAsSet = false', async () => {
      const testCfg = {
        ...defaultCfg,
        includeDeleted: true,
        allowResultAsSet: undefined,
        batchSize: 0,
      };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/queryAll?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.result.length, records: testReply.result });

      const context = getContext();
      await queryObjects.process.call(context, msg, testCfg);
      expect(context.emit.getCalls().length).to.be.equal(2);
      expect(context.emit.getCall(0).lastArg.body).to.deep.equal(testReply.result[0]);
      expect(context.emit.getCall(1).lastArg.body).to.deep.equal(testReply.result[1]);
      queryReq.done();
    });
    it('Gets objects batchSize=0, allowResultAsSet = true (should emit empty)', async () => {
      const testCfg = {
        ...defaultCfg,
        includeDeleted: true,
        allowResultAsSet: true,
      };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/queryAll?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: 0, records: [] });

      const context = getContext();
      await queryObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, {});
      queryReq.done();
    });
    it('Gets objects batchSize=1, allowResultAsSet = false (should emit empty)', async () => {
      const testCfg = {
        ...defaultCfg,
        includeDeleted: true,
        allowResultAsSet: false,
        batchSize: 1,
      };

      fetchToken();
      const scope = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/queryAll?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: 0, records: [] });

      const context = getContext();
      await queryObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, {});
      scope.done();
    });
    it('Gets objects batchSize=0, allowResultAsSet = false (should emit empty)', async () => {
      const testCfg = {
        ...defaultCfg,
        includeDeleted: true,
        allowResultAsSet: false,
      };

      fetchToken();
      const scope = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/queryAll?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: 0, records: [] });

      const context = getContext();
      await queryObjects.process.call(context, msg, testCfg);
      validateEmitEqualsToData(context.emit, {});
      scope.done();
    });
  });
  describe('invalid input', () => {
    it('Should throw an error (batchSize must be a number)', async () => {
      const testCfg = {
        ...defaultCfg,
        batchSize: 'invalid',
      };

      try {
        await queryObjects.process.call(getContext(), msg, testCfg);
      } catch (err) {
        expect(err.message).to.be.equal('batchSize must be a number');
      }
    });
    it('Should throw an error (batchSize must be a number)', async () => {
      const testCfg = {
        ...defaultCfg,
        batchSize: {},
      };

      try {
        await queryObjects.process.call(getContext(), msg, testCfg);
      } catch (err) {
        expect(err.message).to.be.equal('batchSize must be a number');
      }
    });
  });
});
