/* eslint-disable no-console */
const http = require('http');
const fetch = require('node-fetch');
const mimes = require('mime-types');
const etag = require('etag');
const config = require('./config');

const corsHeaders = { 'access-control-allow-origin': config.allowOrigin };

const send = (res, code, msg) => {
  res.writeHead(code, corsHeaders);
  res.end(msg || '');
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, 204);
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
      return send(res, 400);
    }
  }

  if (req.method !== 'GET') {
    return send(res, 405);
  }

  if (req.url.split('?')[0] === '/') {
    return send(res, 200, 'Hello World\n');
  }

  if (!req.url.startsWith('/media/')) {
    return send(res, 404);
  }

  const [,, host, ...path] = req.url.split('/');
  if (!config.mediaUpstreams.some((d) => host.endsWith(d))) {
    return send(res, 400);
  }

  // TODO: cache
  try {
    const body = await fetch(`https://${host}/${path.join('/')}`)
      .then((resp) => resp.blob())
      .then((blob) => blob.arrayBuffer())
      .then((abuff) => Buffer.from(abuff, 'binary'));

    const contentType = mimes.lookup(req.url.split('?')[0]) || 'application/octet-stream';

    res.writeHead(200, {
      ...corsHeaders,
      etag: etag(body),
      'content-type': (() => {
        if (['image/', 'video/'].some((prefix) => contentType.startsWith(prefix))) {
          return contentType;
        }
        return 'application/octet-stream';
      })(),
    });
    return res.end(body);
  } catch (e) {
    console.error(e);
    send(res, 500);
  }

  return send(res, 500);
});

const listener = server.listen(config.port || 3000, () => {
  console.log(listener.address().port);
});
