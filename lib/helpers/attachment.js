/* eslint-disable no-param-reassign */
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { callJSForceMethod } = require('./wrapper');
const { isValidURL, getUserAgent } = require('../util');

exports.prepareBinaryData = async function prepareBinaryData(msg, configuration, emitter) {
  if (!configuration.utilizeAttachment) return false;
  let attachmentUrl;
  let attachmentContentType;

  const objectFields = await callJSForceMethod.call(emitter, configuration, 'getObjectFieldsMetaData');
  const binField = objectFields.find((field) => field.type === 'base64');
  if (!binField) {
    emitter.logger.info('Attachment fields not found!');
    return false;
  }

  if (msg.body[binField.name] && isValidURL(msg.body[binField.name])) {
    attachmentUrl = msg.body[binField.name];
    emitter.logger.info('Found an attachment url in message body');
  } else if (msg.attachments && Object.keys(msg.attachments).length > 0) {
    const attachment = msg.attachments[Object.keys(msg.attachments)[0]];
    attachmentUrl = attachment.url;
    attachmentContentType = attachment['content-type'];
    emitter.logger.info('Found an attachment url from the previous component.');
  }
  if (!attachmentUrl) return false;
  const attachmentProcessor = new AttachmentProcessor(getUserAgent(), msg.id);
  const { data } = await attachmentProcessor.getAttachment(attachmentUrl, 'arraybuffer');
  msg.body[binField.name] = data.toString('base64');
  if (attachmentContentType && objectFields.find((field) => field.name === 'ContentType')) {
    msg.body.ContentType = attachmentContentType;
  }
  return binField;
};

exports.getAttachment = async function getAttachment(configuration, objectContent, emitter, msgId) {
  const objectFields = await callJSForceMethod.call(emitter, configuration, 'getObjectFieldsMetaData');

  const binField = objectFields.find((field) => field.type === 'base64');
  if (!binField) return false;

  const binDataUrl = objectContent[binField.name];
  if (!binDataUrl) return false;

  const options = { fieldName: objectContent[binField.name], id: objectContent.Id };
  const getSfAttachment = async () => callJSForceMethod.call(emitter, configuration, 'sobjectDownload', options);

  const attachmentProcessor = new AttachmentProcessor(getUserAgent(), msgId);
  const createdAttachmentId = await attachmentProcessor.uploadAttachment(getSfAttachment);
  const attachmentUrl = attachmentProcessor.getMaesterAttachmentUrlById(createdAttachmentId);
  objectContent[binField.name] = attachmentUrl;

  let fileName = objectContent.Name || objectContent.Title || 'attachment';

  if (objectContent.Title) {
    fileName = objectContent.Title;
    if (objectContent.FileExtension) fileName += `.${objectContent.FileExtension}`;
  }

  const attachment = {
    [fileName]: {
      url: attachmentUrl,
    },
  };

  return attachment;
};
