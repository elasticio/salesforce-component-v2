/* eslint-disable no-return-assign */
const { expect } = require('chai');
const { prepareBinaryData } = require('../../lib/helpers/attachment');
const { getContext, testsCommon } = require('../../spec/common');

const { getOauth } = testsCommon;

describe('attachment helper test', async () => {
  describe('prepareBinaryData test', async () => {
    it('should discard attachment utilizeAttachment:false', async () => {
      const testCfg = { oauth: getOauth(), sobject: 'Document' };
      const msg = {
        body: {
          Name: 'TryTest',
        },
        attachments: {
          'Fox.jpeg': {
            'content-type': 'image/jpeg',
            size: 126564,
            url: 'https://pbs.twimg.com/profile_images/1009094789520904193/raF9oIGa_400x400.jpg',
          },
        },
      };

      await prepareBinaryData(msg, testCfg, getContext());
      expect(msg.body.Name).to.eql('TryTest');
      expect(Object.prototype.hasOwnProperty.call(msg.body, 'Body')).to.eql(false);
    });

    it('should upload attachment utilizeAttachment:true', async () => {
      const testCfg = {
        oauth: getOauth(),
        sobject: 'Document',
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
            url: 'https://pbs.twimg.com/profile_images/1009094789520904193/raF9oIGa_400x400.jpg',
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
