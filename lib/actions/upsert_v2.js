/* eslint-disable no-param-reassign, no-unused-vars, class-methods-use-this */
const { messages } = require('elasticio-node');
const { Upsert } = require('@elastic.io/oih-standard-library/lib/actions/upsert');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { callJSForceMethod } = require('../helpers/wrapper');
const { createProperty, getLookupFieldsModelWithTypeOfSearch } = require('../helpers/utils');

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
    title: `lookup by - ${configuration.lookupField}`,
    required: configuration.lookupField !== 'Id',
  };

  fields.forEach((field) => {
    result.in.properties[field.name] = createProperty(field);
    if (field.type === 'base64') result.in.properties[field.name].title += ' - use URL to file';
  });
  return result;
};

class UpsertObject extends Upsert {
  constructor(context) {
    super(context);
    this.logger = context.logger;
  }

  getCriteria(_msg, _cfg) {
    return true;
  }

  async lookupObject(_criteria, _type, cfg, msg) {
    let existingObj;
    if (cfg.lookupField === 'Id' && (!msg.body.Id)) {
      existingObj = undefined;
    } else {
      existingObj = await callJSForceMethod.call(this, { ...cfg, timeOut }, 'sobjectLookup', msg);
      if (existingObj.length > 1) {
        throw new Error('Found more than 1 Object');
      } else if (existingObj.length === 0) {
        existingObj = undefined;
      }
    }
    return existingObj;
  }

  async getObjectFromMessage(msg, cfg) {
    const meta = await callJSForceMethod.call(this, cfg, 'describe');
    await meta.fields.forEach(async (field) => {
      if (field.type === 'base64') {
        if (msg.body[field.name]) {
          const attachmentProcessor = new AttachmentProcessor();
          const attachment = await attachmentProcessor.getAttachment(msg.body[field.name], 'arraybuffer');
          msg.body[field.name] = attachment.data.toString('base64');
        }
      }
    });
    return msg;
  }

  async updateObject(_criteria, _type, object, cfg, _msg, existingObject) {
    object.body.Id = existingObject[0].Id;
    const result = await callJSForceMethod.call(this, { ...cfg, timeOut }, 'sobjectUpdate', object);
    return result;
  }

  async createObject(object, cfg, _msg) {
    const result = callJSForceMethod.call(this, { ...cfg, timeOut }, 'sobjectCreate', object);
    return result;
  }
}

module.exports.process = async function upsertObject(msg, cfg) {
  const upsert = new UpsertObject(this);
  return upsert.process(msg, cfg, {});
};
