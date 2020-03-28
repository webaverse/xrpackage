#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const {Writable} = require('stream');
const os = require('os');
const mkdirp = require('mkdirp');
const yargs = require('yargs');
const wbn = require('wbn');
const lightwallet = require('eth-lightwallet');

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

    var mutableStdout = new Writable({
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
          // console.log('\nPassword is ' + password);
        } else {
          p.reject(new Error('password is required'));
        }
      });
    });
    await p;
    mutableStdout.muted = true;
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

    /* if (argv.verbose) console.info(`start server on :${argv.port}`)
    serve(argv.port) */
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