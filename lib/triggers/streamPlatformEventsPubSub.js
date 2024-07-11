/* eslint-disable no-use-before-define, no-unused-vars, no-empty */
const { messages } = require('elasticio-node');
const commons = require('@elastic.io/component-commons-library');
const { callJSForceMethod } = require('../helpers/wrapper');
const { getSecret, refreshToken } = require('../util');
const { PubSubClient } = require('../PubSubClient');

let client;
let context;
let refreshTokenNeeded = false;
let authFailureRetry = 1;
let connectFailureRetry = 1;
let keepaliveFailureRetry = 1;
let nextStartReplayId;
const MAX_AUTH_RETRIES = 2;
const MAX_CONNECT_RETRIES = 5;
let eventEmitter;
let creationInProgress = false;
let timeoutRef;

const saveSnapshot = () => {
  if (timeoutRef) clearTimeout(timeoutRef);
  timeoutRef = setTimeout(async () => {
    context.logger.debug(`Saving snapshot with nextStartReplayId: ${nextStartReplayId}`);
    await context.emit('snapshot', { nextStartReplayId });
    context.logger.debug('Snapshot saved');
  }, 2000);
};

const reconnectHandler = async (reconnectSleepTime, cfg) => {
  context.logger.warn(`Restarting in ${Math.round(reconnectSleepTime / 1000)} seconds`);
  if (client) try { client.close(); } catch (_e) { }
  creationInProgress = false;
  client = null;
  await commons.sleep(reconnectSleepTime);
  await processTrigger.call(context, {}, cfg, { nextStartReplayId });
};

let healthCheckRunning = false;
const healthCheck = (cfg) => {
  if (client) {
    try {
      const lastKeepAlive = client.getLastKeepAlive();
      const timeStampFiveMinutesAgo = new Date().getTime() - 300000;
      if (lastKeepAlive < timeStampFiveMinutesAgo) {
        context.logger.warn('Last KeepAlive was more than 5 minutes ago, going to restart trigger');
        reconnectHandler(2000, cfg);
        healthCheckRunning = false;
      } else {
        setTimeout(() => healthCheck(cfg), 1000);
      }
    } catch (err) {
      setTimeout(() => healthCheck(cfg), 1000);
    }
  } else {
    healthCheckRunning = false;
  }
};

const isNumberNaN = (num) => Number(num).toString() === 'NaN';

