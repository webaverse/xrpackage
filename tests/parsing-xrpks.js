/* global XRPackage */
const test = require('ava');

const withPageAndStaticServer = require('./utils/_withPageAndStaticServer');

test('parse webxr-site@0.0.1 package', withPageAndStaticServer, async (t, page) => {
  await performTest(t, page, 'assets/webxr-template.wbn');
});

test('parse gltf@0.0.1 package', withPageAndStaticServer, async (t, page) => {
  await performTest(t, page, 'assets/baked-xrpk.wbn');
});

test('parse vrm@0.0.1 package', withPageAndStaticServer, async (t, page) => {
  await performTest(t, page, 'assets/avatar.wbn');
});

test.only('parse vox@0.0.1 package', withPageAndStaticServer, async (t, page) => {
  // Source .vox: https://github.com/mikelovesrobots/mmmm/blob/master/vox/alien_bot1.vox
  await performTest(t, page, 'assets/alien_bot1_vox.wbn');
});

// Only if we're keeping the world concept in XRPackage
test.todo('parse xrpackage-scene@0.0.1 package');

const performTest = async (t, page, path) => {
  const response = await page.evaluate(pageFunction, `${t.context.staticUrl}/${path}`);
  t.true(response);
};

const pageFunction = async path => {
  const file = await fetch(path).then(res => res.arrayBuffer());
  const p = new XRPackage(file);

  // This will block until the package's loader has run and the load event has been fired
  await p.waitForLoad();
  return true;
};
