const puppeteer = require('puppeteer');

const addXRPackageScript = async (page, port) => {
  await page.evaluateOnNewDocument(`
    window.onload = () => {
      const script = document.createElement('script');
      script.type = 'module';
      script.innerText = 'import { XRPackage, XRPackageEngine } from "http://localhost:${port}/xrpackage.js"; window.XRPackage = XRPackage; window.XRPackageEngine = XRPackageEngine;';
      document.head.appendChild(script);
    };
  `);
};

module.exports = async (t, run) => {
  const browser = await puppeteer.launch({
    headless: true,
    devtools: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', consoleObj => console.log(`page log: ${consoleObj.text()}`));
  await addXRPackageScript(page, t.context.port);

  try {
    await page.goto(t.context.staticUrl, { waitFor: 'load' });
    await run(t, page);
  } finally {
    await page.close();
    await browser.close();
  }
}
