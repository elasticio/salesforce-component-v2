const getAccessToken = require('./getAccessToken');

exports.mochaGlobalSetup = async () => {
  const ACCESS_TOKEN = await getAccessToken();
  process.env.ACCESS_TOKEN = ACCESS_TOKEN;
};