async function processTrigger(msg, cfg, snapshot) {
  context = this;
  if (client && client.getLastKeepAlive()) {
    this.logger.info(`Subscription is still running, last keepalive from Salesforce ${new Date(client.getLastKeepAlive()).toISOString()}, waiting for new messages`);
    client.setLogger(context.logger);
    return;
  }
  if (creationInProgress) {
    this.logger.info('Subscription recreate in progress');
    return;
  }
  creationInProgress = true;
  context.logger.info('Starting "Subscribe to PubSub" trigger');

  const { secretId } = cfg;
  let { eventCountPerRequest = 10, initialReplayId } = cfg;

  if (eventCountPerRequest && (isNumberNaN(eventCountPerRequest) || Number(eventCountPerRequest) <= 0 || Number(eventCountPerRequest) > 100)) {
    throw new Error('"Number of events per request" must be valid number between 1 and 100');
  }
  if (initialReplayId && (isNumberNaN(eventCountPerRequest) || Number(eventCountPerRequest) <= 0)) {
    throw new Error('"Start from Replay Id" must be a valid number above 0');
  }

  if (eventCountPerRequest) eventCountPerRequest = Number(eventCountPerRequest);
  if (initialReplayId) initialReplayId = Number(initialReplayId);

  if (!secretId) {
    context.logger.error('secretId is missing in configuration, credentials cannot be fetched');
    creationInProgress = false;
    throw new Error('secretId is missing in configuration, credentials cannot be fetched');
  }
  if (refreshTokenNeeded) {
    await refreshToken(context, secretId, msg.id);
    refreshTokenNeeded = false;
  }

  client ||= new PubSubClient(context.logger, cfg);
  client.setLogger(context.logger);
  context.logger.info('Fetching credentials by secretId');
  const { credentials } = await getSecret(this, secretId, msg.id);
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.undefined_params.instance_url;
  nextStartReplayId = nextStartReplayId || snapshot?.nextStartReplayId;

  let replayIdFromConfig = false;
  if (!nextStartReplayId && initialReplayId) {
    replayIdFromConfig = true;
    nextStartReplayId = initialReplayId;
  }

  let emittedOrAlive = false;
  const timeOut = async (t) => {
    await commons.sleep(t);
    if (!emittedOrAlive) throw new Error(`TimeOut ${t}ms limit reached`);
  };

  context.logger.info('Preparing SalesForce connection...');
  try {
    await Promise.race([
      client.connect(accessToken, instanceUrl),
      timeOut(30000),
    ]);
    authFailureRetry = 1;
    connectFailureRetry = 1;
  } catch (err) {
    if (err.message.includes('UNAUTHENTICATED') && authFailureRetry <= MAX_AUTH_RETRIES) {
      context.logger.warn(`AuthFailure error occurred, lets call processTrigger one more time (retry ${authFailureRetry} of ${MAX_AUTH_RETRIES})`);
      authFailureRetry++;
      refreshTokenNeeded = true;
      await reconnectHandler(2000, cfg);
    } else if (connectFailureRetry <= MAX_CONNECT_RETRIES) {
      context.logger.warn(`Got error during connection to Salesforce: ${err.message}, lets call processTrigger one more (retry ${connectFailureRetry} of ${MAX_CONNECT_RETRIES})`);
      connectFailureRetry++;
      await reconnectHandler(Math.round(2 ** (connectFailureRetry + 5)) * 1000, cfg);
    } else {
      context.logger.error(`Failed to connect to Salesforce: ${err.message}`);
      await context.emit('error', err);
      throw err;
    }
  }
  context.logger.info('SalesForce connected');

  eventEmitter = await client.subscribe(eventCountPerRequest, nextStartReplayId);
  context.logger.info('Streaming client created');

  eventEmitter.on('data', async (event) => {
    context.logger.info(`Got new message, replayId: ${event.event.replayId}, emitting`);
    await context.emit('data', messages.newMessageWithBody(event));
    nextStartReplayId = event.event.replayId;
    emittedOrAlive = true;
    saveSnapshot();
  });

  eventEmitter.once('keepalive', (data) => { context.logger.info(`Got keepalive message, replayId: ${data.latestReplayId}`); });

  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        context.logger.info('Processing existing events if present and waiting for keepalive message to finish');
        eventEmitter.on('keepalive', async (data) => {
          keepaliveFailureRetry = 1;
          emittedOrAlive = true;
          nextStartReplayId = data.latestReplayId;
          saveSnapshot();
          resolve();
        });
        eventEmitter.on('error', (error) => {
          reject(error);
        });
      }),
      timeOut(300000),
    ]);
  } catch (err) {
    if (!err.message?.includes('INVALID_ARGUMENT') && keepaliveFailureRetry <= MAX_CONNECT_RETRIES) {
      context.logger.warn(`Failed to get keepalive message to finish: ${err.message}, lets call processTrigger one more time (retry ${keepaliveFailureRetry} of ${MAX_CONNECT_RETRIES})`);
      keepaliveFailureRetry++;
      await reconnectHandler(Math.round(2 ** (keepaliveFailureRetry + 5)) * 1000, cfg);
    } else if (err.message.includes('INVALID_ARGUMENT') && !replayIdFromConfig) {
      context.logger.error(`Failed to get keepalive message to finish, replayId in seems to be invalid, it will be ignored: ${err.message}, lets call processTrigger one more time (retry ${keepaliveFailureRetry} of ${MAX_CONNECT_RETRIES})`);
      keepaliveFailureRetry++;
      await context.emit('snapshot', { });
      nextStartReplayId = null;
      await reconnectHandler(Math.round(2 ** (keepaliveFailureRetry + 5)) * 1000, cfg);
    } else {
      context.logger.error(`Failed to get keepalive message to finish: ${err.message}`);
      await context.emit('error', err);
      throw err;
    }
  }

  creationInProgress = false;

  if (process.env.ELASTICIO_FLOW_TYPE === 'ordinary') {
    try { client.close(); } catch (_e) { }
    client = null;
    context.logger.info('"Subscribe to PubSub" trigger finished successfully');
    return;
  }

  eventEmitter.on('error', () => {
    reconnectHandler(2000, cfg);
  });

  if (!healthCheckRunning) {
    healthCheck(cfg);
    healthCheckRunning = true;
  }
}

async function getObjectTypes(configuration) {
  return callJSForceMethod.call(this, configuration, 'getPlatformEvents');
}

module.exports.process = processTrigger;
module.exports.objectTypes = getObjectTypes;
