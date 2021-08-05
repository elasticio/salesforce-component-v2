/**
 * Note: For this function your need setup credentials for the component first
 */

/* eslint-disable camelcase, import/no-extraneous-dependencies */
const axios = require('axios');
require('dotenv').config();

const {
  WORKSPACE_ID, AUTH_SECRET_ID, EMAIL, APIKEY,
} = process.env;

module.exports = async () => {
  if (!WORKSPACE_ID || !AUTH_SECRET_ID || !EMAIL || !APIKEY) {
    throw new Error('Please set all the environment variables (see example in .env.example');
  }
  try {
    const apiUrl = `https://api.elastic.io/v2/workspaces/${WORKSPACE_ID}/secrets/${AUTH_SECRET_ID}/refresh`;
    const { data } = await axios.post(apiUrl, {}, {
      auth: {
        username: EMAIL,
        password: APIKEY,
      },
    });
    const { access_token } = data.data.attributes.credentials;
    return access_token;
  } catch (err) {
    console.log('Error while trying refresh token:');
    throw new Error(err);
  }
};
