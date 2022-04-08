const { expect } = require('chai');
const nock = require('nock');

const { globalConsts } = require('../lib/common.js');
const verify = require('../verifyCredentials');
const {
  getContext, testsCommon, fetchToken,
} = require('./common');

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

describe('Verify Credentials', () => {
  it('should return verified true for 200 answer', async () => {
    const testCfg = {
      oauth: testsCommon.secret.data.attributes.credentials,
    };

    fetchToken();
    const sobjectsReq = nock(testsCommon.instanceUrl)
      .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
      .reply(200, { done: true, totalSize: testReply.result.length, sobjects: testReply.result });

    const result = await verify.call(getContext(), testCfg);
    expect(result).to.deep.equal({ verified: true });
    sobjectsReq.done();
  });

  it('should throwError', async () => {
    const testCfg = {
      oauth: testsCommon.secret.data.attributes.credentials,
    };

    fetchToken();
    const sobjectsReq = nock(testsCommon.instanceUrl)
      .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
      .times(2)
      .replyWithError('some error');

    try {
      await verify.call(getContext(), testCfg);
    } catch (err) {
      expect(err.message).to.be.equal('some error');
    }
    sobjectsReq.done();
  });
});
