/* eslint-disable comma-dangle, semi, max-len */
const nock = require('nock')
const { expect } = require('chai')
const upsert = require('../../lib/actions/upsert_v2.js')
const objectTypesReply = require('../testData/sfObjects.json')
const metaModelDocumentReply = require('../testData/sfDocumentMetadata.json')
const metaModelDocumentFields = require('../testData/sfDocumentFields.json')
const sfDocumentMetamodel = require('../testData/sfDocumentMetamodel.json')
const { globalConsts } = require('../../lib/common.js');
const {
  getContext, fetchToken, defaultCfg, testsCommon,
} = require('../common.js');

describe('Upsert v2 Object test', () => {
  describe('Config fields', () => {
    it('getObjectTypes', async () => {
      const testCfg = {
        ...defaultCfg,
      }
      const expectedResult = {}
      objectTypesReply.sobjects.forEach((object) => {
        if (object.createable && object.updateable) expectedResult[object.name] = object.label
      })

      fetchToken()
      const sobjectsReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply)

      const result = await upsert.getObjectTypes.call(getContext(), testCfg)
      expect(result).to.deep.equal(expectedResult)
      sobjectsReq.done()
    })

    it('getLookupFieldsModel - all Fields', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        typeOfSearch: 'allFields'
      }

      fetchToken()
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);

      const result = await upsert.getLookupFieldsModel.call(getContext(), testCfg)
      expect(result).to.deep.equal(metaModelDocumentFields)
      describeReq.done()
    })

    it('getLookupFieldsModel - unique Fields', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        typeOfSearch: 'uniqueFields'
      }

      fetchToken()
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);

      const result = await upsert.getLookupFieldsModel.call(getContext(), testCfg)
      expect(result).to.deep.equal({ Id: 'Document ID (Id)' })
      describeReq.done()
    })
  })

  describe('Meta model', () => {
    it('Retrieves the list of createable/updateable sobjects', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        typeOfSearch: 'allFields',
        updateFields: ['Url', 'Body'],
        lookupField: 'Id'
      }

      fetchToken()
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);

      const result = await upsert.getMetaModel.call(getContext(), testCfg)
      expect(result).to.deep.equal(sfDocumentMetamodel)
      describeReq.done()
    })
  })

  describe('Main process', () => {
    const configuration = {
      secretId: 'secretId',
      sobject: 'Document',
      typeOfSearch: 'allFields',
      updateFields: ['Url', 'Body'],
      lookupField: 'Id'
    }

    it('Object found, going to update', async () => {
      const testCfg = {
        ...configuration
      }
      const msg = {
        body: {
          Id: 1,
          Url: 'lulyakamartin',
          Body: 'http://test.env.mock/somedata.txt'
        }
      }

      fetchToken()
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
      fetchToken()
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: 1 })
        }`)
        .reply(200, { done: true, totalSize: 1, records: [{ Id: 1, Url: 'lulyakamartin' }] })
      fetchToken();
      const patchDocReq = nock(testsCommon.instanceUrl)
        .patch(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/1`, { Url: 'lulyakamartin', Body: 'YXNkYXNkYXNkcXdlcXdlcXdl' })
        .reply(204)
      const getTxtReq = nock('http://test.env.mock')
        .get('/somedata.txt')
        .replyWithFile(200, `${__dirname}/../testData/somedata.txt`);

      const result = await upsert.process.call(getContext(), msg, testCfg)
      expect(result.body.success).to.eql(true);
      describeReq.done()
      queryReq.done()
      patchDocReq.done()
      getTxtReq.done()
    })

    it('Object not found, going to create', async () => {
      const testCfg = {
        ...configuration
      }
      const msg = {
        body: {
          Id: 1,
          Url: '😂',
        }
      }

      fetchToken()
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
      fetchToken()
      const queryReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: 1 })
        }`)
        .reply(200, { done: true, totalSize: 1, records: [] })
      fetchToken()
      const postDocReq = nock(testsCommon.instanceUrl)
        .post(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document`, { Url: '😂' })
        .reply(200, { id: 2, success: true, })

      const result = await upsert.process.call(getContext(), msg, testCfg)
      expect(result.body.success).to.eql(true);
      describeReq.done()
      queryReq.done()
      postDocReq.done()
    })

    it('Object not found - empty Id, going to create', async () => {
      const testCfg = {
        ...configuration
      }
      const msg = {
        body: {
          Url: '😂',
        }
      }

      fetchToken()
      const describeReq = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
      fetchToken()
      const createDocReq = nock(testsCommon.instanceUrl)
        .post(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document`, msg.body)
        .reply(200, { id: 2, success: true, })

      const result = await upsert.process.call(getContext(), msg, testCfg)
      expect(result.body.success).to.eql(true);
      describeReq.done()
      createDocReq.done()
    })

    it('Found more then 1 object', async () => {
      const testCfg = {
        ...configuration
      }
      const msg = {
        body: {
          Id: 1,
          Url: '😂',
        }
      }

      fetchToken()
      const scope = nock(testsCommon.instanceUrl)
        .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/query?q=${
          testsCommon.buildSOQL(metaModelDocumentReply, { Id: 1 })
        }`)
        .reply(200, { done: true, totalSize: 1, records: [1, 2] })

      try {
        await upsert.process.call(getContext(), msg, testCfg)
      } catch (err) {
        expect(err.message).to.eql('Found more than 1 Object');
      }
      scope.done()
    })
  })
})
