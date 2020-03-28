#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const {Writable} = require('stream');
const os = require('os');
const mkdirp = require('mkdirp');
const yargs = require('yargs');
const fetch = require('node-fetch');
const wbn = require('wbn');
const ethereumjs = {
  Tx: require('ethereumjs-tx').Transaction,
};
const {BigNumber} = require('bignumber.js');
const lightwallet = require('eth-lightwallet');
const Web3 = require('web3');

const apiHost = `https://ipfs.exokit.org/ipfs`;
const network = 'rinkeby';
const infuraApiKey = '4fb939301ec543a0969f3019d74f80c2';
const rpcUrl = `https://${network}.infura.io/v3/${infuraApiKey}`;
const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

const getContract = Promise.all([
  fetch(`https://contracts.webaverse.com/address.js`).then(res => res.text()).then(s => s.replace(/^export default `(.+?)`[\s\S]*$/, '$1')),
  fetch(`https://contracts.webaverse.com/abi.js`).then(res => res.text()).then(s => JSON.parse(s.replace(/^export default /, ''))),
]).then(([address, abi]) => {
  // console.log('got address + abi', {address, abi});
  return new web3.eth.Contract(abi, address);
});

/* loadPromise.then(c => {
  const m = c.methods.mint([1, 1, 1], '0x0', 'hash', 'lol');
  console.log('got c', Object.keys(c), Object.keys(c.methods.mint), Object.keys(m), m.encodeABI());
}); */

/* window.web3.eth.contract(abi).at(address)
window.web3 = new window.Web3(window.ethereum);
try {
  // Request account access if needed
  await window.ethereum.enable();
  // Acccounts now exposed
  // web3.eth.sendTransaction({});

  this.instance = ;
  this.account = window.web3.eth.accounts[0];

  this.promise.accept(this.instance);
} catch (err) {
  // User denied account access...
  console.warn(err);
} */

function makePromise() {
  let accept, reject;
  const p = new Promise((a, r) => {
    accept = a;
    reject = r;
  });
  p.accept = accept;
  p.reject = reject;
  return p;
}
const hdPathString = `m/44'/60'/0'/0`;
async function exportSeed(ks, password) {
  const p = makePromise();
  ks.keyFromPassword(password, function (err, pwDerivedKey) {
    if (!err) {
      const seed = keystore.getSeed(pwDerivedKey);
      p.accept(seed);
    } else {
      p.reject(err);
    }
  });
  return await p;
}
async function signTx(ks, password, rawTx) {
  const p = makePromise();
  ks.keyFromPassword(password, function (err, pwDerivedKey) {
    if (!err) {
      const address = ks.addresses[0];
      console.log('sign tx', ks, pwDerivedKey, rawTx, address, hdPathString);
      const signed = lightwallet.signing.signTx(ks, pwDerivedKey, rawTx, `0x${address}`, hdPathString);
      p.accept(signed);
    } else {
      p.reject(err);
    }
  });
  return await p;
}
async function getPrivateKey(ks, password) {
  const p = makePromise();
  ks.keyFromPassword(password, function (err, pwDerivedKey) {
    if (!err) {
      const privateKey = ks.exportPrivateKey(ks.addresses[0], pwDerivedKey);
      p.accept(privateKey);
    } else {
      p.reject(err);
    }
  });
  return await p;
}
const _createKeystore = async (seedPhrase, password) => {
  const p = makePromise();
  lightwallet.keystore.createVault({
    password,
    seedPhrase, // Optionally provide a 12-word seed phrase
    // salt: fixture.salt,     // Optionally provide a salt.
                               // A unique salt will be generated otherwise.
    hdPathString,    // Optional custom HD Path String
  },
  (err, ks) => {
    if (!err) {
      ks.keyFromPassword(password, function (err, pwDerivedKey) {
        if (!err) {
          ks.generateNewAddress(pwDerivedKey, 1);

          p.accept(ks);
        } else {
          p.reject(err);
        }
      });
    } else {
      p.reject(err);
    }
  });
  const ks = await p;
  ks.exportSeed = exportSeed.bind(null, ks, password);
  ks.signTx = signTx.bind(null, ks, password);
  ks.getPrivateKey = getPrivateKey.bind(null, ks, password);
  return ks;
};
const _exportKeyStore = ks => ks.serialize();
const _importKeyStore = async (s, password) => {
  const ks = lightwallet.keystore.deserialize(s);

  const p = makePromise();
  ks.keyFromPassword(password, function (err, pwDerivedKey) {
    if (!err) {
      if (ks.isDerivedKeyCorrect(pwDerivedKey)) {
        p.accept();
      } else {
        p.reject(new Error('invalid password'));
      }
    } else {
      p.reject(err);
    }
  });
  await p;
  ks.exportSeed = exportSeed.bind(null, ks, password);
  ks.signTx = signTx.bind(null, ks, password);
  ks.getPrivateKey = getPrivateKey.bind(null, ks, password);
  return ks;
};

