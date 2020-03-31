const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin")

module.exports = {
  entry: path.resolve(__dirname, "reactSrc", "index.js"),
  output: {
    path: path.resolve(__dirname, "reactSrc", "build"),
    filename: 'popup.bundle.production.js'
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  mode: 'production',
  module: {
    rules: [
      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader",
        exclude: [
          path.resolve(__dirname, "node_modules")
        ],
      },
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader"
          }
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.(less|css)$/,
        use: ['style-loader', 'css-loader', 'less-loader']
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ]
  },
  plugins: [    
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "reactSrc", "popup.html"),
      output: {
        path: path.resolve(__dirname, "reactSrc", "build"),
        filename: 'popup.html'
      }
    })
  ],
};