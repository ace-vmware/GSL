const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack')

module.exports = {
  entry: ["./src/index.js",],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "src/index.html"),
          to: path.resolve(__dirname, "dist/index.html")
        },

        {
          from: path.resolve(__dirname, "src/styles/main.css"),
          to: path.resolve(__dirname, "dist/styles/main.css")
        },
        {
          from: path.resolve(__dirname, "src/callback.html"),
          to: path.resolve(__dirname, "dist/callback.html")
        },
        {
          from: path.resolve(__dirname, "src/server.js"),
          to: path.resolve(__dirname, "dist/server.js")
        }
      ],
    }),
    new Dotenv({
      path: path.resolve(__dirname, './.env'),
      systemvars: true
    }),
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"]
          }
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  optimization: {
    minimize: false
  }
};