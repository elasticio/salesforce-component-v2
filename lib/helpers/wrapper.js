/* eslint-disable no-await-in-loop */
const { SalesForceClient } = require('../salesForceClient');
const { getSecret, refreshToken } = require('../util');
const { REFRESH_TOKEN_RETRIES } = require('../common.js').globalConsts;

let client;
let secret;
const timeOut = async (t) => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(t);
  throw new Error(`UPSERT_TIME_OUT ${t}ms limit reached`);
};

exports.callJSForceMethod = async function callJSForceMethod(configuration, method, options) {
  this.logger.debug('Preparing SalesForce Client...');
  let accessToken;
  let instanceUrl;
  const { secretId } = configuration;
  if (secretId) {
    this.logger.debug('Fetching credentials by secretId');
    if (!secret) {
      secret = await getSecret(this, secretId);
    }
    accessToken = secret.credentials.access_token;
    instanceUrl = secret.credentials.undefined_params.instance_url;
  } else {
    this.logger.debug('Fetching credentials from configuration');
    accessToken = configuration.oauth.access_token;
    instanceUrl = configuration.oauth.undefined_params.instance_url;
  }
  let result;
  let isSuccess = false;
  let iteration = REFRESH_TOKEN_RETRIES;
  let retry = true;
  do {
    iteration -= 1;
    try {
      this.logger.debug('Iteration: %s', REFRESH_TOKEN_RETRIES - iteration);
      const cfg = {
        ...configuration,
        access_token: accessToken,
        instance_url: instanceUrl,
      };
      if (!client || Object.entries(client.configuration).toString() !== Object.entries(cfg).toString()) {
        this.logger.debug('Try to create SalesForce Client', REFRESH_TOKEN_RETRIES - iteration);
        client = new SalesForceClient(this, cfg);
        this.logger.debug('SalesForce Client is created');
      }
      this.logger.debug('Trying to call method %s', method);
      result = configuration.timeOut ? await Promise.race([client[method](options), timeOut(configuration.timeOut)]) : await client[method](options);
      isSuccess = true;
      this.logger.debug('Method %s was successfully executed', method);
      break;
    } catch (e) {
      this.logger.error(`Got error ${e.name} - ${e.message}`);
      if (e.name === 'INVALID_SESSION_ID') {
        try {
          this.logger.debug('Session is expired, trying to refresh token...');
          const newSecret = await getSecret(this, secretId);
          if (newSecret.credentials.access_token !== accessToken) {
            this.logger.debug('token changed, trying to use new one');
            secret = newSecret;
            accessToken = secret.credentials.access_token;
            instanceUrl = secret.credentials.undefined_params.instance_url;
          } else {
            await refreshToken(this, secretId);
            secret = await getSecret(this, secretId);
            accessToken = secret.credentials.access_token;
            instanceUrl = secret.credentials.undefined_params.instance_url;
            this.logger.debug('Token is successfully refreshed');
          }
          client = undefined;
        } catch (err) {
          this.logger.error('Failed to refresh token');
        }
      } else if (retry) {
        client = undefined;
        retry = false;
      } else {
        throw e;
      }
    }
  } while (iteration > 0);
  if (!isSuccess) {
    throw new Error('Failed to fetch and/or refresh token, retries exceeded');
  }
  return result;
};
