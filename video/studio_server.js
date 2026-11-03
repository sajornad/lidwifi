const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { generateSvg } = require('./render_svg');

const PORT = 3333;
const ROOT = __dirname;

let rendering = false;

const server = http.createServer((req, res) => {
  // CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // API: Get content.json
  if (req.method === 'GET' && req.url === '/api/content') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return fs.createReadStream(path.join(ROOT, 'content.json')).pipe(res);
  }

  // API: Save content.json + recompile SVG
  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const content = JSON.parse(body);
        const jsonPath = path.join(ROOT, 'content.json');
        const svgPath = path.join(ROOT, 'lidwifi_motion.svg');

        fs.writeFileSync(jsonPath, JSON.stringify(content, null, 2), 'utf8');
        const svg = generateSvg(content);
        fs.writeFileSync(svgPath, svg, 'utf8');

        console.log('💾 Saved content.json & recompiled lidwifi_motion.svg');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Saved and compiled successfully!' }));
      } catch (err) {
        console.error('Save error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // API: Render MP4
  if (req.method === 'POST' && req.url === '/api/render-mp4') {
    if (rendering) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, message: 'Render already in progress' }));
    }

    rendering = true;
    console.log('🎬 Starting MP4 render...');
    const p = spawn('node', ['export_mp4.js'], { cwd: ROOT });

    let logs = '';
    p.stdout.on('data', d => { logs += d.toString(); process.stdout.write(d); });
    p.stderr.on('data', d => { logs += d.toString(); process.stderr.write(d); });

    p.on('close', code => {
      rendering = false;
      if (code === 0) {
        // Also copy to Downloads
        try {
          const src = path.join(ROOT, 'LidWiFi_Motion_60s.mp4');
          const dest = path.join(process.env.HOME || '/Users/danielrojasroa', 'Downloads', 'LidWiFi_Motion_60s.mp4');
          fs.copyFileSync(src, dest);
          console.log('✅ Copied new MP4 to ~/Downloads');
        } catch (e) {
          console.error('Copy to downloads failed:', e);
        }
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, message: 'Rendering started in background' }));
  }

  // API: Render status
  if (req.method === 'GET' && req.url === '/api/render-status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ rendering }));
  }

  // Static files
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/preview.html') reqPath = '/preview.html';

  const filePath = path.join(ROOT, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found');
  }

  const ext = path.extname(filePath);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.js': 'text/javascript',
    '.mp4': 'video/mp4'
  };

  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n🚀 LidWiFi Studio Server running at http://localhost:${PORT}`);
  console.log(`   Open in browser: http://localhost:${PORT}/preview.html\n`);
});
