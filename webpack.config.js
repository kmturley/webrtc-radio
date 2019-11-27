const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs');
const path = require('path');

const OUTPUT_FOLDER = 'dist';

module.exports = {
  entry: {
    app: './src/js/index.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, OUTPUT_FOLDER),
  },
  plugins: [
    // new CleanWebpackPlugin(),
    new CopyPlugin([
      { from: './src/index.html' },
    ]),
  ],
  devServer: {
    contentBase: './' + OUTPUT_FOLDER,
    https: {
      key: fs.readFileSync('./keys/client-key.pem'),
      cert: fs.readFileSync('./keys/client-cert.pem'),
    },
    hot: true,
    host: '0.0.0.0',
    port: 4200,
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['@babel/preset-env'],
          plugins: [
            '@babel/transform-runtime',
            '@babel/plugin-syntax-dynamic-import',
            '@babel/plugin-proposal-class-properties'
          ]
        }
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader',
        ],
      },
    ],
  },
};
