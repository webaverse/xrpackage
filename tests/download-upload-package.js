const test = require('ava');

const withPageAndStaticServer = require('./utils/_withPageAndStaticServer');

test('download package programmatically', withPageAndStaticServer, async (t, page) => {
  const TEST_PACKAGE_HASH = 'QmesnBdGf4yqtC3DH5d1W3GW4qYCtJr6TVfRGBAwQmyCq3'; //avatar.wbn
  const response = await page.evaluate(downloadFunction, TEST_PACKAGE_HASH);
  t.true(response);
});

test('upload package programmatically', withPageAndStaticServer, async (t, page) => {
  const response = await page.evaluate(uploadFunction, `${t.context.staticUrl}/assets/avatar.wbn`);
  t.true(response);
});

const downloadFunction = async (hash) => {
  const p = await XRPackage.download(hash);
  return p.hash === hash;
};

const uploadFunction = async (path) => {
  const file = await fetch(path).then(res => res.arrayBuffer());
  const p = new XRPackage(file);
  const hash = await p.upload();
  return hash === p.hash;
};
