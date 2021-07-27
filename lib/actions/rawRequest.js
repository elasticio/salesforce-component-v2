const axios = require('axios');
const fs = require('fs');
const { messages } = require('elasticio-node');
const { Logger } = require('@elastic.io/component-commons-library');
const common = require('../common.js');
const { getSecret, refreshToken } = require('../util');

if (fs.existsSync('.env')) {
  // eslint-disable-next-line global-require
  require('dotenv').config();
}

const logger = Logger.getLogger();

const SALESFORCE_VERSION = common.globalConsts.SALESFORCE_API_VERSION;
const { REFRESH_TOKEN_RETRIES } = common.globalConsts;

async function processAction(msg, cfg) {
  this.logger = logger;
  const { method, path, body } = msg.body;
  const { secretId } = cfg;
  let accessToken;
  let instanceUrl;
  if (secretId) {
    logger.debug('Trying to get token');
    const { credentials } = await getSecret(this, secretId);
    accessToken = credentials.access_token;
    instanceUrl = credentials.undefined_params.instance_url;
    logger.debug('Token has been received');
  }
  let result;
  let isSuccess = false;
  let iteration = REFRESH_TOKEN_RETRIES;

  do {
    iteration -= 1;
    try {
      logger.debug('Iteration: %s', REFRESH_TOKEN_RETRIES - iteration);
      logger.debug('Trying to call method %s', method);
      const basePath = `/services/data/v${SALESFORCE_VERSION}/`;
      const resourcePath = (path.trim().charAt(0) === '/') ? path.trim().slice(1) : path.trim();
      const rawRequestPath = `${instanceUrl}${basePath}${resourcePath}`;
      const lowerCasedMethod = method.toLowerCase();
      const rawRequestConfig = {
        method: lowerCasedMethod,
        url: rawRequestPath,
        headers: {
          Authorization: `Bearer ${accessToken && accessToken.replace(/"|'/g, '')}`,
          'Content-Type': 'application/json',
        },
        data: body || '',
      };
      const rawRequest = await axios(rawRequestConfig);
      logger.debug('Raw request complete');
      result = messages.newMessageWithBody(rawRequest.data);
      isSuccess = true;
      logger.debug('Method %s was successfully executed', method);
      break;
    } catch (e) {
      logger.error('Got error %s', e.name || '');
      if (e.name === 'INVALID_SESSION_ID') {
        try {
          logger.debug('Session is expired, trying to refresh token...');
          accessToken = await refreshToken(this, secretId);
        } catch (err) {
          logger.error('Failed to refresh token');
        }
      } else {
        throw e;
      }
    }
  } while (iteration > 0);

  if (!isSuccess) {
    throw new Error('Failed to fetch and/or refresh token, retries exceeded');
  }
  return result;
}

module.exports.process = processAction;