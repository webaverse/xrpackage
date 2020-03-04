const http = require('http');
const express = require('express');
const ws = require('ws');
const fetch = require('node-fetch');
// const Web3 = require('./web3.min.js');
const Web3 = require('web3');
const RealityScriptEngine = require('./engine.js');
const realityScriptAbi = require('./reality-script-abi.json');
const {
  infuraProjectId,
} = require('./config.js');

const web3 = new Web3(new Web3.providers.HttpProvider(`https://rinkeby.infura.io/v3/${infuraProjectId}`));

const loadPromise = Promise.all([
  fetch(`https://cryptopolys.com/address.js`).then(res => res.text()).then(s => s.replace(/^export default `(.+?)`[\s\S]*$/, '$1')),
  fetch(`https://cryptopolys.com/abi.js`).then(res => res.text()).then(s => JSON.parse(s.replace(/^export default /, ''))),
]).then(([address, abi]) => {
  console.log('got address', address);
  const contract = new web3.eth.Contract(abi, address);
  return new RealityScriptEngine({web3, contract});
});

const app = express();
/* app.get('*', async (req, res, next) => {
  const contract = await loadPromise;
}); */
app.get('*', (req, res, next) => {
  res.end('Hello, RealityScript!');
});
const server = http.createServer(app);
const globalObjects = [];
const wss = new ws.Server({
  noServer: true,
});
wss.on('connection', async (s, req) => {
  // const o = url.parse(req.url, true);
  s.on('message', async m => {
    const engine = await loadPromise;

    if (typeof m === 'string') {
      const data = jsonParse(m);
      if (data) {
        const {method = '', args = {}} = data;
        switch (method) {
          case 'initState': {
            const {id, address, transform} = args;
            try {
              const result = await engine.initState(it, address, transform);
              s.send(JSON.stringify({
                result,
              }));
            } catch (err) {
              s.send(JSON.stringify({
                error: err.stack,
              }));
            }
            break;
          }
          case 'update': {
            const {oid, transform} = args;
            try {
              const result = await engine.update(oid, transform);
              s.send(JSON.stringify({
                result,
              }));
            } catch (err) {
              s.send(JSON.stringify({
                error: err.stack,
              }));
            }
            break;
          }
          default: {
            console.warn('unknown method');
            break;
          }
        }
      }
    } else {
      console.warn('cannot handle message', m);
    }
  });
});
wss.on('error', err => {
  console.warn(err.stack);
});
const _ws = (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, s => {
    wss.emit('connection', s, req);
  });
};
server.on('upgrade', _ws);
server.listen(3001);

/* const _warn = err => {
  console.warn('uncaught: ' + err.stack);
};
process.on('uncaughtException', _warn);
process.on('unhandledRejection', _warn); */