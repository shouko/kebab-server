/* eslint-disable no-console */
const http = require('http');
const fetch = require('node-fetch');
const config = require('./config');

const corsHeaders = { 'Access-Control-Allow-Origin': config.allowOrigin };

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  if (req.method === 'POST') {
    try {
      req.body = await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
          data += chunk;
          if (data.length > 1024 * 1024) reject();
        }).on('end', () => {
          try {
            resolve(JSON.parse(data.toString()));
          } catch (e) {
            reject(e);
          }
        });
      });

      if (
        !req.body.username
        || !req.body.token
        || !req.headers['x-api-version']
        || !req.headers['x-user-agent']
      ) throw new Error();

      const resp = await fetch(`${config.upstream}${req.url.split('?')[0]}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Version': req.headers['x-api-version'],
          Accept: '*/*',
          'User-Agent': req.headers['x-user-agent'],
        },
        body: JSON.stringify(req.body),
      }).then((r) => r.text());

      res.writeHead(200, {
        ...corsHeaders,
        'content-type': 'application/json; charset=utf-8',
      });
      return res.end(resp);
    } catch (e) {
      console.error(e);
      res.writeHead(400, corsHeaders);
      return res.end();
    }
  }

  if (req.method !== 'GET') {
    res.writeHead(405, corsHeaders);
    return res.end();
  }

  /* TODO: media proxy and cache

  if (!req.url.startsWith('/media/')) {
    res.writeHead(404, corsHeaders);
    return res.end();
  }

  const [,, host, ...path] = req.url.split('/');

  */

  res.writeHead(200, corsHeaders);
  return res.end('Hello World\n');
});

const listener = server.listen(config.porg || 3000, () => {
  console.log(listener.address().port);
});
