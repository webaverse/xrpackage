/* global XRPackage, XRPackageEngine */
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

test('parsing wbn with non JSON manifest', withPageAndStaticServer, async (t, page) => {
  await performManifestTest(t, page, `${t.context.staticUrl}/assets/non-json-manifest.wbn`, 'Unexpected token N in JSON at position 0');
});

test('adding broken WebXR package to engine', withPageAndStaticServer, async (t, page) => {
  const doesTimeOut = await page.evaluate(async path => {
    const uint8Array = await fetch(path).then(res => res.arrayBuffer());
    const p = await new XRPackage(uint8Array);
    const pe = await new XRPackageEngine();

    try {
      await pe.add(p, {timeout: 2000});
    } catch (err) {
      if (err.message === 'Timed out whilst loading package') {
        return true;
      } else {
        throw err;
      }
    }

    return false;
  }, `${t.context.staticUrl}/assets/broken-webxr-site.wbn`);

  t.true(doesTimeOut);
});

test('compiling corrupted GLTF package', withPageAndStaticServer, async (t, page) => {
  const doesTimeOut = await page.evaluate(async path => {
    const blob = await fetch(path).then(res => res.blob());
    blob.name = path.split('/').pop();

    const uint8Array = await XRPackage.compileFromFile(blob);
    const p = new XRPackage(uint8Array);

    try {
      await p.waitForLoad();
    } catch (err) {
      return true;
    }

    return false;
  }, `${t.context.staticUrl}/assets/camera-corrupted.glb`);

  t.true(doesTimeOut);
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
