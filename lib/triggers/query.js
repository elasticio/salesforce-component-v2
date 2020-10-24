const { messages } = require('elasticio-node');
const { callJSForceMethod } = require('../helpers/wrapper');

exports.process = async function processTrigger(msg, configuration) {
  this.logger.info('Starting Query trigger');
  const { query, outputMethod = 'emitIndividually' } = configuration;
  let records;
  try {
    records = await callJSForceMethod.call(this, configuration, 'queryEmitAll', query);
  } catch (e) {
    const errorMsg = e.message ? e.message.replace(query, '').replace(/\s+/g, ' ').trim() : 'Error occurred during query execution';
    const error = new Error(errorMsg);
    error.name = e.name || 'unknown error';
    this.logger.error(errorMsg);
    throw errorMsg;
  }
  if (records.length === 0) {
    await this.emit('data', messages.newEmptyMessage());
  } else if (outputMethod === 'emitAll') {
    this.logger.debug('Selected Output method Emit all');
    await this.emit('data', messages.newMessageWithBody({ records }));
  } else if (outputMethod === 'emitIndividually') {
    this.logger.debug('Selected Output method Emit individually');
    // eslint-disable-next-line no-restricted-syntax
    for (const record of records) {
      // eslint-disable-next-line no-await-in-loop
      await this.emit('data', messages.newMessageWithBody(record));
    }
  } else {
    throw new Error('Unsupported Output method');
  }
};
