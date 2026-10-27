import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:4321';
const prefix = process.argv[3] || 'after';
await mkdir('.visual-review', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
try {
  const page = await browser.newPage();
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(base, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: `.visual-review/${prefix}-${name}.png` });
    for (const id of ['services', 'destinations', 'exigence']) {
      await page.$eval(`#${id}`, el => el.scrollIntoView({ behavior: 'instant' }));
      await page.waitForNetworkIdle();
      await new Promise(r => setTimeout(r, 700));
      await page.screenshot({ path: `.visual-review/${prefix}-${name}-${id}.png` });
    }
    await page.goto(`${base}/demande-de-devis`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: `.visual-review/${prefix}-${name}-quote.png` });
  }
} finally {
  await browser.close();
}
