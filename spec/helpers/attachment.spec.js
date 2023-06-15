const { expect } = require('chai');
const nock = require('nock');
const { globalConsts } = require('../../lib/common.js');
const { prepareBinaryData } = require('../../lib/helpers/attachment');
const {
  getContext, fetchToken, defaultCfg, testsCommon,
} = require('../common.js');

describe('attachment helper', () => {
  const makeDescribeReq = () => nock(testsCommon.instanceUrl)
    .get(`/services/data/v${globalConsts.SALESFORCE_API_VERSION}/sobjects/Document/describe`)
    .reply(200, {
      fields: [
        {
          name: 'Body',
          type: 'base64',
        },
        {
          name: 'ContentType',
        },
      ],
    });
  describe('prepareBinaryData test', () => {
    it('should upload attachment utilizeAttachment:true', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
        utilizeAttachment: true,
      };
      const msg = {
        body: {
          Name: 'Attachment',
        },
        attachments: {
          'Fox.jpeg': {
            'content-type': 'image/jpeg',
            size: 126564,
            url: 'http://img.storage/image.jpg',
          },
        },
      };

      fetchToken();
      const describeReq = makeDescribeReq();
      const downloadReq = nock('http://img.storage')
        .get('/image.jpg')
        .reply(200, 'image');

      await prepareBinaryData(msg, testCfg, getContext());
      expect(msg.body.Name).to.eql('Attachment');
      expect(msg.body.ContentType).to.eql('image/jpeg');
      expect(Object.prototype.hasOwnProperty.call(msg.body, 'Body')).to.eql(true);
      describeReq.done();
      downloadReq.done();
    });

    it('should discard attachment utilizeAttachment:false', async () => {
      const testCfg = {
        ...defaultCfg,
        sobject: 'Document',
      };
      const msg = {
        body: {
          Name: 'Without Attachment',
        },
        attachments: {
          'Fox.jpeg': {
            'content-type': 'image/jpeg',
            size: 126564,
            url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Everest_kalapatthar.jpg/800px-Everest_kalapatthar.jpg',
          },
        },
      };

      await prepareBinaryData(msg, testCfg, getContext());
      expect(msg.body.Name).to.eql('Without Attachment');
      expect(Object.prototype.hasOwnProperty.call(msg.body, 'Body')).to.eql(false);
    });
  });
});
