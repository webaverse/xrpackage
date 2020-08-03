/* global XRPackage, XRPackageEngine */
const test = require('ava');

const withPageAndStaticServer = require('./utils/_withPageAndStaticServer');

test('wear package as avatar function', withPageAndStaticServer, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/avatar.wbn`);
  t.true(response);
});

const pageFunction = async path => {
  return window.safeEvaluate(async () => {
    const file = await fetch(path).then(res => res.arrayBuffer());
    const p = new XRPackage(file);
    await p.waitForLoad();
    const engine = new XRPackageEngine();
    await engine.wearAvatar(p);
    return engine.rig !== null;
  });
};
