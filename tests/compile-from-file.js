/* global XRPackage */
const test = require('ava');
const wbn = require('wbn');
const path = require('path');
const fs = require('fs');

const withPageAndStaticServer = require('./utils/_withPageAndStaticServer');

test('compile xrpk from html', withPageAndStaticServer, async (t, page) => {
  await performTest(t, page, 'assets/webxr-template.html', 'text/html');
});

test('compile xrpk from glb', withPageAndStaticServer, async (t, page) => {
  await performTest(t, page, 'assets/camera.glb', 'application/octet-stream');
});

test('compile xrpk from vrm', withPageAndStaticServer, async (t, page) => {
  await performTest(t, page, 'assets/waft.vrm', 'application/octet-stream');
});

const performTest = async (t, page, assetPath, mime) => {
  const blobString = await page.evaluate(pageFunction, `${t.context.staticUrl}/${assetPath}`);
  const buf = Buffer.from(JSON.parse(blobString).data);
  const bundle = new wbn.Bundle(buf);
  t.is(bundle.urls.length, 2);

  const manifestUrl = bundle.urls.find(u => path.basename(u) === 'manifest.json');
  t.truthy(manifestUrl);

  const filename = path.basename(assetPath);
  const manifestBody = bundle.getResponse(manifestUrl).body.toString('utf-8');
  t.is(JSON.parse(manifestBody).start_url, filename);

  const assetUrl = bundle.urls.find(u => path.basename(u) === filename);
  t.truthy(assetUrl);

  const assetResponse = bundle.getResponse(assetUrl);
  t.is(assetResponse.headers['content-type'], mime);

  const actualAssetBody = fs.readFileSync(path.join(__dirname, 'static', assetPath));
  const assetBody = assetResponse.body;

  // Ensure first chunk of files are equal. Don't check entire file because they're probably too large!
  t.deepEqual(
    assetBody.slice(0, 100000),
    actualAssetBody.slice(0, 100000),
  );
};

const pageFunction = async path => {
  const blob = await fetch(path).then(res => res.blob());
  blob.name = path.split('/').pop();

  const xrpk = await XRPackage.compileFromFile(blob);

  // Puppeteer only supports passing serializable data to/from Node
  return JSON.stringify(xrpk);
};
