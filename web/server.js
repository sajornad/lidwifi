const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 3456;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`;
const DMG_DOWNLOAD_URL = process.env.DMG_DOWNLOAD_URL || `${PUBLIC_BASE_URL}/LidWiFi.dmg`;
const GOOGLE_FORM_ID = '1WuohqGZDQYZS54f2T4_QXhnxiaFP4Ah_RtCpGOZPhHE';
const GOOGLE_FORM_RESPONSE_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSc_2MnptFMaQz28-d9_eonfqVAyFRU-JwCuqnGQUKCIo1asbA/formResponse';
const MAX_BODY_BYTES = 16 * 1024;
const rateLimitMap = new Map();

function maskEmail(email) {
  const parts = String(email || '').split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  return `${name.slice(0, 1)}***@${parts[1]}`;
}

function sanitizeCsvCell(val) {
  let str = String(val ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (/^[=+\-@|\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function isAuthorizedAdmin(req) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken || adminToken.length < 16) return false;
  const authHeader = String(req.headers.authorization || '');
  const expected = Buffer.from(`Bearer ${adminToken}`, 'utf8');
  const actual = Buffer.from(authHeader, 'utf8');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function setSecurityHeaders(res) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' https://docs.google.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}

function forwardToGoogleForm(data) {
  return new Promise((resolve) => {
    const params = new URLSearchParams();
    if (data.fullName) params.append('entry.1902514531', data.fullName);
    if (data.email) params.append('entry.254744361', data.email);
    if (data.whatsapp) params.append('entry.1527128844', data.whatsapp);
    if (data.sourceChannel) params.append('entry.955042020', data.sourceChannel);
    if (Array.isArray(data.motivations)) {
      data.motivations.forEach((m) => params.append('entry.361352581', m));
    }
    const body = params.toString();
    const req = https.request(
      GOOGLE_FORM_RESPONSE_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => resolve(res.statusCode >= 200 && res.statusCode < 400)
    );
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

const ROOT = path.resolve(__dirname, '..');
const WEB_DIR = __dirname;
const LEADS_JSON = path.join(WEB_DIR, 'leads.json');
const LEADS_CSV = path.join(WEB_DIR, 'leads.csv');
const SENT_EMAILS_JSON = path.join(WEB_DIR, 'sent_emails.json');

if (!fs.existsSync(LEADS_JSON)) {
  fs.writeFileSync(LEADS_JSON, '[]\n', 'utf8');
}
if (!fs.existsSync(LEADS_CSV)) {
  fs.writeFileSync(LEADS_CSV, 'timestamp,email,lang,source\n', 'utf8');
}
if (!fs.existsSync(SENT_EMAILS_JSON)) {
  fs.writeFileSync(SENT_EMAILS_JSON, '[]\n', 'utf8');
}

function buildEmailContent(email, lang = 'en') {
  const isEs = lang === 'es';
  const subject = isEs
    ? 'Tu enlace de descarga de LidWiFi para macOS (LidWiFi.dmg)'
    : 'Your LidWiFi for macOS Download Link (LidWiFi.dmg)';

  const html = `
    <div style="background-color:#F5F2EB; padding:36px 24px; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif; color:#111315;">
      <div style="max-width:560px; margin:0 auto; background:#FDFBF7; border:2px solid #111315; border-radius:16px; padding:32px;">
        <h1 style="font-size:32px; font-weight:900; letter-spacing:-0.03em; margin:0 0 12px 0; color:#111315;">
          ${isEs ? 'Tapa Cerrada. <span style="color:#196EFF;">Wi‑Fi Apagado.</span> Más Batería.' : 'Lid Off. <span style="color:#196EFF;">Wi‑Fi Off.</span> More Battery.'}
        </h1>
        <p style="font-size:16px; line-height:1.55; color:#3D4248; margin:0 0 24px 0;">
          ${isEs
            ? '¡Gracias por tu interés en <strong>LidWiFi</strong>! Haz clic en el botón de abajo para descargar el instalador para macOS (<code>LidWiFi.dmg</code>):'
            : 'Thanks for your interest in <strong>LidWiFi</strong>! Click the button below to download the macOS installer (<code>LidWiFi.dmg</code>):'}
        </p>
        <p style="margin:0 0 28px 0;">
          <a href="${DMG_DOWNLOAD_URL}"
             style="display:inline-block; background:linear-gradient(90deg, #00E660 0%, #196EFF 100%); background-color:#196EFF; color:#FFFFFF; font-weight:800; font-size:17px; text-decoration:none; padding:16px 28px; border-radius:12px; border:2px solid #111315;">
            ${isEs ? 'Descargar LidWiFi.dmg (2.3 MB) ↓' : 'Download LidWiFi.dmg (2.3 MB) ↓'}
          </a>
        </p>
        <p style="font-size:14px; line-height:1.5; color:#5C626A; margin:0; border-top:1px solid #EAE5DA; padding-top:16px;">
          ${isEs
            ? '<strong>Instalación en 1 clic:</strong> Abre <code>LidWiFi.dmg</code> y haz doble clic en <code>LidWiFi.app</code>. Se instalará automáticamente en <code>/Applications</code> y en tu barra de menú.'
            : '<strong>1-Click Install:</strong> Open <code>LidWiFi.dmg</code> and double-click <code>LidWiFi.app</code>. It automatically installs into <code>/Applications</code> and starts in your Mac menu bar.'}
        </p>
      </div>
    </div>
  `.trim();

  const text = isEs
    ? `LidWiFi para macOS\n\nDescarga tu instalador aquí: ${DMG_DOWNLOAD_URL}\n\nAbre LidWiFi.dmg y haz doble clic en LidWiFi.app para instalarlo en tu barra de menú.`
    : `LidWiFi for macOS\n\nDownload your installer here: ${DMG_DOWNLOAD_URL}\n\nOpen LidWiFi.dmg and double-click LidWiFi.app to install it into your menu bar.`;

  return { subject, html, text };
}

async function dispatchDownloadEmail(email, lang = 'en') {
  const { subject, html, text } = buildEmailContent(email, lang);
  let transport = 'outbox_log';
  let delivered = false;

  // 1. Optional Resend API integration (set RESEND_API_KEY env var)
  if (process.env.RESEND_API_KEY) {
    transport = 'resend_api';
    const payload = JSON.stringify({
      from: process.env.EMAIL_FROM || 'LidWiFi <onboarding@resend.dev>',
      to: [email],
      subject,
      html,
      text
    });
    delivered = await new Promise((resolve) => {
      const req = https.request(
        'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        },
        (res) => resolve(res.statusCode >= 200 && res.statusCode < 300)
      );
      req.on('error', () => resolve(false));
      req.write(payload);
      req.end();
    });
  } else if (process.env.SEND_APPLE_MAIL === '1') {
    // 2. Optional macOS Mail.app automation
    transport = 'apple_mail';
    const script = `
      tell application "Mail"
        set newMessage to make new outgoing message with properties {subject:${JSON.stringify(subject)}, content:${JSON.stringify(text)} & return & return, visible:false}
        tell newMessage
          make new to recipient at end of to recipients with properties {address:${JSON.stringify(email)}}
          send
        end tell
      end tell
    `;
    delivered = await new Promise((resolve) => {
      execFile('/usr/bin/osascript', ['-e', script], (err) => resolve(!err));
    });
  } else {
    delivered = true;
  }

  const outbox = JSON.parse(fs.readFileSync(SENT_EMAILS_JSON, 'utf8') || '[]');
  const record = {
    timestamp: new Date().toISOString(),
    to: maskEmail(email),
    lang,
    subject,
    downloadLink: DMG_DOWNLOAD_URL,
    transport,
    delivered
  };
  outbox.push(record);
  fs.writeFileSync(SENT_EMAILS_JSON, JSON.stringify(outbox, null, 2) + '\n', 'utf8');
  return record;
}

function saveLead(email, lang = 'en', source = 'web_form', extra = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    email: String(email).trim().slice(0, 254),
    lang: String(lang || 'en').slice(0, 8),
    source: String(source || 'web_form').slice(0, 32),
    fullName: String(extra.fullName || '').trim().slice(0, 120),
    whatsapp: String(extra.whatsapp || '').trim().slice(0, 40),
    sourceChannel: String(extra.sourceChannel || '').trim().slice(0, 60),
    motivations: Array.isArray(extra.motivations) ? extra.motivations.slice(0, 10).map((m) => String(m).slice(0, 80)) : []
  };
  const list = JSON.parse(fs.readFileSync(LEADS_JSON, 'utf8') || '[]');
  list.push(entry);
  fs.writeFileSync(LEADS_JSON, JSON.stringify(list, null, 2) + '\n', 'utf8');
  const csvLine = `${sanitizeCsvCell(entry.timestamp)},${sanitizeCsvCell(entry.email)},${sanitizeCsvCell(entry.lang)},${sanitizeCsvCell(entry.source)}\n`;
  fs.appendFileSync(LEADS_CSV, csvLine, 'utf8');
  return { timestamp: entry.timestamp, source: entry.source };
}

const server = http.createServer((req, res) => {
  setSecurityHeaders(res);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'POST' && (url.pathname === '/api/subscribe' || url.pathname === '/api/webhook/google-form')) {
    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = (rateLimitMap.get(ip) || []).filter((t) => now - t < 60_000);
    if (bucket.length >= 10) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Too many requests. Please try again in a minute.' }));
    }
    bucket.push(now);
    rateLimitMap.set(ip, bucket);

    let body = '';
    let aborted = false;
    req.on('data', (chunk) => {
      if (aborted) return;
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Payload too large' }));
        req.destroy();
      }
    });
    req.on('end', async () => {
      if (aborted) return;
      try {
        let email = '';
        let lang = 'en';
        let extra = {};
        if (req.headers['content-type']?.includes('application/json')) {
          const data = JSON.parse(body || '{}');
          email = data.email || '';
          lang = data.lang || 'en';
          extra = {
            fullName: data.fullName || '',
            whatsapp: data.whatsapp || '',
            sourceChannel: data.sourceChannel || '',
            motivations: Array.isArray(data.motivations) ? data.motivations : []
          };
        } else {
          const params = new URLSearchParams(body);
          email = params.get('email') || '';
          lang = params.get('lang') || 'en';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email) || email.length > 254) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Invalid email' }));
        }
        const source = url.pathname.includes('google-form') ? 'google_form' : 'web_modal_google_form';
        const saved = saveLead(email, lang, source, extra);
        const googleFormSubmitted = await forwardToGoogleForm({ email, ...extra });
        await dispatchDownloadEmail(email, lang);

        // Return minimal confirmation without echoing PII back in the HTTP response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          ok: true,
          googleFormSubmitted,
          lead: saved
        }));
      } catch (_) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Internal server error' }));
      }
    });
    return;
  }

  const isRead = req.method === 'GET' || req.method === 'HEAD';

  if (isRead && (url.pathname === '/api/leads' || url.pathname === '/api/sent-emails')) {
    if (!isAuthorizedAdmin(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Forbidden: ADMIN_API_TOKEN required' }));
    }
    const targetFile = url.pathname === '/api/leads' ? LEADS_JSON : SENT_EMAILS_JSON;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(targetFile, 'utf8'));
  }

  if (isRead && url.pathname === '/LidWiFi.dmg') {
    const dmgPath = path.join(ROOT, 'LidWiFi.dmg');
    if (fs.existsSync(dmgPath)) {
      const stat = fs.statSync(dmgPath);
      res.writeHead(200, {
        'Content-Type': 'application/x-apple-diskimage',
        'Content-Disposition': 'attachment; filename="LidWiFi.dmg"',
        'Content-Length': stat.size
      });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(dmgPath).pipe(res);
    }
  }

  if (isRead && url.pathname === '/icon/AppIcon_1024.png') {
    const iconPath = path.join(ROOT, 'icon', 'AppIcon_1024.png');
    res.writeHead(200, { 'Content-Type': 'image/png' });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(iconPath).pipe(res);
  }

  if (isRead && (url.pathname === '/' || url.pathname === '/index.html')) {
    const htmlPath = path.join(WEB_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(htmlPath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`LidWiFi web server running at http://127.0.0.1:${PORT}`);
});
