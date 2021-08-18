const { expect } = require('chai');
const nock = require('nock');

const { globalConsts } = require('../../lib/common.js');
const {
  fetchToken, getContext, defaultCfg, testsCommon, validateEmitEqualsToData,
} = require('../common.js');

const queryObjects = require('../../lib/triggers/query.js');

describe('Query module: processTrigger', () => {
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
  const expectedQuery = 'select%20name%2C%20id%20from%20account%20where%20name%20%3D%20%27testtest%27';

  describe('valid input', () => {
    it('Gets objects emitAll', async () => {
      const testCfg = {
        ...defaultCfg,
        query: 'select name, id from account where name = \'testtest\'',
        outputMethod: 'emitAll',
      };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.result.length, records: testReply.result });

      const context = getContext();
      await queryObjects.process.call(context, {}, testCfg);
      validateEmitEqualsToData(context.emit, { records: testReply.result });
      queryReq.done();
    });
    it('Gets objects emitIndividually', async () => {
      const testCfg = {
        ...defaultCfg,
        query: 'select name, id from account where name = \'testtest\'',
        outputMethod: 'emitIndividually',
      };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: testReply.result.length, records: testReply.result });

      const context = getContext();
      await queryObjects.process.call(context, {}, testCfg);
      expect(context.emit.callCount).to.be.equal(2);
      expect(context.emit.getCall(0).args[0]).to.be.equal('data');
      expect(context.emit.getCall(1).args[0]).to.be.equal('data');
      expect(context.emit.getCall(0).args[1].body).to.deep.equal(testReply.result[0]);
      expect(context.emit.getCall(1).args[1].body).to.deep.equal(testReply.result[1]);
      queryReq.done();
    });
    it('Gets objects emitIndividually (emit empty message)', async () => {
      const testCfg = {
        ...defaultCfg,
        query: 'select name, id from account where name = \'testtest\'',
      };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .reply(200, { done: true, totalSize: 0, records: [] });

      const context = getContext();
      await queryObjects.process.call(context, {}, testCfg);
      validateEmitEqualsToData(context.emit, {});
      queryReq.done();
    });
    it('error occurred', async () => {
      const testCfg = {
        ...defaultCfg,
        query: 'select name, id from account where name = \'testtest\'',
        outputMethod: 'emitIndividually',
      };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .replyWithError('some error');

      try {
        await queryObjects.process.call(getContext(), {}, testCfg);
      } catch (err) {
        expect(err.message).to.be.equal('Error: some error');
      }
      queryReq.done();
    });
    it('error occurred', async () => {
      const testCfg = {
        ...defaultCfg,
        query: 'select name, id from account where name = \'testtest\'',
        outputMethod: 'emitIndividually',
      };

      fetchToken();
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${expectedQuery}`)
        .replyWithError('');

      try {
        await queryObjects.process.call(getContext(), {}, testCfg);
      } catch (err) {
        expect(err.message).to.be.equal('Error: Error occurred during query execution');
      }
      queryReq.done();
    });
    describe('invalid input', () => {
      it('Gets objects emitAll', async () => {
        const testCfg = {
          ...defaultCfg,
          query: 'select name, id from account where name = \'testtest\'',
          outputMethod: 'invalid method',
        };

        try {
          await queryObjects.process.call(getContext(), {}, testCfg);
        } catch (err) {
          expect(err.message).to.be.equal('Unsupported Output method');
        }
      });
    });
  });
});
