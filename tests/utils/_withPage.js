const puppeteer = require('puppeteer');

const { addXRPackageScript } = require('./_testHelpers');

module.exports = async (t, run) => {
  const browser = await puppeteer.launch({
    headless: true,
    devtools: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', consoleObj => console.log(consoleObj.text()));

  try {
    await page.goto(t.context.staticUrl, { waitFor: 'load' });
    await addXRPackageScript(page, t.context.port);
    await run(t, page);
  } finally {
    await page.close();
    await browser.close();
  }
}
