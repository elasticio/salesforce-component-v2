/* eslint-disable no-loop-func */
const { messages } = require('elasticio-node');
const { callJSForceMethod } = require('../helpers/wrapper');
const { getLinkedObjectTypes, processMeta } = require('../helpers/utils');

const timestamp = (date) => new Date(date).getTime();
const timeToString = (date) => JSON.stringify(new Date(date)).replace(/"/g, '');
const isDateValid = (date) => new Date(date).toString() !== 'Invalid Date';
const isNumberNaN = (num) => Number(num).toString() === 'NaN';

exports.process = async function processTrigger(_msg, cfg, snapshot) {
  this.logger.info('Start processing "Get Updated Objects Polling" trigger');
  const currentTime = new Date();

  const {
    sobject,
    pageSize = 10000,
    linkedObjects = [],
    emitBehavior = 'emitIndividually',
    singlePagePerInterval,
  } = cfg;

  let { startTime, endTime } = cfg;
  if (!startTime) startTime = 0;
  if (!endTime) endTime = currentTime;
  if (!isDateValid(startTime)) throw new Error('invalid "Start Time" date format, use ISO 8601 Date time utc format - YYYY-MM-DDThh:mm:ssZ');
  if (!isDateValid(endTime)) throw new Error('invalid "End Time" date format, use ISO 8601 Date time utc format - YYYY-MM-DDThh:mm:ssZ');
  if (pageSize > 10000 || isNumberNaN(pageSize) || Number(pageSize) < 0) throw new Error('"Size of Polling Page" must be valid number between 0 and 10000');
  let from = snapshot?.nextStartTime || startTime;
  const to = endTime || currentTime;
  let nextStartTime = currentTime;

  if (timestamp(from) > timestamp(to)) {
    this.logger.info('"Start Time" is higher than "End Time", finishing trigger process');
    await this.emit('end');
    return;
  }

  this.logger.info(`Filter "${sobject}" updated from ${timeToString(from)} to ${timeToString(to)}, page limit ${pageSize}`);

  const options = {
    sobject,
    selectedObjects: linkedObjects.reduce((query, obj) => (obj.startsWith('!') ? query : `${query}, ${obj}.*`), '*'),
    linkedObjects,
    maxFetch: pageSize,
  };

  let proceed = true;
  let iteration = 1;
  try {
    do {
      options.whereCondition = `LastModifiedDate >= ${timeToString(from)} AND LastModifiedDate < ${timeToString(to)}`;

      let results = await callJSForceMethod.call(this, cfg, 'pollingSelectQuery', options);
      this.logger.info(`Polling iteration ${iteration} - ${results.length} results found`);
      iteration++;

      if (results.length !== 0) {
        if (results.length === Number(pageSize)) {
          const currentResultsLength = results.length;
          nextStartTime = results[results.length - 1].LastModifiedDate;
          const filteredResults = results.filter((item) => item.LastModifiedDate !== nextStartTime);
          if (currentResultsLength - filteredResults.length === 0) {
            this.logger.warn(`All results from this iteration have same "LastModifiedDate" - ${timeToString(nextStartTime)}, they will be proceed, but all objects in the next iteration will start from date strictly greater than this`);
            nextStartTime = new Date(new Date(nextStartTime).getTime() + 1);
          } else {
            results = filteredResults;
            this.logger.warn(`Founded ${currentResultsLength} results, which is equal to page limit.. New start time - ${timeToString(nextStartTime)}, ${currentResultsLength - results.length} result(s) excluded from this iteration`);
          }
          from = nextStartTime;
        } else {
          nextStartTime = currentTime;
          await this.emit('snapshot', { nextStartTime });
          proceed = false;
        }

        if (emitBehavior === 'fetchPage') {
          await this.emit('data', messages.newMessageWithBody({ results }));
        } else if (emitBehavior === 'emitIndividually') {
          for (const record of results) { await this.emit('data', messages.newMessageWithBody(record)); }
        }

        if (singlePagePerInterval) {
          await this.emit('snapshot', { nextStartTime });
          proceed = false;
        }
      } else {
        await this.emit('snapshot', { nextStartTime });
        await this.emit('end');
        proceed = false;
      }
    } while (proceed);
    this.logger.info('Processing Polling trigger finished successfully');
  } catch (e) {
    if (e.statusCode) {
      throw new Error(`Got error - ${e.name}\n message: \n${e.message}\n statusCode: \n${e.statusCode}\n body: \n${JSON.stringify(e.body)}`);
    }
    throw e;
  }
};

module.exports.objectTypes = async function getObjectTypes(configuration) {
  return callJSForceMethod.call(this, configuration, 'getObjectTypes');
};

module.exports.linkedObjectTypes = async function linkedObjectTypes(configuration) {
  const meta = await callJSForceMethod.call(this, configuration, 'describe');
  return getLinkedObjectTypes(meta);
};

module.exports.getMetaModel = async function getMetaModel(configuration) {
  const describeObject = await callJSForceMethod.call(this, configuration, 'describe');
  const metadata = await processMeta(describeObject, 'polling');
  const { outputMethod } = configuration;
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
