const fs = require('fs');
const wbn = require('wbn');
// const {XRPackage} = require('./xrpackage.js');

require('yargs')
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
    if (typeof argv.input !== 'string') {
      argv.input = '-';
    }
    if (typeof argv.output !== 'string') {
      argv.output = 'a.wbn';
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
    } else if (/\.html$/.test(argv.input)) {
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

    fs.writeFileSync(argv.output, uint8Array);

    console.log(argv.output);

    /* if (argv.verbose) console.info(`start server on :${argv.port}`)
    serve(argv.port) */
  }).argv;
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