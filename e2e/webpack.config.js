const { join } = require('path')

const target = 'web'

module.exports = {
  mode: 'development',
  target,
  entry: {
    plugin: './src/plugin.ts',
    parent: './src/parent.ts',
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js',
    path: __dirname + '/dist',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
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
