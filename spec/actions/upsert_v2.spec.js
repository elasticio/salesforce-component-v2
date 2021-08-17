/* eslint-disable comma-dangle, semi, max-len */
const sinon = require('sinon')
const nock = require('nock')
const { getLogger } = require('@elastic.io/component-commons-library/lib/logger/logger')
const { expect } = require('chai')
const testCommon = require('../common.js')
const common = require('../../lib/common.js')
const upsert = require('../../lib/actions/upsert_v2.js')
const objectTypesReply = require('../testData/sfObjects.json')
const metaModelDocumentReply = require('../testData/sfDocumentMetadata.json')
const metaModelDocumentFields = require('../testData/sfDocumentFields.json')
const sfDocumentMetamodel = require('../testData/sfDocumentMetamodel.json')

const { secret, secretId, instanceUrl } = testCommon
let context

describe('Upsert v2 Object test', () => {
  before(async () => {
    context = {
      logger: getLogger(),
      emit: sinon.spy()
    }
  })

  beforeEach(() => {
    context.emit.resetHistory()
    nock(process.env.ELASTICIO_API_URI)
      .get(`/v2/workspaces/${process.env.ELASTICIO_WORKSPACE_ID}/secrets/${secretId}`)
      .times(10)
      .reply(200, secret)
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('Config fields', () => {
    it('getObjectTypes', async () => {
      const scope = nock(instanceUrl)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects`)
        .reply(200, objectTypesReply)
      const expectedResult = {}
      objectTypesReply.sobjects.forEach((object) => {
        if (object.createable && object.updateable) expectedResult[object.name] = object.label
      })
      const configuration = { secretId: 'secretId' }
      const result = await upsert.getObjectTypes.call(context, configuration)
      expect(result).to.deep.equal(expectedResult)
      scope.done()
    })

    it('getLookupFieldsModel - all Fields', async () => {
      const scope = nock(instanceUrl)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      const configuration = { secretId: 'secretId', sobject: 'Document', typeOfSearch: 'allFields' }
      const result = await upsert.getLookupFieldsModel.call(context, configuration)
      expect(result).to.deep.equal(metaModelDocumentFields)
      scope.done()
    })

    it('getLookupFieldsModel - unique Fields', async () => {
      const scope = nock(instanceUrl)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      const configuration = { secretId: 'secretId', sobject: 'Document', typeOfSearch: 'uniqueFields' }
      const result = await upsert.getLookupFieldsModel.call(context, configuration)
      expect(result).to.deep.equal({ Id: 'Document ID (Id)' })
      scope.done()
    })
  })

  describe('Meta model', () => {
    it('Retrieves the list of createable/updateable sobjects', async () => {
      const scope = nock(instanceUrl)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply);
      const configuration = {
        secretId: 'secretId',
        sobject: 'Document',
        typeOfSearch: 'allFields',
        updateFields: ['Url', 'Body'],
        lookupField: 'Id'
      }
      const result = await upsert.getMetaModel.call(context, configuration)
      expect(result).to.deep.equal(sfDocumentMetamodel)
      scope.done()
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

    const body = {
      Id: 1,
      Url: '😂'
    }

    it('Object found, going to update', async () => {
      const bodyNoId = { ...body }
      delete bodyNoId.Id
      bodyNoId.Body = 'YXNkYXNkYXNkcXdlcXdlcXdl'
      const scope = nock(instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: body.Id })}`)
        .reply(200, { done: true, totalSize: 1, records: [body] })
        .patch(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/${body.Id}`, bodyNoId)
        .reply(204)

      const bodyWithBody = { ...body }
      bodyWithBody.Body = 'http://test.env.mock/somedata.txt'

      nock('http://test.env.mock')
        .get('/somedata.txt')
        .replyWithFile(200, `${__dirname}/../testData/somedata.txt`);

      const result = await upsert.process.call(context, { body: bodyWithBody }, configuration)
      expect(result.body.success).to.eql(true);
      scope.done()
    })

    it('Object not found, going to create', async () => {
      const bodyNoId = { ...body }
      delete bodyNoId.Id
      const scope = nock(instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: body.Id })}`)
        .reply(200, { done: true, totalSize: 1, records: [] })
        .post(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document`, bodyNoId)
        .reply(200, { id: 2, success: true, })

      const result = await upsert.process.call(context, { body }, configuration)
      expect(result.body.success).to.eql(true);
      scope.done()
    })

    it('Object not found - empty Id, going to create', async () => {
      const bodyNoId = { ...body }
      delete bodyNoId.Id
      const scope = nock(instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
        .reply(200, metaModelDocumentReply)
        .post(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/sobjects/Document`, bodyNoId)
        .reply(200, { id: 2, success: true, })

      const result = await upsert.process.call(context, { body: bodyNoId }, configuration)
      expect(result.body.success).to.eql(true);
      scope.done()
    })

    it('Found more then 1 object', async () => {
      const bodyNoId = { ...body }
      delete bodyNoId.Id
      const scope = nock(instanceUrl, { encodedQueryParams: true })
        .get(`/services/data/v${common.globalConsts.SALESFORCE_API_VERSION}/query?q=${testCommon.buildSOQL(metaModelDocumentReply, { Id: body.Id })}`)
        .reply(200, { done: true, totalSize: 1, records: [1, 2] })

      try {
        await upsert.process.call(context, { body }, configuration)
      } catch (err) {
        expect(err.message).to.eql('Found more than 1 Object');
      }
      scope.done()
    })
  })
})
