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
  if (!selectedFields.includes('Id')) {
    selectedFields.push('Id');
  }
  return selectedFields.toString();
}

exports.process = async function processTrigger(_msg, cfg, snapshot = {}) {
  this.logger.info('Start processing "Get Updated Objects Polling" trigger');
  const currentTime = new Date();

  // eslint-disable-next-line prefer-const
  let { lastModificationTime, lastSeenId } = snapshot;

  if (snapshot.nextStartTime) {
    this.logger.warn('Found a snapshot with the old format (nextStartTime), converting to the new format.');
    lastModificationTime = snapshot.nextStartTime;
  }

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
  if (!startTime) startTime = '1970-01-01T00:00:00.000Z';
  if (!endTime) endTime = currentTime;
  if (!isDateValid(startTime)) throw new Error('invalid "Start Time" date format, use ISO 8601 Date time utc format - YYYY-MM-DDThh:mm:ssZ');
  if (!isDateValid(endTime)) throw new Error('invalid "End Time" date format, use ISO 8601 Date time utc format - YYYY-MM-DDThh:mm:ssZ');
  if (pageSize > MAX_FETCH || isNumberNaN(pageSize) || Number(pageSize) < 0) throw new Error(`"Size of Polling Page" must be valid number between 0 and ${MAX_FETCH}`);
  pageSize = Number(pageSize);

  const from = lastModificationTime || startTime;
  const to = endTime || currentTime;

  if (timestamp(from) > timestamp(to)) {
    this.logger.info('"Start Time" is higher than "End Time", finishing trigger process');
    await this.emit('end');
    return;
  }

  this.logger.info(`Filter "${sobject}" updated from ${timeToString(from)} to ${timeToString(to)}, page limit ${pageSize}`);

  const countQuery = `SELECT COUNT() FROM ${sobject} WHERE LastModifiedDate >= ${timeToString(from)} AND LastModifiedDate < ${timeToString(to)}`;
  const countResult = await callJSForceMethod.call(this, cfg, 'simpleQuery', countQuery);
  this.logger.info(`Found ${countResult.totalSize} objects to process for this run.`);

  const selectedFields = getSelectedFields(cfg);
  const options = {
    sobject,
    selectedObjects: linkedObjects.reduce((query, obj) => (obj.startsWith('!') ? query : `${query}, ${obj}.*`), selectedFields),
    linkedObjects,
    maxFetch: pageSize,
    orderBy: 'LastModifiedDate, Id',
  };

  if (isDebugFlow) {
    options.maxFetch = 10;
    singlePagePerInterval = true;
    this.logger.info('Debug flow detected, set maxFetch to 10');
  }

  let proceed = true;
  let emitted = false;
  let iteration = 1;
  let results;
  let nextLastModificationTime = lastModificationTime;
  let nextLastSeenId = lastSeenId;

  try {
    do {
      const whereParts = [];
      if (nextLastModificationTime) {
        const lastDate = timeToString(nextLastModificationTime);
        if (nextLastSeenId) {
          whereParts.push(`(LastModifiedDate = ${lastDate} AND Id > '${nextLastSeenId}')`);
          whereParts.push(`(LastModifiedDate > ${lastDate})`);
        } else {
          whereParts.push(`LastModifiedDate >= ${lastDate}`);
        }
      } else {
        whereParts.push(`LastModifiedDate >= ${timeToString(from)}`);
      }
      whereParts.push(`LastModifiedDate < ${timeToString(to)}`);

      if (whereParts.length > 2) {
        options.whereCondition = `(${whereParts.slice(0, 2).join(' OR ')}) AND ${whereParts[2]}`;
      } else {
        options.whereCondition = whereParts.join(' AND ');
      }

      this.logger.debug('Start poll object with options: %j', options);
      results = await callJSForceMethod.call(this, cfg, 'pollingSelectQuery', options);
      this.logger.info(`Polling iteration ${iteration} - ${results.length} results found`);
      iteration++;

      if (results.length > 0) {
        emitted = true;
        const lastRecord = results[results.length - 1];
        nextLastModificationTime = lastRecord.LastModifiedDate;
        nextLastSeenId = lastRecord.Id;

        if (emitBehavior === 'fetchPage') {
          this.logger.debug('Emit Behavior set as Fetch Page, going to emit one page...');
          await this.emit('data', messages.newMessageWithBody({ results }));
        } else if (emitBehavior === 'emitIndividually') {
          this.logger.debug('Emit Behavior set as Emit Individually, going to emit records one by one');
          for (const record of results) {
            await this.emit('data', messages.newMessageWithBody(record));
          }
        }

        if (results.length < pageSize) {
          proceed = false;
        }

        if (singlePagePerInterval) {
          proceed = false;
        }
      } else {
        proceed = false;
      }
    } while (proceed);

    this.logger.info('Processing Polling trigger finished successfully');
    const newSnapshot = { lastModificationTime: nextLastModificationTime || from, lastSeenId: nextLastSeenId };
    this.logger.debug('Going to emit snapshot: %j', newSnapshot);
    await this.emit('snapshot', newSnapshot);
  } catch (e) {
    if (e.statusCode) {
      throw new Error(`Got error - ${e.name}\n message: \n${e.message}\n statusCode: \n${e.statusCode}\n body: \n${JSON.stringify(e.body)}`);
    }
    throw e;
  }

  if (isDebugFlow && !emitted) {
    throw new Error('No object found. Execution stopped.\n    This error is only applicable to the Retrieve Sample.\n    In flow executions there will be no error, just an execution skip.');
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
