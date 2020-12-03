const PROJECT_NAME = "openhps-core";
const LIBRARY_NAME = "@openhps/core";

const TerserPlugin = require('terser-webpack-plugin');
const InjectPlugin = require('webpack-inject-plugin').default;
const path = require('path');

module.exports = env => [
  {
    name: PROJECT_NAME,
    mode: env.prod ? "production" : "development",
    entry: './dist/cjs/index.js',
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: `web/${PROJECT_NAME}${env.prod ? ".min" : ""}.js`,
      library: LIBRARY_NAME,
      libraryTarget: 'umd',
      umdNamedDefine: true,
      globalObject: `(typeof self !== 'undefined' ? self : this)`,
    },
    resolve: {
      alias: {
        'typedjson': `typedjson/js/typedjson${env.prod ? ".min" : ""}.js`,
      }
    },
    externals: ['microtime', 'typescript'],
    optimization: {
      minimize: env.prod,
      minimizer: [
        new TerserPlugin({
          cache: true,
          parallel: true,
          terserOptions: {
            keep_classnames: true,
            keep_fnames: true
          }
        })
      ],
      portableRecords: true,
      usedExports: true,
      providedExports: true
    },
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  }, {
    name:`${PROJECT_NAME}-worker`,
    mode: env.prod ? "production" : "development",
    entry: './dist/cjs/nodes/_internal/WorkerNodeRunner.js',
    devtool: 'source-map',
    externals: {'../../': LIBRARY_NAME, 'microtime': 'microtime'},
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: `web/worker.${PROJECT_NAME}${env.prod ? ".min" : ""}.js`,
      library: LIBRARY_NAME,
      libraryTarget: 'umd',
      umdNamedDefine: true,
      globalObject: `(typeof self !== 'undefined' ? self : this)`,
    },
    plugins: [
      new InjectPlugin(function() {
        return "importScripts('openhps-core.min.js'); __WEBPACK_EXTERNAL_MODULE____ = self['@openhps/core'];"
      })
    ],
    optimization: {
      minimize: env.prod,
      minimizer: [
        new TerserPlugin({
          cache: true,
          parallel: true,
          terserOptions: {
            keep_classnames: true,
            keep_fnames: true
          }
        })
      ],
      portableRecords: true,
      usedExports: true,
      providedExports: true
    }
  }
];
