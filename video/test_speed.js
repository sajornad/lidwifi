const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const htmlPath = 'file://' + path.resolve(__dirname, 'preview.html');
  await page.goto(htmlPath + '?t=0', { waitUntil: 'load' });
  await page.evaluate(() => {
    // Hide controls bar so only the SVG is visible in full 1920x1080
    document.getElementById('bar').style.display = 'none';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    const svg = document.querySelector('#stage svg');
    svg.style.width = '1920px';
    svg.style.height = '1080px';
    svg.style.maxHeight = 'none';
  });

  const t0 = Date.now();
  for (let i = 0; i < 30; i++) {
    const t = i / 30;
    await page.evaluate((sec) => seek(sec), t);
    await page.screenshot({ type: 'jpeg', quality: 85 });
  }
  const elapsed = (Date.now() - t0) / 1000;
  console.log(`30 frames took ${elapsed.toFixed(2)}s (${(30 / elapsed).toFixed(1)} fps)`);
  await browser.close();
}

test().catch(console.error);
