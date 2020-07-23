const test  = require('ava');
const withPage = require('./utils/_withPage');
const withStaticServer = require('./utils/_withStaticServer');


let server;
test.before(() => (server = withStaticServer()));


test('wear package as avatar function', withPage, async (t, page) => {
    await page.goto(process.env.STATIC_URL, { waitFor: 'load' });
    const response = await page.evaluate(pageFunction, `${process.env.STATIC_URL}/assets/avatar.wbn`);
    t.true(response);

})

const pageFunction = async path => {
    const file = await fetch(path).then(res => res.arrayBuffer());
    const p = new XRPackage(file);
    const engine = new XRPackageEngine();
    await engine.wearAvatar(p);
    return engine.rig !== null;
}

test.after(() => server.close());

