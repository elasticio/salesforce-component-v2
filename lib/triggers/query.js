const { messages } = require('../util');
const { callJSForceMethod } = require('../helpers/wrapper');

const validEmitMethods = ['emitAll', 'emitIndividually'];
const isDebugFlow = process.env.ELASTICIO_FLOW_TYPE === 'debug';

exports.process = async function processTrigger(msg, configuration) {
  this.logger.info('Starting Query trigger');
  const { query, outputMethod = 'emitIndividually', dontEmitOnEmptyResults } = configuration;
  if (!validEmitMethods.includes(outputMethod)) throw new Error('Unsupported Output method');
  let records;
  try {
    records = await callJSForceMethod.call(this, configuration, 'queryEmitAll', query);
  } catch (e) {
    const errorMsg = e.message ? e.message.replace(query, '').replace(/\s+/g, ' ').trim() : 'Error occurred during query execution';
    const error = new Error(errorMsg);
    error.name = e.name || 'unknown error';
    this.logger.error(errorMsg);
    throw new Error(error);
  }
  if (records.length === 0) {
    this.logger.info('No records found for provided Query');
    if (dontEmitOnEmptyResults) {
      if (isDebugFlow) {
        throw new Error(`No object found. Execution stopped.
      This error is only applicable to the Retrieve Sample.
      In flow executions there will be no error, just an execution skip.`);
      }
    } else {
      await this.emit('data', messages.newEmptyMessage());
    }
  } else if (outputMethod === 'emitAll') {
    this.logger.debug('Selected Output method Emit all');
    await this.emit('data', messages.newMessageWithBody({ records }));
  } else {
    this.logger.debug('Selected Output method Emit individually');
    // eslint-disable-next-line no-restricted-syntax
    for (const record of records) {
      // eslint-disable-next-line no-await-in-loop
      await this.emit('data', messages.newMessageWithBody(record));
    }
  }
};
