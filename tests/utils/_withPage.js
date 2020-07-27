const puppeteer = require('puppeteer');

module.exports = async (t, run) => {
  const browser = await puppeteer.launch({
    headless: true,
    devtools: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', consoleObj => console.log(`Page log: "${consoleObj.text()}"`));

  try {
    // Wait for no more network requests for at least 500ms before passing onto main test
    await page.goto(t.context.staticUrl, {waitUntil: 'networkidle0'});
    await run(t, page);
  } finally {
    await page.close();
    await browser.close();
  }
};
