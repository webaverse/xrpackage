/* global XRPackage */
const test = require('ava');

const withPage = require('./utils/_withPage');
const { testBeforeHook, testAfterHook } = require('./utils/_testHelpers');

test.before(testBeforeHook);

test('load screenshot of baked xrpk', withPage, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/baked-xrpk.wbn`);
  t.true(response && response.startsWith('<img src="blob:http://localhost:'));
});

test('load screenshot of unbaked xrpk', withPage, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/unbaked-xrpk.wbn`);
  t.falsy(response);
});

const pageFunction = async path => {
  const file = await fetch(path).then(res => res.arrayBuffer());
  const p = new XRPackage(file);
  await p.waitForLoad();
  const screenshot = await p.getScreenshotImage();
  return screenshot ? screenshot.outerHTML : null;
}

test.after(testAfterHook);
