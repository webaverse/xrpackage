const test = require('ava');
const withPage = require('./utils/_withPage');
const withStaticServer = require('./utils/_withStaticServer');

let server;
test.before(() => (server = withStaticServer()));

test('load screenshot of baked xrpk', withPage, async (t, page) => {
  await page.goto(process.env.STATIC_URL, { waitFor: 'load' });
  console.log(await page.content());
});

test.after(() => server.close());
