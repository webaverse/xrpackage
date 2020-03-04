const express = require('express');
const ws = require('ws');
const fetch = require('node-fetch');
// const Web3 = require('./web3.min.js');
const Web3 = require('web3');
const realityScriptAbi = require('./reality-script-abi.js');
const {
  infuraProjectId,
  account,
} = require('./config.js');

function jsonParse(s) {
  try {
    return JSON.parse(s);
  } catch(err) {
    return null;
  }
}
const getRandomId = () => Math.random().toString(36).substring(7);

const web3 = new Web3(
  // Replace YOUR-PROJECT-ID with a Project ID from your Infura Dashboard
  new Web3.providers.HttpProvider(`https://rinkeby.infura.io/v3/${infuraProjectId}`)
);

const loadPromise = Promise.all([
  fetch(`https://raw.githubusercontent.com/exokitxr/polys/contract/address.js`).then(res => res.text()).then(s => s.replace(/^export default `(.+?)`[\s\S]*$/, '$1')),
  fetch(`https://raw.githubusercontent.com/exokitxr/polys/contract/abi.js`).then(res => res.text()).then(s => JSON.parse(s.replace(/^export default /, ''))),
]).then(([address, abi]) => {
  // console.log('got address + abi', {address, abi});
  return new web3.eth.Contract(abi, address);
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
const presenceWss = new ws.Server({
  noServer: true,
});
presenceWss.on('connection', async (s, req) => {
  // const o = url.parse(req.url, true);
  const localObjects = [];
  s.on('message', async m => {
    if (typeof m === 'string') {
      const data = jsonParse(m);
      if (data) {
        const {method, args} = data;
        switch (method) {
          case 'initState': {
            const {id, address, transform} = args;
            const contractAddress = await contract.methods.getContract(id).call();
            const contract = new web3.eth.Contract(realityScriptAbi, contractAddress);
            const state = await contract.methods.initState(address, transform).call();
            const oid = getRandomId();
            globalObjects[oid] = {
              contract,
              state,
            };
            s.send(JSON.stringify({
              result: {
                oid,
                state,
              },
              error: null,
            }));
            break;
          }
          case 'update': {
            const {oid, transform} = args;
            const object = globalObjects[oid];
            if (object) {
              const [apply, state] = await object.contract.methods.update(transform, [], object.state).call();
              object.state = state;
              if (apply) {
                const gasPrice = await web3.eth.getGasPrice();
                const estimatedGas = await object.contract.methods.applyState(object.state).estimateGas({
                  from: account,
                  gasPrice,
                });
                console.log('do apply', object.state, estimatedGas); // XXX
              }
              s.send(JSON.stringify({
                result: {
                  state,
                },
                error: null,
              }));
            } else {
              s.send(JSON.stringify({
                result: null,
                error: 'object not found',
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
const _ws = (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, s => {
    wss.emit('connection', s, req);
  });
};
server.on('upgrade', _ws);
server.listen(30001);

/* const _warn = err => {
  console.warn('uncaught: ' + err.stack);
};
process.on('uncaughtException', _warn);
process.on('unhandledRejection', _warn); */