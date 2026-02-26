const { callJSForceMethod } = require('./lib/helpers/wrapper');

module.exports = async function verify(credentials) {
  try {
    this.logger.info('Going to make request describeGlobal() for verifying credentials...');
    const result = await callJSForceMethod.call(this, credentials, 'describeGlobal');
    this.logger.info('Credentials are valid, it was found sobjects count: %s', result.sobjects.length);
    return { verified: true };
  } catch (e) {
    this.logger.error(e);
    if (e.message && e.message.includes('reason:')) {
      const match = e.message.match(/reason:\s*(.+)$/);
      if (match) {
        const error = new Error(match[1].trim());
        error.name = e.name;
        throw error;
      }
    }
    throw e;
  }
};
