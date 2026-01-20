const axios = require('axios');
const client = require('elasticio-rest-node')();
const { URL } = require('url');
const path = require('path');
const packageJson = require('../package.json');
const compJson = require('../component.json');

const REQUEST_TIMEOUT = process.env.REQUEST_TIMEOUT || 10000; // 10s
const REQUEST_MAX_RETRY = process.env.REQUEST_MAX_RETRY || 3;
const REQUEST_RETRY_DELAY = process.env.REQUEST_RETRY_DELAY || 5000; // 5s

function addRetryCountInterceptorToAxios(ax) {
  ax.interceptors.response.use(undefined, (err) => { //  Retry count interceptor for axios
    const { config } = err;
    if (!config || !config.retry || !config.delay) { return Promise.reject(err); }
    config.currentRetryCount = config.currentRetryCount || 0;
    if (config.currentRetryCount >= config.retry) {
      return Promise.reject(err);
    }
    config.currentRetryCount += 1;
    return new Promise((resolve) => setTimeout(() => resolve(ax(config)), config.delay));
  });
}

function getUserAgent() {
  const { name: compName } = packageJson;
  const { version: compVersion } = compJson;
  const libVersion = packageJson.dependencies['@elastic.io/component-commons-library'];
  return `${compName}/${compVersion} component-commons-library/${libVersion}`;
}

module.exports.messages = {
  newMessageWithBody: (body) => ({ body, headers: {} }),
  newEmptyMessage: () => ({ body: {}, headers: {} }),
};

module.exports.createSignedUrl = async () => client.resources.storage.createSignedUrl();
module.exports.getUserAgent = getUserAgent;

function getSecretUri(secretId, isRefresh) {
  const parsedUrl = new URL(process.env.ELASTICIO_API_URI);
  parsedUrl.pathname = path.join(
    parsedUrl.pathname || '/',
    'v2/workspaces/',
    process.env.ELASTICIO_WORKSPACE_ID,
    'secrets',
    String(secretId),
    isRefresh ? 'refresh' : '',
  );
  return parsedUrl.toString();
}

module.exports.getSecret = async (emitter, secretId, msgId) => {
  const secretUri = getSecretUri(secretId);
  emitter.logger.debug('Going to fetch secret');
  const ax = axios.create();
  addRetryCountInterceptorToAxios(ax);
  const secret = await ax.get(secretUri, {
    timeout: REQUEST_TIMEOUT,
    retry: REQUEST_MAX_RETRY,
    delay: REQUEST_RETRY_DELAY,
    auth: {
      username: process.env.ELASTICIO_API_USERNAME,
      password: process.env.ELASTICIO_API_KEY,
    },
    headers: {
      'User-Agent': getUserAgent(),
      'x-request-id': `f:${process.env.ELASTICIO_FLOW_ID};s:${process.env.ELASTICIO_STEP_ID};m:${msgId || ''}`,
    },
  });
  const parsedSecret = secret.data.data.attributes;
  emitter.logger.debug('Got secret');
  return parsedSecret;
};

module.exports.refreshToken = async (emitter, secretId, msgId) => {
  const secretUri = getSecretUri(secretId, true);
  emitter.logger.info('going to refresh secret');
  const ax = axios.create();
  addRetryCountInterceptorToAxios(ax);
  const secret = await ax.post(secretUri, {}, {
    timeout: REQUEST_TIMEOUT,
    retry: REQUEST_MAX_RETRY,
    delay: REQUEST_RETRY_DELAY,
    auth: {
      username: process.env.ELASTICIO_API_USERNAME,
      password: process.env.ELASTICIO_API_KEY,
    },
    headers: {
      'User-Agent': getUserAgent(),
      'x-request-id': `f:${process.env.ELASTICIO_FLOW_ID};s:${process.env.ELASTICIO_STEP_ID};m:${msgId || ''}`,
    },
  });
  const token = secret.data.data.attributes.credentials.access_token;
  emitter.logger.info('Token refreshed');
  return token;
};

module.exports.isValidURL = (string) => {
  const res = string.match(/(http(s)?:\/\/.)/g);
  return (res !== null);
};
