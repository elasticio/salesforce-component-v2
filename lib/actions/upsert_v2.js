/* eslint-disable no-param-reassign */
const { messages } = require('elasticio-node');
const { callJSForceMethod } = require('../helpers/wrapper');
const { createProperty, getLookupFieldsModelWithTypeOfSearch } = require('../helpers/utils');
const attachment = require('../helpers/attachment');

module.exports.getObjectTypes = async function getObjectTypes(configuration) {
  return callJSForceMethod.call(this, configuration, 'getObjectTypes');
};

module.exports.getLookupFieldsModel = async function getLookupFieldsModel(configuration) {
  const meta = await callJSForceMethod.call(this, configuration, 'describe');
  return getLookupFieldsModelWithTypeOfSearch(meta, configuration.typeOfSearch);
};

module.exports.getUpdateFieldsModel = async function getLookupFieldsModel(configuration) {
  const meta = await callJSForceMethod.call(this, configuration, 'describe');
  meta.fields = meta.fields.filter((field) => !field.deprecatedAndHidden
    && field.updateable
    && field.createable);
  return getLookupFieldsModelWithTypeOfSearch(meta, '');
};

module.exports.getMetaModel = async function getMetaModel(configuration) {
  const meta = await callJSForceMethod.call(this, configuration, 'describe');
  const fields = meta.fields.filter((field) => !field.deprecatedAndHidden
    && field.updateable
    && field.createable
    && (configuration.updateFields.includes(field.name) || (!field.nillable && !field.defaultedOnCreate)));

  const result = {
    in: {
      type: 'object',
      properties: {},
    },
    out: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          required: true,
          title: 'Unique identifier from CRM',
        },
        success: {
          type: 'boolean',
          required: true,
          title: 'Request result',
        },
        errors: {
          type: 'array',
          required: true,
          title: 'Founded errors',
        },
      },
    },
  };

  result.in.properties[configuration.lookupField] = {
    type: 'string',
    title: `lookup by - ${configuration.lookupField}`,
    required: configuration.lookupField !== 'Id',
  };

  fields.forEach((field) => {
    result.in.properties[field.name] = createProperty(field);
  });
  return result;
};

module.exports.process = async function upsertObject(message, configuration) {
  this.logger.info('Starting Upsert Object Action');
  await attachment.prepareBinaryData(message, configuration, this);
  let existingObj;
  this.logger.info('Looking for Object');
  if (configuration.lookupField === 'Id' && (message.body.Id === '' || !message.body.Id)) {
    existingObj = [];
  } else {
    existingObj = await callJSForceMethod.call(this, configuration, 'sobjectLookup', message);
  }

  let result;
  if (existingObj.length === 0) {
    this.logger.info('Object not found, going to create');
    result = await callJSForceMethod.call(this, configuration, 'sobjectCreate', message);
  } else if (existingObj.length === 1) {
    this.logger.info('Object found, going to update');
    message.body.Id = existingObj[0].Id;
    result = await callJSForceMethod.call(this, configuration, 'sobjectUpdate', message);
  } else if (existingObj.length > 1) {
    throw new Error('Found more than 1 Object');
  }
  return messages.newMessageWithBody(result);
};
