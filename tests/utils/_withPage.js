const puppeteer = require('puppeteer');

const addXRPackageScript = async (page, port) => {
  // Import local xrpackage.js using this test's express server's port
  await page.addScriptTag({
    type: 'module',
    content: `
      import { XRPackage, XRPackageEngine } from "http://localhost:${port}/xrpackage.js";
      window.XRPackage = XRPackage;
      window.XRPackageEngine = XRPackageEngine;
    `,
  });
};

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
    await page.goto(t.context.staticUrl, { waitFor: 'networkidle0' });
    await addXRPackageScript(page, t.context.port);
    await run(t, page);
  } finally {
    await page.close();
    await browser.close();
  }
}
