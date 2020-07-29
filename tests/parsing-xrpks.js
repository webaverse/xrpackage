/* global XRPackage */
const test = require('ava');

const withPageAndStaticServer = require('./utils/_withPageAndStaticServer');

test('parse webxr-site@0.0.1 package', withPageAndStaticServer, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/webxr-template.wbn`);
  t.true(response);
});

test('parse gltf@0.0.1 package', withPageAndStaticServer, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/baked-xrpk.wbn`);
  t.true(response);
});

test('parse vrm@0.0.1 package', withPageAndStaticServer, async (t, page) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/avatar.wbn`);
  t.true(response);
});

test.only('parse vox@0.0.1 package', withPageAndStaticServer, async (t, page) => {
  // Source .vox: https://github.com/mikelovesrobots/mmmm/blob/master/vox/alien_bot1.vox
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/assets/alien_bot1_vox.wbn`);
  t.true(response);
});

// Only if we're keeping the world concept in XRPackage
test.todo('parse xrpackage-scene@0.0.1 package');

const pageFunction = async path => {
  const file = await fetch(path).then(res => res.arrayBuffer());
  const p = new XRPackage(file);

  // This will block until the package's loader has run and the load event has been fired
  await p.waitForLoad();
  return true;
};
