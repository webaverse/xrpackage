/* global XRPackage, XRPackageEngine */
const test = require('ava');

const withPageAndStaticServer = require('./utils/_withPageAndStaticServer');

test('get collision mesh of baked wbn - should exist', withPageAndStaticServer, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/baked-xrpk.wbn`);
  t.true(response);
});

test('get collision mesh of unbaked wbn - should not exist', withPageAndStaticServer, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/unbaked-xrpk.wbn`);
  t.false(response);
});

const pageFunction = async path => {
  const file = await fetch(path).then(res => res.arrayBuffer());
  const p = new XRPackage(file);
  await p.waitForLoad();

  const mesh = await p.getVolumeMesh();
  return mesh !== null;
};
