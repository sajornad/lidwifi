// Captures stills of the video at given seconds: node snap.js 4 14 26 40 49 57
const puppeteer = require('puppeteer-core');
const path = require('path');
(async () => {
  const times = process.argv.slice(2).map(Number);
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080 });
  await p.goto('file://' + path.resolve(__dirname, 'lidwifi_motion.svg'));
  for (const t of times) {
    await p.evaluate(s => document.getAnimations().forEach(a => { a.pause(); a.currentTime = s * 1000; }), t);
    await p.screenshot({ path: path.resolve(__dirname, `snaps/t${t}.jpg`), type: 'jpeg', quality: 70 });
  }
  await b.close();
  console.log('ok');
})();
