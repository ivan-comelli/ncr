module.exports = function override(config, env) {
  // Modifica la configuración de Webpack aquí
  console.log('Configuración de Webpack sobreescrita');
  
  // Ejemplo: Agregar un polyfill para 'crypto-browserify'
  config.resolve.fallback = {
    ...config.resolve.fallback,
    assert: require.resolve('assert/'),
    buffer: require.resolve('buffer/'),
    crypto: require.resolve('crypto-browserify'),
    fs: false, // fs no se puede usar en el navegador
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    net: false, // net no se puede usar en el navegador
    os: require.resolve('os-browserify/browser'),
    path: require.resolve('path-browserify'),
    querystring: require.resolve('querystring-es3'),
    stream: require.resolve('stream-browserify'),
    tls: false, // tls no se puede usar en el navegador
    url: require.resolve('url/'),
    util: require.resolve('util/'),
    zlib: require.resolve('browserify-zlib') // Polyfill para zlib
  };

  return config;
};