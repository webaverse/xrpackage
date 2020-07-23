const puppeteer = require('puppeteer');

module.exports = async (t, run) => {
  const browser = await puppeteer.launch({
    headless: true,
    devtools: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', consoleObj => console.log(consoleObj.text()));

  try {
    await run(t, page);
  } finally {
    await page.close();
    await browser.close();
  }
}
