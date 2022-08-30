module.exports = {
  env: {
    commonjs: true,
    es6: true,
    mocha: true,
  },
  extends: 'airbnb-base',
  parser: 'babel-eslint',
  rules: {
    'no-await-in-loop': 0,
    'max-len': 0,
    'no-restricted-syntax': 0,
    'no-plusplus': 0,
  },
};
