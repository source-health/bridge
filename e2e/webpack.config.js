const { join } = require('path')

/**
 * This is a modified version of the 'real' build that gives us a webpack dev server we can hit from the e2e Playwright
 * tests. The main differences are: no .min or .node builds, entry points are the scripts used in our test html files,
 * and dev server.
 */

module.exports = {
  mode: 'development',
  target: 'web',
  entry: {
    plugin: './src/plugin.ts',
    legacy_plugin: './src/legacy_plugin.ts',
    plugin_parent: './src/plugin_parent.ts',
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js',
    path: __dirname + '/dist',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.ts'],
    fallback: {
      http: false,
      https: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  devServer: {
    static: ['./static'],
  },
}
