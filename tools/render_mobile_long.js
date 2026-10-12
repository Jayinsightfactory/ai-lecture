const { chromium } = require('playwright');
const fs = require('fs');

const html = 'file:///C:/Users/USER/Documents/Codex/2026-07-16/new-chat-2/publish-repo/tmp/mobile-source.html';
const out = 'C:/Users/USER/Documents/Codex/2026-07-16/new-chat-2/publish-repo/tmp/mobile-long';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(html);
  await page.waitForTimeout(700);
  const total = await page.locator('.slide').count();
  const heights = [];

  for (let i = 0; i < total; i++) {
    await page.evaluate((index) => go(index), i);
    await page.waitForTimeout(900);
    const slide = page.locator('.slide.active');
    const box = await slide.boundingBox();
    heights.push(Math.round(box.height));
    await slide.screenshot({
      path: `${out}/slide-${String(i + 1).padStart(3, '0')}.jpg`,
      type: 'jpeg',
      quality: 90
    });
  }

  fs.writeFileSync(`${out}/heights.json`, JSON.stringify(heights, null, 2));
  console.log(JSON.stringify({ total, min: Math.min(...heights), max: Math.max(...heights), heights }));
  await browser.close();
})();
