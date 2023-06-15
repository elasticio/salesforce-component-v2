const { messages } = require('elasticio-node');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { callJSForceMethod } = require('../helpers/wrapper');
const { getUserAgent } = require('../util');

exports.process = async function bulkQuery(message, configuration) {
  this.logger.info('Starting Bulk Query action');

  const getSfAttachment = async () => callJSForceMethod.call(this, configuration, 'bulkQuery', message.body.query);

  const attachmentProcessor = new AttachmentProcessor(getUserAgent(), message.id);
  const createdAttachmentId = await attachmentProcessor.uploadAttachment(getSfAttachment);
  const attachmentUrl = attachmentProcessor.getMaesterAttachmentUrlById(createdAttachmentId);

  const out = messages.newMessageWithBody({ url: attachmentUrl });
  out.attachments = {
    'bulk_query.csv': {
      'content-type': 'text/csv',
      url: attachmentUrl,
    },
  };
  return out;
};
