const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    process: require.resolve('process/browser.js'),
    stream: require.resolve('stream-browserify'),
    zlib: require.resolve('browserify-zlib'),
    crypto: require.resolve('crypto-browserify'),
    buffer: require.resolve('buffer'),
    path: require.resolve('path-browserify'),
    os: require.resolve('os-browserify/browser'),
    https: require.resolve('https-browserify'),
    http: require.resolve('stream-http'),
    fs: false, // NO se puede polyfillear en navegador
    net: false, // NO se puede polyfillear en navegador
    tls: false  // NO se puede polyfillear en navegador
  };

  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  return config;
};
