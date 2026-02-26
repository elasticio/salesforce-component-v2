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
    let errorMsg = 'Error occurred during query execution';
    if (e.message && e.message.trim()) {
      const match = e.message.match(/reason:\s*(.+)$/);
      if (match && match[1] && match[1].trim()) {
        errorMsg = match[1].trim();
      } else if (e.message.includes('reason:')) {
        errorMsg = 'Error occurred during query execution';
      } else {
        errorMsg = e.message.replace(query, '').replace(/\s+/g, ' ').trim() || errorMsg;
      }
    }
    const error = new Error(`Error: ${errorMsg}`);
    error.name = e.name || 'unknown error';
    this.logger.error(errorMsg);
    throw error;
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
