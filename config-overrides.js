const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    process: require.resolve('process/browser.js'),
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    path: require.resolve('path-browserify'),
    os: require.resolve('os-browserify/browser'),
    https: require.resolve('https-browserify'),
    http: require.resolve('stream-http'),
    buffer: require.resolve('buffer'),
  };

  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'process/browser': 'process/browser.js',
  };

  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  return config;
};
