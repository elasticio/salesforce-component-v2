/* eslint-disable no-param-reassign, no-unused-vars, class-methods-use-this, no-restricted-syntax */
const { messages } = require('elasticio-node');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { callJSForceMethod } = require('../helpers/wrapper');
const { createProperty, getLookupFieldsModelWithTypeOfSearch, getUserAgent } = require('../helpers/utils');

const timeOut = process.env.UPSERT_TIME_OUT ? Number(process.env.UPSERT_TIME_OUT) : 120000;

module.exports.getObjectTypes = async function getObjectTypes(configuration) {
  return callJSForceMethod.call(this, configuration, 'getObjectTypes');
};

module.exports.getLookupFieldsModel = async function getLookupFieldsModel(configuration) {
  const meta = await callJSForceMethod.call(this, configuration, 'describe');
  return getLookupFieldsModelWithTypeOfSearch(meta, configuration.typeOfSearch);
};

module.exports.getMetaModel = async function getMetaModel(configuration) {
  const meta = await callJSForceMethod.call(this, configuration, 'describe');
  const fields = meta.fields.filter((field) => !field.deprecatedAndHidden
    && field.updateable
    && field.createable);

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
    title: configuration.lookupField,
    required: false,
  };

  fields.forEach((field) => {
    result.in.properties[field.name] = createProperty(field);
    if (field.type === 'base64') result.in.properties[field.name].title += ' - use URL to file';
  });

  result.in.properties[configuration.lookupField].title = `lookup by - ${result.in.properties[configuration.lookupField].title}`;

  return result;
};

let meta;

module.exports.process = async function upsertObject(msg, cfg) {
  this.logger.info(`Starting processing Upsert "${cfg.sobject}" object action`);

  if (!meta) meta = await callJSForceMethod.call(this, cfg, 'describe');
  for (const field in meta.fields) {
    if (field.type === 'base64' && msg.body[field.name]) {
      const { data } = await new AttachmentProcessor(getUserAgent()).getAttachment(msg.body[field.name], 'arraybuffer');
      msg.body[field.name] = data.toString('base64');
    }
  }

  let result;
  if (!msg.body[cfg.lookupField]) {
    this.logger.info(`"${cfg.lookupField}" not specified, creating new object`);
    result = await callJSForceMethod.call(this, { ...cfg, timeOut }, 'sobjectCreate', msg);
  } else if (cfg.typeOfSearch === 'externalIds') {
    this.logger.info(`Going to upsert "${cfg.sobject}" object using "${cfg.lookupField}" field`);
    const extIdField = cfg.lookupField;
    result = await callJSForceMethod.call(this, { ...cfg, timeOut, extIdField }, 'sobjectUpsert', msg);
  } else {
    this.logger.info('Starting to get object for an upsert...');
    const existingObj = await callJSForceMethod.call(this, { ...cfg, timeOut }, 'sobjectLookup', msg);
    if (existingObj.length > 1) {
      throw new Error('Found more than 1 Object');
    } else if (existingObj.length === 0) {
      this.logger.info('An object does not exist, creating a new one');
      result = await callJSForceMethod.call(this, { ...cfg, timeOut }, 'sobjectCreate', msg);
    } else {
      this.logger.info('An object already exists, updating it');
      msg.body.Id = existingObj[0].Id;
      result = await callJSForceMethod.call(this, { ...cfg, timeOut }, 'sobjectUpdate', msg);
    }
  }

  return messages.newMessageWithBody(result);
};
