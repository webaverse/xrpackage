/* global XRPackage */
const test = require('ava');

const withPage = require('./utils/_withPage');
const withStaticServer = require('./utils/_withStaticServer');

let server;
test.before(() => (server = withStaticServer()));

test('load screenshot of baked xrpk', withPage, async (t, page) => {
  await page.goto(process.env.STATIC_URL, { waitFor: 'load' });
  const response = await page.evaluate(pageFunction, `${process.env.STATIC_URL}/assets/baked-xrpk.wbn`);
  t.true(response && response.startsWith('<img src="blob:http://localhost:'));
});

test('load screenshot of unbaked xrpk', withPage, async (t, page) => {
  await page.goto(process.env.STATIC_URL, { waitFor: 'load' });
  const response = await page.evaluate(pageFunction, `${process.env.STATIC_URL}/assets/unbaked-xrpk.wbn`);
  t.falsy(response);
});

const pageFunction = async path => {
  const file = await fetch(path).then(res => res.arrayBuffer());
  const p = new XRPackage(file);
  await p.waitForLoad();
  const screenshot = await p.getScreenshotImage();
  return screenshot ? screenshot.outerHTML : null;
}

test.after(() => server.close());
