const path = require('path');

module.exports = {
  module: {
    rules: [
      {
        test: /\.(jpg|jpeg|png|gif)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[path][name].[ext]',
              outputPath: 'images/',
              publicPath: '/images/',
              context: path.resolve(__dirname, 'src')
            }
          }
        ]
      },
      {
        test: /\.(mp3|MP3|wav|WAV|ogg|OGG)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash].[ext]',
              outputPath: 'static/media/',
              publicPath: '/static/media/'
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  }
}; 