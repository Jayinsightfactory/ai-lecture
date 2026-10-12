const { chromium } = require('playwright');
const fs = require('fs');

const html = 'file:///C:/Users/USER/Documents/Codex/2026-07-16/new-chat-2/publish-repo/tmp/mobile-source.html';
const out = 'C:/Users/USER/Documents/Codex/2026-07-16/new-chat-2/publish-repo/tmp/mobile-pages';
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
  const scales = [];

  for (let i = 0; i < total; i++) {
    await page.evaluate((index) => go(index), i);
    await page.waitForTimeout(900);
    const scale = await page.evaluate(() => {
      const slide = document.querySelector('.slide.active');
      const wrap = slide.querySelector('.wrap');
      wrap.style.transform = 'none';
      const rect = wrap.getBoundingClientRect();
      let s = Math.min(1, 936 / rect.width, 1640 / rect.height);
      if (s < 0.66) {
        slide.classList.add('mobile-compact');
        slide.querySelectorAll('.g3,.g4,.g5,.g6').forEach((el) => {
          el.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))';
        });
        const next = wrap.getBoundingClientRect();
        s = Math.min(1, 936 / next.width, 1640 / next.height);
      }
      wrap.style.transform = `scale(${s})`;
      return s;
    });
    scales.push(Number(scale.toFixed(3)));
    await page.screenshot({ path: `${out}/slide-${String(i + 1).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 88 });
  }

  fs.writeFileSync(`${out}/scales.json`, JSON.stringify(scales, null, 2));
  console.log(JSON.stringify({ total, minScale: Math.min(...scales), scales }));
  await browser.close();
})();