let handled = false;
yargs
  .command('login', 'log in to wallet', yargs => {
    yargs
      /* .positional('input', {
        describe: 'input file to build',
        // default: 5000
      }) */
  }, async argv => {
    handled = true;

    const mutableStdout = new Writable({
      write: function(chunk, encoding, callback) {
        if (!this.muted)
          process.stdout.write(chunk, encoding);
        callback();
      }
    });
    mutableStdout.muted = false;
    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true
    });

    const p = makePromise();
    rl.question('seed phrase (default: autogen): ', seedPhrase => {
      if (!seedPhrase) {
        seedPhrase = lightwallet.keystore.generateRandomSeed();
        console.log(seedPhrase);
      }

      rl.question('password: ', async password => {
        rl.close();

        if (password) {
          const ks = await _createKeystore(seedPhrase, password);
          await mkdirp(os.homedir());
          fs.writeFile(path.join(os.homedir(), '.xrpackage'), _exportKeyStore(ks), err => {
            p.accept();
          });
          console.log(`0x${ks.addresses[0]}`);
        } else {
          p.reject(new Error('password is required'));
        }
      });
    });
    await p;
    mutableStdout.muted = true;
  })
  .command('publish [input]', 'publish token', yargs => {
    yargs
      .positional('input', {
        describe: 'input file to publish',
        // default: 5000
      })
  }, async argv => {
    handled = true;

    const ksString = fs.readFileSync(path.join(os.homedir(), '.xrpackage'));

    const mutableStdout = new Writable({
      write: function(chunk, encoding, callback) {
        if (!this.muted)
          process.stdout.write(chunk, encoding);
        callback();
      }
    });
    mutableStdout.muted = false;
    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true
    });

    const passwordPromise = makePromise();
    rl.question('password: ', password => {
      rl.close();

      passwordPromise.accept(password);
    });
    const password = await passwordPromise;

    const ks = await _importKeyStore(ksString, password);

    const objectName = 'avatar';
    const dataArrayBuffer = fs.readFileSync('model11.vrm');
    const screenshotBlob = fs.readFileSync('model11.png');

    console.log('uploading...');
    const [
      dataHash,
      screenshotHash,
    ] = await Promise.all([
      fetch(`${apiHost}/`, {
        method: 'PUT',
        body: dataArrayBuffer,
      })
        .then(res => res.json())
        .then(j => j.hash),
      fetch(`${apiHost}/`, {
        method: 'PUT',
        body: screenshotBlob,
      })
        .then(res => res.json())
        .then(j => j.hash),
    ]);
    const metadataHash = await fetch(`${apiHost}/`, {
      method: 'PUT',
      body: JSON.stringify({
        objectName,
        dataHash,
        screenshotHash,
      }),
    })
      .then(res => res.json())
      .then(j => j.hash);

    /* const address = `0x${ks.addresses[0]}`;
    const nonce = await web3.eth.getTransactionCount(address);
    const gasPrice = await web3.eth.getGasPrice();
    const rawTx = {
      to: dstAddress,
      srcValue: srcValue * 1e18,
      gasPrice,
      gas: 0,
      nonce,
    };
    rawTx.gas = await web3.eth.estimateGas(rawTx);
    const serializedTx = new ethereumjs.Tx(rawTx).serialize();
    const signed = await ks.signTx(serializedTx);
    web3.eth.sendSignedTransaction('0x' + signed).on('receipt', e => {
      console.log('got tx receipt', e); // XXX
    }); */

    console.log('got hashes', ks, {dataHash, screenshotHash, metadataHash});

    const contract = await getContract;
    const address = `0x${ks.addresses[0]}`;
    const privateKey = await ks.getPrivateKey();
    console.log('got pk', privateKey);
    // web3.eth.accounts.wallet.add('0x' + Buffer.from(privateKey).toString('hex'));
    const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey);
    web3.eth.accounts.wallet.add(account);

    const nonce = await web3.eth.getTransactionCount(address);
    console.log('get nonce', nonce);
    const gasPrice = await web3.eth.getGasPrice();
    console.log('gas price', gasPrice);
    const value = '10000000000000000'; // 0.01 ETH

    const m = contract.methods.mint([1, 1, 1], 'hash', metadataHash);
    const o = {
      gas: 0,
      from: address,
      nonce,
      value,
    };
    o.gas = await m.estimateGas(o);
    const receipt = await m.send(o);
    console.log('got receipt', receipt);

    /* const m = contract.methods.mint([1, 1, 1], 'hash', metadataHash);
    const encoded_tx = m.encodeABI();
    const transactionObject = {
      gas: 0,
      gasPrice,
      data: encoded_tx,
      from: address,
      value,
      nonce,
    };
    console.log('got tx', encoded_tx);
    transactionObject.gas = await m.estimateGas({
      from: address,
      value,
    });

    const signedTx = await web3.eth.accounts.signTransaction(transactionObject, privateKey);
    console.log('got signed', signedTx);

    const txPromise = makePromise();
    web3.eth.sendSignedTransaction(signedTx.rawTransaction)
      .on('receipt', receipt => {
         txPromise.accept(receipt);
      });
    const receipt = await txPromise; */

    /* const p = makePromise();
    const instance = await contract.getInstance();
    const account = await contract.getAccount();
    const size = pointerMesh.getSize();
    instance.mint([size[3] - size[0], size[4] - size[1], size[5] - size[2]], '0x0', 'hash', metadataHash, {
      from: account,
    // value: '1000000000000000000', // 1 ETH
      value: '10000000000000000', // 0.01 ETH
    }, (err, value) => {
      if (!err) {
        p.accept(value);
      } else {
        p.reject(err);
      }
    });
    await p; */
  })
  .command('build [input] [output]', 'build xrpackage .wbn from [input] and write to [output]', yargs => {
    yargs
      .positional('input', {
        describe: 'input file to build',
        // default: 5000
      })
      .positional('output', {
        describe: 'output file to write',
        // default: 5000
      });
  }, async argv => {
    handled = true;

    if (typeof argv.input !== 'string') {
      argv.input = '-';
    }
    if (typeof argv.output !== 'string') {
      argv.output = '-';
    }

    const fileData = await (() => {
      if (argv.input === '-') {
        return new Promise((accept, reject) => {
          const bs = [];
          process.stdin.on('data', d => {
            bs.push(d);
          });
          process.stdin.once('end', () => {
            accept(Buffer.concat(bs));
          });
          process.stdin.once('error', reject);
        });
      } else {
        return Promise.resolve(fs.readFileSync(argv.input));
      }
    })();

    // console.log('got data', data.length);

    let spatialType, mimeType;
    if (/\.gltf$/.test(argv.input)) {
      spatialType = 'gltf@0.0.1';
      mimeType = 'model/gltf+json';
    } else if (/\.glb$/.test(argv.input)) {
      spatialType = 'gltf@0.0.1';
      mimeType = 'application/octet-stream';
    } else if (/\.vrm$/.test(argv.input)) {
      spatialType = 'vrm@0.0.1';
      mimeType = 'application/octet-stream';
    } else if (argv.input === '-' || /\.html$/.test(argv.input)) {
      spatialType = 'webxr-site@0.0.1';
      mimeType = 'text/html';
    } else {
      throw new Error(`unknown file type: ${argv.input}`);
    }

    const files = [
      {
        url: '/',
        type: mimeType,
        data: fileData,
      },
      {
        url: '/manifest.json',
        type: 'application/json',
        data: JSON.stringify({
          spatial_type: spatialType,
        }, null, 2),
      },
    ];

    const primaryUrl = `https://xrpackage.org`;
    const builder = (new wbn.BundleBuilder(primaryUrl + '/'))
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const {url, type, data} = file;
      builder.addExchange(primaryUrl + url, 200, {
        'Content-Type': type,
      }, data);
    }
    const uint8Array = builder.createBundle();
    // console.log('got bundle', uint8Array.byteLength);

    if (argv.output === '-') {
      process.stdout.write(uint8Array);
    } else {
      fs.writeFileSync(argv.output, uint8Array);
    }

    console.log(argv.output);
  }).argv;
if (!handled) {
  yargs.showHelp();
}
  /* .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging'
  }) */

/* if (argv.ships > 3 && argv.distance < 53.5) {
  console.log('Plunder more riffiwobbles!')
} else {
  console.log('Retreat from the xupptumblers!')
} */