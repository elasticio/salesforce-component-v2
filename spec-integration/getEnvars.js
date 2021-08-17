/**
 * Note: For this function your need to setup credentials on platform first
 */

/* eslint-disable camelcase */
const axios = require('axios');
require('dotenv').config();

const {
  ELASTICIO_WORKSPACE_ID, AUTH_SECRET_ID, ELASTICIO_API_USERNAME, ELASTICIO_API_KEY, ELASTICIO_API_URI,
} = process.env;

module.exports = async () => {
  if (!ELASTICIO_WORKSPACE_ID || !AUTH_SECRET_ID || !ELASTICIO_API_USERNAME || !ELASTICIO_API_KEY || !ELASTICIO_API_URI) {
    throw new Error('Please set all the environment variables (see example in .env.example');
  }
  try {
    const refreshTokenUrl = `${ELASTICIO_API_URI}/v2/workspaces/${ELASTICIO_WORKSPACE_ID}/secrets/${AUTH_SECRET_ID}/refresh`;
    const { data } = await axios.post(refreshTokenUrl, {}, {
      auth: {
        username: ELASTICIO_API_USERNAME,
        password: ELASTICIO_API_KEY,
      },
    });
    const { access_token } = data.data.attributes.credentials;
    return {
      ELASTICIO_WORKSPACE_ID,
      AUTH_SECRET_ID,
      ELASTICIO_API_USERNAME,
      ELASTICIO_API_KEY,
      ELASTICIO_API_URI,
      ACCESS_TOKEN: access_token,
    };
  } catch (err) {
    console.log('Error while trying refresh token:');
    throw new Error(err);
  }
};
