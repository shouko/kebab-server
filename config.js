require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  upstream: process.env.UPSTREAM || '',
  allowOrigin: process.env.ALLOW_ORIGIN,
};
