/* eslint-disable no-param-reassign, no-unused-vars, class-methods-use-this */
const { messages } = require('elasticio-node');
const { Upsert } = require('@elastic.io/oih-standard-library/lib/actions/upsert');
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
      existingObj = await callJSForceMethod.call(this, cfg, 'sobjectLookup', msg);
      if (existingObj.length > 1) {
        throw new Error('Found more than 1 Object');
      } else if (existingObj.length === 0) {
        existingObj = undefined;
      }
    }
    return existingObj;
  }

  async updateObject(_criteria, _type, _object, cfg, msg, existingObject) {
    msg.body.Id = existingObject[0].Id;
    const result = await callJSForceMethod.call(this, cfg, 'sobjectUpdate', msg);
    return result;
  }

  async createObject(_object, cfg, msg) {
    const result = callJSForceMethod.call(this, cfg, 'sobjectCreate', msg);
    return result;
  }
}

module.exports.process = async function upsertObject(msg, cfg) {
  const upsert = new UpsertObject(this);
  return upsert.process(msg, cfg, {});
};
