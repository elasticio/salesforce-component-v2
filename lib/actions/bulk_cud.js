const { messages } = require('elasticio-node');
// const { Readable } = require('stream');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { getUserAgent } = require('../util');
const { callJSForceMethod } = require('../helpers/wrapper');

const DEFAULT_TIMEOUT = 600; // 10 min

module.exports.objectTypes = async function objectTypes(configuration) {
  switch (configuration.operation) {
    case 'insert': {
      return callJSForceMethod.call(this, configuration, 'getCreateableObjectTypes');
    }
    case 'update': {
      return callJSForceMethod.call(this, configuration, 'getUpdateableObjectTypes');
    }
    default: {
      // 'delete' and 'upsert' operation or anything else
      return callJSForceMethod.call(this, configuration, 'getObjectTypes');
    }
  }
};

module.exports.process = async function bulkCUD(message, configuration) {
  this.logger.info('Starting Bulk %s action', configuration.operation);
  // Get CSV from attachment

  let timeout = parseInt(configuration.timeout, 10);
  if (Number.isNaN(timeout) || (timeout < 0)) {
    this.logger.warn(`Timeout is incorrect. Set default value: ${DEFAULT_TIMEOUT} sec.`);
    timeout = DEFAULT_TIMEOUT;
  }
  let { attachmentUrl } = message.body;
  if (!attachmentUrl) {
    if (!message.attachments || Object.keys(message.attachments).length === 0 || !message.attachments[Object.keys(message.attachments)[0]].url) {
      this.logger.error('Attachment not found');
      return messages.newMessageWithBody({});
    }
    attachmentUrl = message.attachments[Object.keys(message.attachments)[0]].url;
  }

  const attachmentProcessor = new AttachmentProcessor(getUserAgent(), message.id);
  const { data: csvStream } = await attachmentProcessor.getAttachment(attachmentUrl, 'stream');

  let extra;
  if (configuration.operation === 'upsert') {
    extra = { extIdField: message.body.extIdField };
  }

  const batchOptions = {
    sobject: configuration.sobject,
    operation: configuration.operation,
    extra,
  };
  const job = await callJSForceMethod.call(this, configuration, 'bulkCreateJob', batchOptions);
  const batch = job.createBatch();
  return new Promise((resolve, reject) => {
    // Upload CSV to SF
    batch.execute(csvStream)
      // eslint-disable-next-line no-unused-vars
      .on('queue', () => {
        // Check while job status become JobComplete or Failed, Aborted
        batch.poll(1000, timeout * 1000);
      }).on('response', (rets) => {
        // Retrieve the results of the completed job
        // emit results
        this.logger.debug('Result receiver. Records count:', rets.length);
        const out = messages.newEmptyMessage();
        out.body = { result: rets };
        resolve(out);
      }).on('error', (err) => {
        this.logger.error('Job error');
        reject(new Error(err.message));
        throw Error(`Job error: ${err.message}`);
      });
  });
};

module.exports.getMetaModel = async function getMetaModel(configuration) {
  const meta = {
    in: {
      type: 'object',
      properties: {
        attachmentUrl: {
          type: 'string',
          required: false,
          title: 'Attachment Url',
        },
      },
    },
    out: {
      type: 'object',
      properties: {
        result: {
          type: 'array',
          properties: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              success: {
                type: 'boolean',
              },
              errors: {
                type: 'array',
              },
            },
          },
        },
      },
    },
  };
  if (configuration.operation === 'upsert') {
    meta.in.properties.extIdField = {
      type: 'string',
      required: true,
      title: 'External ID Field',
    };
  }

  return meta;
};
