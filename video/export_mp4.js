const puppeteer = require('puppeteer-core');
const path = require('path');
const { spawn } = require('child_process');

async function exportVideo() {
  const duration = 60; // seconds
  const fps = 30;
  const totalFrames = duration * fps;
  const outputFile = path.resolve(__dirname, 'LidWiFi_Motion_60s.mp4');

  console.log(`Starting export: ${totalFrames} frames (${duration}s @ ${fps}fps) -> ${outputFile}`);

  const ffmpeg = spawn('/opt/homebrew/bin/ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-framerate', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputFile
  ]);

  ffmpeg.stderr.on('data', (d) => {
    // Only log errors or completion summary
    const s = d.toString();
    if (s.includes('Error') || s.includes('video:')) console.log('[ffmpeg]', s.trim());
  });

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const svgPath = 'file://' + path.resolve(__dirname, 'lidwifi_motion.svg');
  await page.goto(svgPath, { waitUntil: 'load' });

  const startTime = Date.now();
  let lastLog = 0;

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;
    await page.evaluate((s) => {
      document.getAnimations().forEach(a => {
        a.pause();
        a.currentTime = s * 1000;
      });
    }, t);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });

    if (!ffmpeg.stdin.write(buf)) {
      await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }

    if (i - lastLog >= 150 || i === totalFrames - 1) {
      lastLog = i;
      const progress = ((i / totalFrames) * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Rendered frame ${i}/${totalFrames} (${progress}%) in ${elapsed}s`);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });

  await browser.close();
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Export finished successfully in ${totalElapsed}s: ${outputFile}`);
}

exportVideo().catch((err) => {
  console.error('Export error:', err);
  process.exit(1);
});
