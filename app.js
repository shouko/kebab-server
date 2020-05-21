/* eslint-disable no-console */
const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser');
const mime = require('mime-types');
const config = require('./config');

const app = express();
app.disable('x-powered-by');

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('access-control-allow-origin', config.allowOrigin);
  return next();
});

app.get('/', (req, res) => res.send('Hello World!\n'));

app.options((req, res) => res.sendStatus(204));

app.post('/*', async (req, res) => {
  try {
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

    res.contentType('application/json; charset=utf-8');
    return res.send(resp);
  } catch (e) {
    console.error(e);
    return res.sendStatus(400);
  }
});

app.get('/media/:host/*', async (req, res) => {
  const { host } = req.params;
  const rawQuery = req.originalUrl.split('?')[1] || '';
  const path = req.params[0];
  let fullPath = path;
  if (rawQuery.length > 0) {
    fullPath += `?${encodeURI(rawQuery)}`;
  }

  if (!config.mediaUpstreams.some((d) => host.endsWith(d))) {
    return res.sendStatus(400);
  }

  // TODO: cache
  try {
    const body = await fetch(`https://${host}/${fullPath}`)
      .then((resp) => resp.blob())
      .then((blob) => blob.arrayBuffer())
      .then((abuff) => Buffer.from(abuff, 'binary'));

    const contentType = mime.lookup(path);
    const allowedMimes = ['image/', 'video/'];
    if (allowedMimes.some((m) => contentType.startsWith(m))) {
      res.contentType(contentType);
    } else {
      res.contentType('application/octet-stream');
    }
    return res.send(body);
  } catch (e) {
    console.error(e);
  }

  return res.sendStatus(500);
});

const listener = app.listen(config.port, () => {
  console.log(`Listening on port ${listener.address().port}!`);
});
