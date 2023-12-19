/* eslint-disable no-use-before-define, no-unused-vars */
const { messages } = require('elasticio-node');
const commons = require('@elastic.io/component-commons-library');
const { callJSForceMethod } = require('../helpers/wrapper');
const { getSecret, refreshToken } = require('../util');
const { PubSubClient } = require('../PubSubClient');

let client;
let context;
let refreshTokenNeeded = false;
let authFailureRetry = 1;
let nextStartReplayId;
const MAX_AUTH_RETRIES = 2;
let eventEmitter;
let creationInProgress = false;

const reconnectHandler = async (reconnectSleepTime, cfg) => {
  if (client) client.close();
  creationInProgress = false;
  client = undefined;
  await commons.sleep(reconnectSleepTime);
  await processTrigger.call(context, {}, cfg, { nextStartReplayId });
};

let healthCheckRunning = false;
const healthCheck = (cfg) => {
  if (client.getLastKeepAlive() < (new Date().getTime() - 300000)) {
    context.logger.warn('Last KeepAlive was more than 5 minutes ago, going to restart trigger');
    healthCheckRunning = false;
    reconnectHandler(20000, cfg);
  } else {
    if (!healthCheckRunning) setTimeout(() => healthCheck(cfg), 1000);
    healthCheckRunning = true;
  }
};

const isNumberNaN = (num) => Number(num).toString() === 'NaN';

async function processTrigger(msg, cfg, snapshot) {
  context = this;
  if (client) {
    this.logger.info(`Subscription is still running, last keepalive from Salesforce ${new Date(client.getLastKeepAlive()).toISOString()}, waiting for new messages`);
    client.setLogger(context.logger);
    return;
  }
  if (creationInProgress) {
    this.logger.info('Subscription recreate in progress');
    return;
  }
  creationInProgress = true;
  const { secretId } = cfg;
  let { eventCountPerRequest, initialReplayId } = cfg;

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
  context.logger.info('Starting "Subscribe to PubSub" trigger');
  client ||= new PubSubClient(context.logger, cfg);
  client.setLogger(context.logger);
  context.logger.info('Fetching credentials by secretId');
  const { credentials } = await getSecret(this, secretId, msg.id);
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.undefined_params.instance_url;
  nextStartReplayId = snapshot?.nextStartReplayId || initialReplayId;

  context.logger.info('Preparing SalesForce connection...');
  try {
    await client.connect(accessToken, instanceUrl);
    authFailureRetry = 1;
  } catch (err) {
    if (err.message.includes('UNAUTHENTICATED') && authFailureRetry <= MAX_AUTH_RETRIES) {
      context.logger.warn(`AuthFailure error occurred, lets call processTrigger one more time (retry ${authFailureRetry} of ${MAX_AUTH_RETRIES})`);
      authFailureRetry++;
      refreshTokenNeeded = true;
      await reconnectHandler(2000, cfg);
    } else {
      await context.emit('error', err);
      await reconnectHandler(2000, cfg);
    }
  }
  context.logger.info('SalesForce connected');

  context.logger.info('Creating streaming client');
  eventEmitter = await client.subscribe(eventCountPerRequest, snapshot?.nextStartReplayId || initialReplayId);
  context.logger.info('Streaming client created');

  eventEmitter.on('data', async (event) => {
    context.logger.info('Got new message, emitting');
    await context.emit('data', messages.newMessageWithBody(event));
    nextStartReplayId = event.replayId;
    await this.emit('snapshot', { nextStartReplayId });
  });

  await new Promise((resolve, reject) => {
    context.logger.info('Processing existing events if present and waiting for keepalive message to finish');
    eventEmitter.on('keepalive', async (data) => {
      resolve();
      nextStartReplayId = data.latestReplayId;
      await this.emit('snapshot', { nextStartReplayId });
    });
    eventEmitter.on('error', (error) => {
      reject(error);
    });
  });
  creationInProgress = false;

  if (process.env.ELASTICIO_FLOW_TYPE === 'ordinary') {
    client.close();
    client = undefined;
    context.logger.info('"Subscribe to PubSub" trigger finished successfully');
    return;
  }

  eventEmitter.on('error', () => {
    reconnectHandler(2000, cfg);
  });

  healthCheck(cfg);
}

async function getObjectTypes(configuration) {
  return callJSForceMethod.call(this, configuration, 'getPlatformEvents');
}

module.exports.process = processTrigger;
module.exports.objectTypes = getObjectTypes;
