const axios = require('axios');
const fs = require('fs');
const { Logger, getErrMsg } = require('@elastic.io/component-commons-library');
const { messages } = require('../util');
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
  const { method, path, body } = msg.body;
  const { secretId } = cfg;
  let accessToken;
  let instanceUrl;
  if (secretId) {
    logger.debug('Trying to get access token');
    try {
      this.logger.debug('Fetching credentials by secretId');
      const { credentials } = await getSecret(this, secretId, msg.id);
      accessToken = credentials.access_token;
      instanceUrl = credentials.undefined_params.instance_url;
      logger.debug('Access token has been received');
    } catch (e) {
      logger.error('Got error %s while request token', e.name || '');
    }
  }
  let result;
  let isSuccess = false;
  let iteration = REFRESH_TOKEN_RETRIES;

  do {
    iteration -= 1;
    try {
      logger.debug('Iteration: %s', REFRESH_TOKEN_RETRIES - iteration);
      logger.info('Trying to call method %s', method);
      const basePath = `/services/data/v${SALESFORCE_VERSION}/`;
      const resourcePath = (path.trim().charAt(0) === '/') ? path.trim().slice(1) : path.trim();
      const lowerCasedMethod = method.toLowerCase();
      const rawRequestConfig = {
        baseURL: `${instanceUrl}${basePath}`,
        method: lowerCasedMethod,
        url: resourcePath,
        headers: {
          Authorization: `Bearer ${accessToken && accessToken.replace(/"|'/g, '')}`,
          'Content-Type': 'application/json',
        },
        data: body || '',
      };
      logger.info('Raw request started');
      const rawRequest = await axios(rawRequestConfig);
      logger.info('Raw request complete');
      result = messages.newMessageWithBody(rawRequest.data);
      isSuccess = true;
      logger.info('Method %s was successfully executed', method);
      break;
    } catch (e) {
      if (e.name === 'INVALID_SESSION_ID') {
        try {
          logger.debug('Session is expired, trying to refresh token...');
          accessToken = await refreshToken(this, secretId, msg.id);
          this.logger.debug('Token is successfully refreshed');
        } catch (err) {
          logger.error('Failed to refresh token');
        }
      } else {
        if (e.response) throw new Error(getErrMsg(e.response));
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
