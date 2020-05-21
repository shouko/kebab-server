require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  upstream: process.env.UPSTREAM || '',
  mediaUpstreams: (process.env.MEDIA_UPSTREAMS || '').split(','),
  allowOrigin: process.env.ALLOW_ORIGIN,
};
