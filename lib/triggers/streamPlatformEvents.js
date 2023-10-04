/* eslint-disable no-empty */
const jsforce = require('jsforce');
const { messages } = require('elasticio-node');
const { callJSForceMethod } = require('../helpers/wrapper');
const { getSecret, refreshToken } = require('../util');
const { SALESFORCE_API_VERSION } = require('../common.js').globalConsts;

let fayeClient;
let context;
let refreshTokenNeeded = false;
let creationInProgress = false;
/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param configuration configuration that is account information and configuration field values
 */
async function processTrigger(msg, configuration) {
  context = this;
  if (fayeClient) {
    this.logger.info('Subscription is still running, waiting for new messages');
    return;
  }
  if (creationInProgress) {
    this.logger.info('Subscription recreate in progress');
    return;
  }
  if (fayeClient) fayeClient = undefined;
  creationInProgress = true;
  context.logger.info('Starting Subscribe to platform events Trigger');

  const { secretId } = configuration;
  if (!secretId) {
    context.logger.error('secretId is missing in configuration, credentials cannot be fetched');
    creationInProgress = false;
    throw new Error('secretId is missing in configuration, credentials cannot be fetched');
  }
  if (refreshTokenNeeded) {
    await refreshToken(context, secretId, msg.id);
    refreshTokenNeeded = false;
  }
  context.logger.debug('Fetching credentials by secretId');
  const { credentials } = await getSecret(this, secretId, msg.id);
  const accessToken = credentials.access_token;
  const instanceUrl = credentials.undefined_params.instance_url;
  context.logger.debug('Preparing SalesForce connection...');
  const connection = new jsforce.Connection({
    instanceUrl,
    accessToken,
    version: SALESFORCE_API_VERSION,
  });
  const topic = `/event/${configuration.object}`;
  const replayId = -1;
  context.logger.debug('Creating streaming client');

  fayeClient = connection.streaming.createClient([
    new jsforce.StreamingExtension.Replay(topic, replayId),
    new jsforce.StreamingExtension.AuthFailure((err) => {
      let errMsg = '';
      try {
        errMsg = JSON.stringify(err);
      } catch (e) {
        errMsg = err;
      }
      context.logger.warn(`AuthFailure error occurred ${errMsg}`);
      refreshTokenNeeded = true;
      fayeClient = undefined;
      creationInProgress = false;
      context.logger.info('Lets call processTrigger one more time');
      processTrigger.call(context, msg, configuration);
    }),
  ]);

  fayeClient.on('transport:down', () => {
    context.logger.error('Client is offline');
  });

  fayeClient.on('transport:up', () => {
    context.logger.info('Client is online');
  });

  await fayeClient.subscribe(topic, async (message) => {
    context.logger.info('Incoming message found, going to emit...');
    await context.emit('data', messages.newMessageWithBody(message));
  });
  creationInProgress = false;
  context.logger.info('Subscribed to PushTopic successfully');
  context.logger.trace(`Subscribed to PushTopic: ${topic}`);

  context.logger.info('Streaming client created and ready');
}

/**
 * This function will be called to fetch available object types. *
 * Note: only updatable and creatable object types are returned here *
 * @param configuration
 */
async function getObjectTypes(configuration) {
  return callJSForceMethod.call(this, configuration, 'getPlatformEvents');
}

module.exports.process = processTrigger;
module.exports.objectTypes = getObjectTypes;
