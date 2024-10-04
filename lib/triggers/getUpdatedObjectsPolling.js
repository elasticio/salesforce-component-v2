/* eslint-disable no-loop-func */
const { messages } = require('elasticio-node');
const { callJSForceMethod } = require('../helpers/wrapper');
const { getLinkedObjectTypes, processMeta } = require('../helpers/utils');

const timestamp = (date) => new Date(date).getTime();
const timeToString = (date) => JSON.stringify(new Date(date)).replace(/"/g, '');
const isDateValid = (date) => new Date(date).toString() !== 'Invalid Date';
const isNumberNaN = (num) => Number(num).toString() === 'NaN';
const MAX_FETCH = 10000;
const isDebugFlow = process.env.ELASTICIO_FLOW_TYPE === 'debug';

function getSelectedFields(cfg) {
  const { selectedFields = [] } = cfg;
  if (selectedFields.length === 0) {
    return '*';
  }
  if (!selectedFields.includes('LastModifiedDate')) {
    selectedFields.push('LastModifiedDate');
  }
  return selectedFields.toString();
}

exports.process = async function processTrigger(_msg, cfg, snapshot) {
  this.logger.info('Start processing "Get Updated Objects Polling" trigger');
  const currentTime = new Date();

  const {
    sobject,
    linkedObjects = [],
    emitBehavior = 'emitIndividually',
  } = cfg;
  let {
    singlePagePerInterval,
  } = cfg;

  let { startTime, endTime, pageSize } = cfg;
  if (!pageSize) pageSize = MAX_FETCH;
  if (!startTime) startTime = 0;
  if (!endTime) endTime = currentTime;
  if (!isDateValid(startTime)) throw new Error('invalid "Start Time" date format, use ISO 8601 Date time utc format - YYYY-MM-DDThh:mm:ssZ');
  if (!isDateValid(endTime)) throw new Error('invalid "End Time" date format, use ISO 8601 Date time utc format - YYYY-MM-DDThh:mm:ssZ');
  if (pageSize > MAX_FETCH || isNumberNaN(pageSize) || Number(pageSize) < 0) throw new Error(`"Size of Polling Page" must be valid number between 0 and ${MAX_FETCH}`);
  pageSize = Number(pageSize);
  let from = snapshot?.nextStartTime || startTime;
  const to = endTime || currentTime;
  let nextStartTime = currentTime;

  if (timestamp(from) > timestamp(to)) {
    this.logger.info('"Start Time" is higher than "End Time", finishing trigger process');
    await this.emit('end');
    return;
  }

  this.logger.info(`Filter "${sobject}" updated from ${timeToString(from)} to ${timeToString(to)}, page limit ${pageSize}`);

  const selectedFields = getSelectedFields(cfg);
  const options = {
    sobject,
    selectedObjects: linkedObjects.reduce((query, obj) => (obj.startsWith('!') ? query : `${query}, ${obj}.*`), selectedFields),
    linkedObjects,
    maxFetch: pageSize,
  };

  if (isDebugFlow) {
    options.maxFetch = 10;
    singlePagePerInterval = true;
    this.logger.info('Debug flow detected, set maxFetch to 10');
  }

  let proceed = true;
  let emitted;
  let iteration = 1;
  let results;
  try {
    do {
      options.whereCondition = `LastModifiedDate >= ${timeToString(from)} AND LastModifiedDate < ${timeToString(to)}`;
      this.logger.debug('Start poll object with options: %j', options);
      results = await callJSForceMethod.call(this, cfg, 'pollingSelectQuery', options);
      this.logger.info(`Polling iteration ${iteration} - ${results.length} results found`);
      iteration++;
      if (results.length !== 0) {
        emitted = true;
        if (results.length === pageSize) {
          this.logger.warn('All entries that have the same LastModifiedDate as the last entry will be deleted from the resulting array to prevent emitting duplicates');
          nextStartTime = results[results.length - 1].LastModifiedDate;
          results = results.filter((item) => item.LastModifiedDate !== nextStartTime);
          this.logger.warn('Entries that have the same LastModifiedDate as the last entry deleted. Current size of the resulting array is %s', results.length);
        } else {
          proceed = false;
        }
        if (emitBehavior === 'fetchPage') {
          this.logger.debug('Emit Behavior set as Fetch Page, going to emit one page...');
          await this.emit('data', messages.newMessageWithBody({ results }));
        } else if (emitBehavior === 'emitIndividually') {
          this.logger.debug('Emit Behavior set as Emit Individually, going to emit records one by one');
          for (const record of results) {
            await this.emit('data', messages.newMessageWithBody(record));
          }
        }
        if (singlePagePerInterval) proceed = false;
        from = nextStartTime;
      } else {
        proceed = false;
      }
    } while (proceed);
    this.logger.info('Processing Polling trigger finished successfully');
    this.logger.debug('Going to emit snapshot: %j', { nextStartTime });
    await this.emit('snapshot', { nextStartTime });
  } catch (e) {
    if (e.statusCode) {
      throw new Error(`Got error - ${e.name}\n message: \n${e.message}\n statusCode: \n${e.statusCode}\n body: \n${JSON.stringify(e.body)}`);
    }
    throw e;
  }

  if (isDebugFlow && !emitted) {
    throw new Error(`No object found. Execution stopped.
    This error is only applicable to the Retrieve Sample.
    In flow executions there will be no error, just an execution skip.`);
  }
};

module.exports.objectTypes = async function getObjectTypes(configuration) {
  return callJSForceMethod.call(this, configuration, 'getObjectTypes');
};

module.exports.getObjectFields = async function getObjectFields(configuration) {
  const fields = await callJSForceMethod.call(this, configuration, 'getObjectFieldsMetaData');
  const result = {};
  fields.forEach((field) => { result[field.name] = field.label; });
  return result;
};

module.exports.linkedObjectTypes = async function linkedObjectTypes(configuration) {
  const meta = await callJSForceMethod.call(this, configuration, 'describe');
  return getLinkedObjectTypes(meta);
};

module.exports.getMetaModel = async function getMetaModel(configuration) {
  const describeObject = await callJSForceMethod.call(this, configuration, 'describe');
  const metadata = await processMeta(describeObject, 'polling');
  const { outputMethod, selectedFields = [] } = configuration;
  if (selectedFields.length > 0) {
    const filteredOutMetadata = {};
    for (const outProperty of Object.keys(metadata.out.properties)) {
      if (selectedFields.includes(outProperty)) {
        filteredOutMetadata[outProperty] = metadata.out.properties[outProperty];
      }
    }
    metadata.out.properties = filteredOutMetadata;
  }
  if (outputMethod !== 'emitIndividually') {
    const outputArray = {
      type: 'object',
      required: true,
      properties: {
        results: {
          type: 'array',
          required: true,
          items: metadata.out,
        },
      },
    };
    return {
      in: metadata.in,
      out: outputArray,
    };
  }
  return metadata;
};
