# xrpackage

XRPackage turns 3D apps into a file you can load anywhere.

It uses standards like WebXR, GLTF, and WebBundle to package an app into a `.wbn` file. It provides a runtime to load multiple `.wbn` applications at once into a shared composited world. Finally, XRPackage provides a package registry distrivuted on IPFS / Ethereum, to easily share your XRPackage applications. The registry follows the ERC1155 standard so packages can be traded on OpenSea.

## Build a WebXR package

An XRPackage needs a `manifest.json` (following the [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) standard), and the source files for the app. The main addition to the specification is the `xr_type` field, which specifies the type of application and the specification version.

```
$ cat manifest.json
{
  "xr_type": "webxr-site@0.0.1",
  "start_url": "cube.html"
}
```

See also the [examples](https://github.com/webaverse/xrpackage/tree/master/examples).

Packages are built with the `xrpk` tool which you can get on `npm`:

```
$ npm install -g xrpk

```

To build a package with `manifest.json` in the current directory:

```
$ xrpk build .
a.wbn
```

Note: this might open up your browser to perform screenshotting of the application. It will also output `a.wbn.gif` as a screenshot and `a.wbn.glb` as a 3D model preview.

## Test the package

Once you have a package (`a.wbn`), you can run it in your browser like so:

```
$ xrpk run ./a.wbn
```

## Run XRPackage programmatically

See [run.html](https://github.com/webaverse/xrpackage/blob/master/run.html) for the full example.

```
import {XRPackageEngine, XRPackage} from 'https://xrpackage.org/xrpackage.js';
const pe = new XRPackageEngine();
document.body.appendChild(pe.domElement);

const res = await fetch('a.wbn'); // built package stored somewhere
const arrayBuffer = await res.arrayBuffer();
const p = new XRPackage(new Uint8Array(arrayBuffer));
pe.add(p);
```

You can also compile a `.wbn` package programmatically: 

```
const uint8Array = XRPackage.compileRaw(
	[
	  {
	    url: '/cube.html',
	    type: 'text/html',
	    data: cubeHtml,
	  },
	  {
	    url: '/manifest.json',
	    type: 'application/json',
	    data: cubeManifest,
	  }
	]
);
// save uint8Array somewhere or new XRPackage(uint8Array)
```

## Publish packages: log into wallet

```
xrkp login
```

Follow the prompts to create or import a wallet. It is a regular BIP39 mnemonic.

## Check your wallet address

```
xrkp whoami
```

## Publish a package

Note: Rinkeby testnet only. You will need sufficient Rinkeby testnet ETH balance in your wallet address to publish. You can get free Rinkeby testnet ETH at the [faucet](https://faucet.rinkeby.io/).

Once you are ready, you can publish a package to your wallet with this command:

```
xrkp publish a.wbn
```

The contracts used are here: https://github.com/webaverse/contracts

## Browse published packages

You can browse the list of published packages [here](https://xrpackage.org/browse.html).

## Install a published package

```
xrpk install [id]
```

This will download the given package id locally.
