const path = require('path');
const webpack = require('webpack');

module.exports = function override(config) {
  // Asegura que Webpack resuelva los módulos en node_modules y src
  config.resolve.modules = [
    'node_modules',
    path.resolve(__dirname, 'src'),
  ];

  // Polyfills para node core modules que usa webpack 5
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

  // Alias para imports fully specified
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    'process/browser': 'process/browser.js',
  };

  // Provee variables globales
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  return config;
};
