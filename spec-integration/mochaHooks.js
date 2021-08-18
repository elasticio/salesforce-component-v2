const getEnvars = require('./getEnvars');

exports.mochaGlobalSetup = async () => {
  const {
    ELASTICIO_WORKSPACE_ID,
    AUTH_SECRET_ID,
    ELASTICIO_API_USERNAME,
    ELASTICIO_API_KEY,
    ELASTICIO_API_URI,
    ACCESS_TOKEN,
  } = await getEnvars();
  process.env.ELASTICIO_WORKSPACE_ID = ELASTICIO_WORKSPACE_ID;
  process.env.AUTH_SECRET_ID = AUTH_SECRET_ID;
  process.env.ELASTICIO_API_USERNAME = ELASTICIO_API_USERNAME;
  process.env.ELASTICIO_API_KEY = ELASTICIO_API_KEY;
  process.env.ELASTICIO_API_URI = ELASTICIO_API_URI;
  process.env.ACCESS_TOKEN = ACCESS_TOKEN;
  process.env.NODE_ENV = 'test';
};
