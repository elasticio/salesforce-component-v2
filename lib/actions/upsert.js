/* eslint-disable no-param-reassign */
const { messages } = require('elasticio-node');
const { callJSForceMethod } = require('../helpers/wrapper');
const { processMeta } = require('../helpers/utils');
const attachment = require('../helpers/attachment');

/**
 * This function will return a metamodel description for a particular object
 *
 * @param configuration
 */
module.exports.getMetaModel = async function getMetaModel(configuration) {
  const meta = await callJSForceMethod.call(this, configuration, 'describe');
  return processMeta(meta, 'upsert');
};

/**
 * This function will be called to fetch available object types.
 *
 * Note: only updatable and creatable object types are returned here
 *
 * @param configuration
 */
module.exports.objectTypes = async function getObjectTypes(configuration) {
  return callJSForceMethod.call(this, configuration, 'getObjectTypes');
};

/**
 * This function will upsert given object
 *
 * @param message
 * @param configuration
 */
module.exports.process = async function upsertObject(message, configuration) {
  this.logger.info('Starting Upsert Object Action');
  await attachment.prepareBinaryData(message, configuration, this);
  const { sobject } = configuration;
  if (message.body.Id) {
    configuration.lookupField = 'Id';
    this.logger.debug('Upserting sobject=%s by internalId', sobject);
    this.logger.trace('Upserting sobject=%s by internalId=%s', sobject, message.body.Id);
    await callJSForceMethod.call(this, configuration, 'sobjectUpdate', message);
  } else {
    if (!configuration.extIdField) {
      throw Error('Can not find internalId/externalId ids');
    }
    configuration.lookupField = configuration.extIdField;
    this.logger.debug('Upserting sobject=%s by externalId', sobject);
    this.logger.trace('Upserting sobject=%s by externalId=%s', sobject, configuration.extIdField);
    await callJSForceMethod.call(this, configuration, 'sobjectUpsert', message);
  }

  const lookupResults = await callJSForceMethod.call(this, configuration, 'sobjectLookup', message);
  if (lookupResults.length === 1) {
    this.logger.debug('sobject=%s was successfully upserted by %s', sobject, configuration.lookupField);
    await this.emit('data', messages.newMessageWithBody(lookupResults[0]));
    return;
  }
  if (lookupResults.length > 1) {
    throw new Error(`Found more than 1 sobject=${sobject} by ${configuration.lookupField}=${message.body[configuration.lookupField]}`);
  } else {
    throw new Error(`Can't found sobject=${sobject} by ${configuration.lookupField}=${message.body[configuration.lookupField]}`);
  }
};
