/* global XRPackage */
const test = require('ava');

const withPageAndStaticServer = require('./utils/_withPageAndStaticServer');

test('compiling unknown file type', withPageAndStaticServer, async (t, page) => {
  const result = await page.evaluate(async path => {
    try {
      const blob = await fetch(path).then(res => res.blob());
      blob.name = path.split('/').pop();
      await XRPackage.compileFromFile(blob);
    } catch (err) {
      if (err.message === 'unknown file type: text/html') {
        return true;
      } else {
        console.error('Unexpected error', err.message);
      }
    }

    return false;
  }, `${t.context.staticUrl}/assets/text.txt`);

  t.true(result);
});

test('parsing wbn with no manifest', withPageAndStaticServer, async (t, page) => {
  await performManifestTest(t, page, `${t.context.staticUrl}/assets/no-manifest.wbn`, 'no manifest.json in pack');
});

test('parsing wbn with empty manifest', withPageAndStaticServer, async (t, page) => {
  await performManifestTest(t, page, `${t.context.staticUrl}/assets/empty-manifest.wbn`, 'could not find xr_type and start_url in manifest.json');
});

const performManifestTest = async (t, page, path, expectedError) => {
  const result = await page.evaluate(async (path, expectedError) => {
    try {
      const uint8Array = await fetch(path).then(res => res.arrayBuffer());
      await new XRPackage(uint8Array);
    } catch (err) {
      if (err.message === expectedError) {
        return true;
      } else {
        console.error('Unexpected error', err.message);
      }
    }

    return false;
  }, path, expectedError);

  t.true(result);
};
