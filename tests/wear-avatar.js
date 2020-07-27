/* global XRPackage, XRPackageEngine */
const test = require('ava');

const withPage = require('./utils/_withPage');
const {testBeforeHook, testAfterHook} = require('./utils/_testHelpers');

test.before(testBeforeHook);
test.after.always(testAfterHook);

test.serial('wear package as avatar function', withPage, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/avatar.wbn`);
  t.true(response);
});

const pageFunction = async path => {
  const file = await fetch(path).then(res => res.arrayBuffer());
  const p = new XRPackage(file);
  await p.waitForLoad();
  const engine = new XRPackageEngine();
  await engine.wearAvatar(p);
  return engine.rig !== null;
};
