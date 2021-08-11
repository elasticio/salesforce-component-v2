/* eslint-disable no-return-assign */
const { expect } = require('chai');
const { prepareBinaryData } = require('../../lib/helpers/attachment');
const { SALESFORCE_API_VERSION } = require('../../lib/common.js');
const { defaultCfg, getContext } = require('../../spec/common');

describe('attachment helper test', async () => {
  let configuration;

  before(async () => {
    configuration = {
      apiVersion: SALESFORCE_API_VERSION,
      oauth: {
        undefined_params: {
          instance_url: process.env.INSTANCE_URL,
        },
        refresh_token: process.env.REFRESH_TOKEN,
        access_token: process.env.ACCESS_TOKEN,
      },
      sobject: 'Document',
    };
  });
  describe('prepareBinaryData test', async () => {
    it('should discard attachment utilizeAttachment:false', async () => {
      const testCfg = {
        ...defaultCfg,
      };
      const msg = {
        body: {
          Name: 'TryTest',
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
      expect(msg.body.Name).to.eql('TryTest');
      expect(Object.prototype.hasOwnProperty.call(msg.body, 'Body')).to.eql(false);
    });

    it('should upload attachment utilizeAttachment:true', async () => {
      const testCfg = {
        ...configuration,
        utilizeAttachment: true,
      };
      const msg = {
        body: {
          Name: 'TryTest',
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
      expect(msg.body.Name).to.eql('TryTest');
      expect(msg.body.ContentType).to.eql('image/jpeg');
      expect(Object.prototype.hasOwnProperty.call(msg.body, 'Body')).to.eql(true);
    });
  });
});
