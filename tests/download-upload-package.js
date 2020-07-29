const test = require('ava');

const withPageAndStaticServer = require('./utils/_withPageAndStaticServer');

test('download package programmatically', withPageAndStaticServer, async (t, page) => {
  const TEST_PACKAGE_HASH = 'QmXLqueMtqJ6dZtqiTzKHRi1fkMivfSwSz93sy8HAaVxH7'; //redchecker.wbn
  const response = await page.evaluate(downloadFunction, TEST_PACKAGE_HASH);
  t.true(response);
});

test('upload package programmatically', withPageAndStaticServer, async (t, page) => {
  const response = await page.evaluate(uploadFunction, `${t.context.staticUrl}/assets/redchecker.wbn`);
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
  console.log(hash);
  return hash === p.hash;
};
