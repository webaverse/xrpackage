const http = require('http');
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
  fetch(`https://raw.githack.com/exokitxr/polys/contract/address.js`).then(res => res.text()).then(s => s.replace(/^export default `(.+?)`[\s\S]*$/, '$1')),
  fetch(`https://raw.githack.com/exokitxr/polys/contract/abi.js`).then(res => res.text()).then(s => JSON.parse(s.replace(/^export default /, ''))),
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
const wss = new ws.Server({
  noServer: true,
});
wss.on('connection', async (s, req) => {
  // const o = url.parse(req.url, true);
  s.on('message', async m => {
    const contract = await loadPromise;

    if (typeof m === 'string') {
      const data = jsonParse(m);
      if (data) {
        const {method = '', args = {}} = data;
        switch (method) {
          case 'initState': {
            const {id, address, transform} = args;
            const contractAddress = await contract.methods.getContract(id).call();
            // console.log('got contract address', contractAddress, typeof contractAddress, realityScriptAbi);
            const objectContract = new web3.eth.Contract(realityScriptAbi, contractAddress);
            const state = await objectContract.methods.initState(address, transform).call();
            const oid = getRandomId();
            globalObjects[oid] = {
              contract: objectContract,
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
              const o = await object.contract.methods.update(transform, [['0x0', ['0x0', '0x0', '0x0']]], object.state).call();
              const apply = o[0];
              const state = o[1];
              console.log('got result', o);
              object.state = state;
              if (apply) {
                console.log('apply 0', object.state);
                const gasPrice = await web3.eth.getGasPrice();
                console.log('apply 1', gasPrice);
                const estimatedGas = await object.contract.methods.applyState(object.state).estimateGas({
                  from: account,
                  gasPrice,
                });
                console.log('apply 2', estimatedGas, object.contract.options.address);
                const contractBalance = await web3.eth.getBalance(object.contract.options.address);
                console.log('apply 3', contractBalance);
                if (contractBalance >= estimatedGas) {
                  const applyResult = await object.contract.methods.applyState(object.state).call({
                    from: account,
                    gasPrice,
                    gas: estimatedGas,
                  });
                  console.log('apply 4', applyResult);
                  s.send(JSON.stringify({
                    result: {
                      state: object.state,
                    },
                    error: null,
                  }));
                } else {
                  s.send(JSON.stringify({
                    result: null,
                    error: 'contract has insufficient gas to update',
                  }));
                  return;
                }
              } else {
                s.send(JSON.stringify({
                  result: {
                    state: object.state,
                  },
                  error: null,
                }));
              }
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