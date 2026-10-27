import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.argv[2] || 'http://127.0.0.1:4322';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
try {
  const page = await browser.newPage();
  for (const width of [320, 640, 1024, 1280, 1920]) {
    await page.setViewport({ width, height: 900 });
    for (const path of ['/', '/services', '/services/transferts', '/partenaires', '/demande-de-devis']) {
      await page.goto(base + path, { waitUntil: 'networkidle0' });
      const layout = await page.evaluate(() => {
        const header = document.querySelector('.header__inner');
        const items = [...header.children].filter(el => getComputedStyle(el).display !== 'none');
        const boxes = items.map(el => el.getBoundingClientRect());
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          overlap: boxes.some((box, i) => i > 0 && box.left < boxes[i - 1].right - 1),
        };
      });
      assert.equal(layout.overflow, false, `${path}: horizontal overflow at ${width}px`);
      assert.equal(layout.overlap, false, `${path}: header overlap at ${width}px`);
    }
    console.log(`OK responsive + header: ${width}px, 5 pages`);
  }

  await page.setViewport({ width: 390, height: 844 });
  for (const need of ['transfert', 'disposition', 'evenement', 'mariage', 'excursion', 'business']) {
    await page.goto(base, { waitUntil: 'networkidle0' });
    await page.select('#quick-need', need);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('.booking-strip button[type="submit"]'),
    ]);
    const selected = await page.$eval('input[name="need"]:checked', el => el.value);
    assert.equal(selected, need, 'Quick enquiry should preserve the selected service');
    assert.equal(await page.$eval('[data-step="2"]', el => el.hidden), false);
    console.log(`OK quick enquiry: ${need} opens the correct form`);
  }

  await page.goto(`${base}/services/transferts`, { waitUntil: 'networkidle0' });
  await page.click('.subnav a[href="#organisation"]');
  await new Promise(r => setTimeout(r, 800));
  const anchors = await page.evaluate(() => ({
    headerBottom: document.querySelector('#site-header').getBoundingClientRect().bottom,
    navTop: document.querySelector('.subnav').getBoundingClientRect().top,
    navBottom: document.querySelector('.subnav').getBoundingClientRect().bottom,
    sectionTop: document.querySelector('#organisation').getBoundingClientRect().top,
  }));
  assert.ok(anchors.navTop >= anchors.headerBottom - 1, 'Subnav should clear the fixed header');
  assert.ok(anchors.sectionTop >= anchors.navBottom - 1, 'Section should clear both navigation bars');
  console.log('OK service navigation: no content hidden behind fixed navigation');
} finally {
  await browser.close();
}
