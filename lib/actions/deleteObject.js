/* eslint-disable no-param-reassign,consistent-return */

const { messages } = require('elasticio-node');
const { callJSForceMethod } = require('../helpers/wrapper');
const {
  processMeta,
  getLookupFieldsModelWithTypeOfSearch,
  formatWhereCondition,
  logAndThrowError,
} = require('../helpers/utils');

module.exports.objectTypes = async function objectTypes(configuration) {
  return callJSForceMethod.call(this, configuration, 'getObjectTypes');
};

module.exports.getLookupFieldsModel = async function getLookupFieldsModel(configuration) {
  const meta = await callJSForceMethod.call(this, configuration, 'describe');
  return getLookupFieldsModelWithTypeOfSearch(meta, configuration.typeOfSearch);
};

module.exports.getMetaModel = async function getMetaModel(configuration) {
  let metaData;
  if (configuration.lookupField) {
    const meta = await callJSForceMethod.call(this, configuration, 'describe');
    metaData = await processMeta(meta, 'lookup', configuration.lookupField);
    metaData.in.properties[configuration.lookupField].required = true;
  } else {
    metaData = {
      in: {
        type: 'object',
        properties: {
          id: {
            title: 'Object ID',
            type: 'string',
            required: true,
          },
        },
      },
    };
  }
  metaData.out = {
    type: 'object',
    properties: {
      response: {
        type: 'object',
        properties: {
          id: {
            title: 'id',
            type: 'string',
          },
          success: {
            title: 'success',
            type: 'boolean',
          },
          errors: {
            title: 'errors',
            type: 'array',
          },
        },
      },
    },
  };
  return metaData;
};

module.exports.process = async function process(message, configuration) {
  this.logger.info('Starting Delete Object (at most 1) Action');
  const { lookupField } = configuration;
  const lookupValue = message.body[lookupField];
  let objectToDeleteId;

  if (!lookupValue) {
    this.logger.debug('No unique criteria provided, run previous functionality');

    if (!message.body.id || !String(message.body.id).trim()) {
      this.logger.error('Salesforce error. Empty ID');
      return messages.newEmptyMessage();
    }
    objectToDeleteId = message.body.id;
  } else {
    this.logger.debug(`Preparing to delete a ${configuration.sobject} object...`);

    const meta = await callJSForceMethod.call(this, configuration, 'describe');
    const field = meta.fields.find((fld) => fld.name === lookupField);
    const condition = formatWhereCondition(field.type, lookupField, lookupValue);

    const results = await callJSForceMethod.call(this, configuration, 'selectQuery', { condition });
    if (results.length === 1) {
      // eslint-disable-next-line prefer-destructuring
      objectToDeleteId = results[0].Id;
    } else {
      if (results.length === 0) {
        this.logger.info('No objects are found');
        return messages.newEmptyMessage();
      }
      logAndThrowError('More than one object found, can only delete 1', this.logger);
    }
  }
  this.logger.debug(`Preparing to delete a ${configuration.sobject} object...`);

  let response;
  try {
    response = await callJSForceMethod.call(this, configuration, 'sobjectDelete', { id: objectToDeleteId });
  } catch (err) {
    this.logger.error('Salesforce error occurred');
    return messages.newEmptyMessage();
  }

  this.logger.debug(`${configuration.sobject} has been successfully deleted`);
  this.logger.trace(`${configuration.sobject} has been successfully deleted (ID = ${response.id}).`);
  return messages.newMessageWithBody({ response });
};
