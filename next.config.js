// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://18.119.121.25:10000/api/:path*',
      },
    ];
  },
};
