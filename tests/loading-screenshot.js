/* global XRPackage */
const test = require('ava');

const withPageAndStaticServer = require('./utils/_withPageAndStaticServer');

test('load screenshot of baked xrpk', withPageAndStaticServer, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/webxr-cube-baked.wbn`);
  t.true(response && response.startsWith('<img src="blob:http://localhost:'));
});

test('load screenshot of unbaked xrpk', withPageAndStaticServer, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/webxr-cube.wbn`);
  t.falsy(response);
});

const pageFunction = async path => {
  const file = await fetch(path).then(res => res.arrayBuffer());
  const p = new XRPackage(file);
  await p.waitForLoad();
  const screenshot = await p.getScreenshotImage();
  return screenshot ? screenshot.outerHTML : null;
};
