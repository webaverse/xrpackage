/* global XRPackage */
const test = require('ava');
const wbn = require('wbn');
const path = require('path');

const withPageAndStaticServer = require('./utils/_withPageAndStaticServer');

test('dynamically generate WebXR xrpk', withPageAndStaticServer, async (t, page) => {
  const blobString = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/webxr-template.html`);
  const buf = Buffer.from(JSON.parse(blobString).data);
  const bundle = new wbn.Bundle(buf);
  t.is(bundle.urls.length, 2);

  const manifestUrl = bundle.urls.find(u => path.basename(u) === 'manifest.json');
  t.truthy(manifestUrl);

  const manifestBody = bundle.getResponse(manifestUrl).body.toString('utf-8');
  t.is(JSON.parse(manifestBody).start_url, 'webxr-template.html');

  const htmlUrl = bundle.urls.find(u => path.basename(u) === 'webxr-template.html');
  t.truthy(htmlUrl);
});

const pageFunction = async path => {
  const blob = await fetch(path).then(res => res.blob());
  blob.name = path.split('/').pop();

  const xrpk = await XRPackage.compileFromFile(blob);

  // Puppeteer only supports passing serializable data to/from Node
  return JSON.stringify(xrpk);
};
