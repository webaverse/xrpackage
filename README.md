# xrpackage

Package, install, run, and publish distributed spatial web applications.

Develop and test standard GLTF + WebXR applications locally and publish to IPFS and Ethereum.

Currently Rinkeby Ethereum testnet only.

## Install `xrpk`

```
npm install -g xrpk
```

Can also be used to update `xrpk`.

## Install a package

```
xrpk install [id]
```

This will download the given package id locally.

## Build .wbn package

```
# supports gltf,glb,vrm,html
xrpk build yourfile.glb # build package with the model file
```

This will open your browser to screenshot. It will output the resulting [WebPackage](https://github.com/WICG/webpackage) to `a.wbn`. It will also output `a.wbn.gif` as a screenshot and `a.wbn.glb` as a 3D model preview.

## Run a package

```
xrpk run a.wnb
```

Run `a.wbn` in the browser.

## Log into wallet

```
xrkp login
```

Follow the prompts to create or import a wallet.

## Publish a package

```
xrkp publish a.wbn
```

Publish a package to IPFS and Ethereum. Must be logged in and must have sufficient balance to message the Ethereum network.
