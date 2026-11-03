const fs = require('fs');
const path = require('path');

function escapeXml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateSvg(rawContent) {
  // Deep clone and sanitize strings
  const content = JSON.parse(JSON.stringify(rawContent));
  for (const sKey in content.scenes) {
    for (const fKey in content.scenes[sKey]) {
      content.scenes[sKey][fKey] = escapeXml(content.scenes[sKey][fKey]);
    }
  }
  const { theme, scenes } = content;
  const s = scenes;
  // Multi-line text: "line1\nline2" -> tspans (SVG has no auto-wrap)
  const ml = (str, x, lh) => String(str).split('\n')
    .map((p, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${p}</tspan>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated from content.json for LidWiFi Battery-Saving Story -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080" id="motionSvg">
<style><![CDATA[
  :root{
    --bg1:${theme.bg1}; --bg2:${theme.bg2}; --glowA:${theme.glowA}; --glowB:${theme.glowB};
    --accent:${theme.accent}; --accent2:${theme.accent2}; --ok:${theme.ok}; --warn:${theme.warn};
    --text:${theme.text}; --muted:${theme.muted}; --card:rgba(255,255,255,.06); --line:rgba(255,255,255,.14);
    --font:'SF Pro Display','Inter',-apple-system,'Segoe UI',system-ui,sans-serif;
    --mono:'SF Mono','JetBrains Mono',Menlo,monospace;
  }
  text{font-family:var(--font);fill:var(--text)}
  .mono{font-family:var(--mono)}
  .muted{fill:var(--muted)}
  .kicker{font-size:22px;font-weight:700;letter-spacing:6px;fill:var(--accent2)}
  .h1{font-size:56px;font-weight:800;letter-spacing:-1.2px}
  .h1-s2{font-size:52px;font-weight:800;letter-spacing:-1px}
  .h2{font-size:54px;font-weight:800;letter-spacing:-1px}
  .body{font-size:28px;fill:var(--muted);line-height:1.4}
  .warnTxt{fill:var(--warn)} .okTxt{fill:var(--ok)}

  .t60{animation-duration:60s;animation-iteration-count:infinite;animation-timing-function:ease-in-out}

  .ap ,.apL,.apS{animation-duration:60s;animation-iteration-count:infinite;animation-fill-mode:both;animation-timing-function:cubic-bezier(.2,.8,.2,1)}
  .ap {animation-name:ap}
  .apL{animation-name:apL}
  .apS{animation-name:apS;transform-box:fill-box;transform-origin:center}
  @keyframes ap {0%{opacity:0;transform:translateY(24px)} 1.6%,30%{opacity:1;transform:none} 31%,100%{opacity:0}}
  @keyframes apL{0%{opacity:0;transform:translateX(36px)} 1.4%,30%{opacity:1;transform:none} 31%,100%{opacity:0}}
  @keyframes apS{0%{opacity:0;transform:scale(.7)} 1.4%{opacity:1;transform:scale(1.05)} 2.2%,30%{opacity:1;transform:scale(1)} 31%,100%{opacity:0}}

  /* Scene gates (percentages of 60s) */
  #S1{animation-name:s1} @keyframes s1{0%{opacity:0}1%,15.5%{opacity:1}16.5%,100%{opacity:0}}
  #STAGE{animation-name:stage} @keyframes stage{0%,16%{opacity:0}17%,72%{opacity:1}73%,100%{opacity:0}}
  #S2{animation-name:s2} @keyframes s2{0%,16%{opacity:0}17.5%,32%{opacity:1}33%,100%{opacity:0}}
  #S3{animation-name:s3} @keyframes s3{0%,33%{opacity:0}34%,52%{opacity:1}53%,100%{opacity:0}}
  #S4{animation-name:s4} @keyframes s4{0%,53%{opacity:0}54%,72%{opacity:1}73%,100%{opacity:0}}
  #S5{animation-name:s5} @keyframes s5{0%,73%{opacity:0}74%,86%{opacity:1}87%,100%{opacity:0}}
  #S6{animation-name:s6} @keyframes s6{0%,87%{opacity:0}88%,99%{opacity:1}100%{opacity:0}}
  #MENUBAR{animation-name:mb} @keyframes mb{0%,33%{opacity:0;transform:translateY(-60px)}34.5%,72%{opacity:1;transform:none}73%,100%{opacity:0;transform:translateY(-60px)}}

  /* Laptop lid rotation */
  .lid{animation-name:lid;transform-box:view-box;transform-origin:420px 628px}
  @keyframes lid{
    0%,20%   {transform:rotate(0deg)}        /* S1 closed */
    22%,35%  {transform:rotate(0deg)}        /* S2 closed (warning) */
    37%,52%  {transform:rotate(-105deg)}     /* S3 open (menu bar) */
    54%,62%  {transform:rotate(0deg)}        /* S4 closed (cut wifi) */
    64%,100% {transform:rotate(-105deg)}     /* S4 open (wifi back) */
  }
  .screenGlow{animation-name:glow}
  @keyframes glow{0%,36.5%{opacity:0}37.5%,52.5%{opacity:1}53.5%,62.5%{opacity:0}63.5%,100%{opacity:1}}

  /* Battery drain in S1: 100% -> 50% */
  .batDrain{animation-name:batD}
  @keyframes batD{
    0%,6%{transform:scaleX(1);fill:var(--ok)}
    10%,16%{transform:scaleX(0.5);fill:var(--warn)}
  }
  .pct100{animation-name:p100} @keyframes p100{0%,7%{opacity:1}8.5%,100%{opacity:0}}
  .pct50{animation-name:p50}   @keyframes p50 {0%,7.5%{opacity:0}8.5%,16%{opacity:1}17%,100%{opacity:0}}

  /* Wi‑Fi wave pulses and states */
  .wifiOn{animation-name:wifiOn}   @keyframes wifiOn {0%,54%{opacity:1}54.8%,62.8%{opacity:0}63.6%,100%{opacity:1}}
  .wifiOff{animation-name:wifiOff} @keyframes wifiOff{0%,54%{opacity:0}54.8%,62.8%{opacity:1}63.6%,100%{opacity:0}}
  .slash{stroke-dasharray:200;animation-name:slash}
  @keyframes slash{0%,54.2%{stroke-dashoffset:200}55.5%,62.8%{stroke-dashoffset:0}63.6%,100%{stroke-dashoffset:200}}
  .warn{animation-name:warn} @keyframes warn{0%,17%{opacity:0}18.5%,32.5%{opacity:1}33.5%,100%{opacity:0}}
  .moon{animation-name:moon}
  @keyframes moon{0%,20%{opacity:1}21%,36%{opacity:1}37%,53%{opacity:0}54%,62.8%{opacity:1}63.6%,100%{opacity:0}}

  .okBadge{animation-name:okB}
  @keyframes okB{0%,63.5%{opacity:0;transform:scale(.5)}64.5%{opacity:1;transform:scale(1.1)}65.5%,72%{opacity:1;transform:scale(1)}73%,100%{opacity:0}}
  .offBadge{animation-name:offB}
  @keyframes offB{0%,54.8%{opacity:0;transform:scale(.5)}55.8%{opacity:1;transform:scale(1.1)}56.8%,62.5%{opacity:1;transform:scale(1)}63.5%,100%{opacity:0}}
  .okBadge,.offBadge{transform-box:fill-box;transform-origin:center}

  .pulse{animation:pulse 1.6s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
  .ring{animation:ring 1.8s ease-out infinite;transform-box:fill-box;transform-origin:center}
  @keyframes ring{0%{opacity:.8;transform:scale(.3)}100%{opacity:0;transform:scale(1.6)}}
  .pk{animation:rise 2.4s ease-out infinite}
  @keyframes rise{0%{opacity:0;transform:translateY(0)}20%{opacity:1}100%{opacity:0;transform:translateY(-170px)}}
  .zz{animation:zz 3s ease-in-out infinite}
  @keyframes zz{0%{opacity:0;transform:translate(0,0)}30%{opacity:1}100%{opacity:0;transform:translate(30px,-60px)}}
  .drift{animation:drift 18s ease-in-out infinite alternate}
  @keyframes drift{to{transform:translate(120px,-60px) scale(1.15)}}
  .drift2{animation:drift 22s ease-in-out infinite alternate-reverse}

  /* Dropdown and cursor in S3 */
  .dropdown{animation-name:dd;transform-box:view-box;transform-origin:1440px 60px}
  @keyframes dd{0%,35.5%{opacity:0;transform:scale(.92) translateY(-12px)}36.5%,51%{opacity:1;transform:none}52%,100%{opacity:0;transform:scale(.96)}}
  .iconHi{animation-name:iconHi}
  @keyframes iconHi{0%,35%{opacity:0}35.8%,51.5%{opacity:1}52.5%,100%{opacity:0}}
  .cursor{animation-name:cur}
  @keyframes cur{0%,34%{opacity:0;transform:translate(1720px,560px)}34.5%{opacity:1;transform:translate(1720px,560px)}35.8%,37.5%{opacity:1;transform:translate(1436px,30px)}38.5%,100%{opacity:0;transform:translate(1436px,30px)}}
  .click{animation-name:click;transform-box:view-box;transform-origin:1436px 30px}
  @keyframes click{0%,35.6%{opacity:0;transform:scale(.2)}36%{opacity:.9}37%,100%{opacity:0;transform:scale(1.8)}}

  /* Outro double click animation */
  .curDbl{animation-name:curDbl;transform-box:view-box}
  @keyframes curDbl{
    0%,87.5%{opacity:0;transform:translate(1080px,580px)}
    88.5%{opacity:1;transform:translate(1000px,460px)}
    90%,96%{opacity:1;transform:translate(960px,360px)}
    97%,100%{opacity:0;transform:translate(960px,200px)}
  }
  .clickPulse{animation-name:clickP;transform-box:view-box;transform-origin:960px 360px}
  @keyframes clickP{
    0%,90%{opacity:0;transform:scale(.2)}
    90.5%{opacity:1;transform:scale(.6)}
    91%{opacity:0;transform:scale(1.3)}
    91.5%{opacity:1;transform:scale(.6)}
    92.5%,100%{opacity:0;transform:scale(1.8)}
  }

  .progress{animation:prog 60s linear infinite;transform-box:view-box;transform-origin:0 0}
  @keyframes prog{from{transform:scaleX(0)}to{transform:scaleX(1)}}
]]></style>

<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" style="stop-color:var(--bg1)"/><stop offset="1" style="stop-color:var(--bg2)"/>
  </linearGradient>
  <radialGradient id="glowA"><stop offset="0" style="stop-color:var(--glowA);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--glowA);stop-opacity:0"/></radialGradient>
  <radialGradient id="glowB"><stop offset="0" style="stop-color:var(--glowB);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--glowB);stop-opacity:0"/></radialGradient>
  <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" style="stop-color:var(--accent)"/><stop offset="1" style="stop-color:var(--accent2)"/>
  </linearGradient>
  <linearGradient id="alu" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d9deea"/><stop offset="1" stop-color="#8d94a8"/>
  </linearGradient>
  <filter id="blur20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="20" stdDeviation="25" flood-color="#000" flood-opacity=".5"/></filter>
  <mask id="moonMask"><circle cx="0" cy="0" r="34" fill="#fff"/><circle cx="16" cy="-12" r="30" fill="#000"/></mask>

  <!-- App logo -->
  <symbol id="logo" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#835bf8"/>
        <stop offset="45%" stop-color="#6977fc"/>
        <stop offset="100%" stop-color="#38bdf8"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="200" height="200" rx="46" fill="url(#logoGrad)"/>
    <rect x="2" y="2" width="196" height="196" rx="44" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2"/>
    <g fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round">
      <line x1="48" y1="144" x2="152" y2="144" stroke-width="12.5"/>
      <circle cx="100" cy="121" r="8.8" fill="#ffffff" stroke="none"/>
      <path d="M 76 101 A 33 33 0 0 1 124 101" stroke-width="12.5"/>
      <path d="M 58 82 A 59 59 0 0 1 142 82" stroke-width="12.5"/>
    </g>
  </symbol>
</defs>

<!-- BACKGROUND -->
<rect width="1920" height="1080" fill="url(#bg)"/>
<circle class="drift"  cx="420"  cy="300" r="520" fill="url(#glowA)"/>
<circle class="drift2" cx="1560" cy="820" r="560" fill="url(#glowB)"/>
<g opacity=".05" stroke="#fff">
  <path d="M0 270H1920M0 540H1920M0 810H1920M480 0V1080M960 0V1080M1440 0V1080"/>
</g>

<!-- ========================================== -->
<!-- S1 · EL DOLOR: DRENAJE FANTASMA (0–10s)    -->
<!-- ========================================== -->
<g id="S1" class="t60">
  <!-- Closed Mac in S1 -->
  <g transform="translate(40, -40)">
    <ellipse cx="560" cy="650" rx="340" ry="24" fill="#000" opacity=".5" filter="url(#soft)"/>
    <rect x="340" y="594" width="460" height="20" rx="8" fill="url(#alu)"/>
    <rect x="340" y="610" width="460" height="5" rx="2.5" fill="#5d6378"/>
    <rect x="348" y="582" width="444" height="13" rx="6.5" fill="url(#alu)"/>
    <!-- Sleep Moon -->
    <g transform="translate(420 490)">
      <circle r="28" fill="#ffe8a3" mask="url(#moonMask)"/>
      <text class="zz" x="32" y="-16" font-size="24" style="font-weight:800" fill="#ffe8a3">z</text>
      <text class="zz" x="48" y="-34" font-size="18" style="font-weight:800;animation-delay:1s" fill="#ffe8a3">z</text>
    </g>
    <!-- Battery Widget Draining -->
    <g transform="translate(680 430)"><g class="apS" style="animation-delay:.5s">
      <rect x="0" y="0" width="260" height="100" rx="20" fill="#151726" stroke="var(--line)" filter="url(#shadow)"/>
      <text x="24" y="36" font-size="13" style="font-weight:700" fill="var(--muted)">BATERÍA EN REPOSO</text>
      <!-- Battery Shell -->
      <rect x="24" y="48" width="130" height="34" rx="8" fill="none" stroke="#fff" stroke-width="3"/>
      <path d="M156 59 V71" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <!-- Level Bar (Animates down) -->
      <rect class="t60 batDrain" x="29" y="53" width="120" height="24" rx="5" transform-origin="29px 53px"/>
      <text class="t60 pct100 okTxt" x="170" y="74" font-size="22" style="font-weight:800">100%</text>
      <text class="t60 pct50 warnTxt" x="170" y="74" font-size="22" style="font-weight:800">50%</text>
    </g></g>
  </g>

  <!-- Right text copy -->
  <text id="txt_s1_kicker" class="ap kicker" style="animation-delay:1.2s" x="1040" y="340">${s.s1.kicker}</text>
  <text id="txt_s1_h1Line1" class="ap h1" style="animation-delay:1.8s" x="1040" y="420">${s.s1.h1Line1}</text>
  <text id="txt_s1_h1Line2" class="ap h1 warnTxt" style="animation-delay:2.4s" x="1040" y="495">${s.s1.h1Line2}</text>
  <text id="txt_s1_sub1" class="ap body" style="animation-delay:3.2s" x="1040" y="580">${ml(s.s1.sub1, 1040, 44)}</text>
</g>

<!-- ========================================== -->
<!-- MENU BAR (visible during S3 & S4)          -->
<!-- ========================================== -->
<g id="MENUBAR" class="t60">
  <rect x="0" y="0" width="1920" height="56" fill="#15161c" fill-opacity=".92"/>
  <rect x="0" y="55" width="1920" height="1" fill="#fff" fill-opacity=".08"/>
  <g font-size="20" style="font-weight:500">
    <text x="1080" y="36" class="muted">74.7°C</text>
    <circle cx="1210" cy="28" r="10" fill="none" stroke="#c9cede" stroke-width="2.5"/>
    <rect x="1262" y="19" width="26" height="18" rx="4" fill="none" stroke="#c9cede" stroke-width="2.5"/>
    <circle cx="1340" cy="28" r="10" fill="none" stroke="#c9cede" stroke-width="2.5"/>
    
    <!-- LidWiFi icon in menu bar -->
    <rect class="t60 iconHi" x="1412" y="10" width="48" height="36" rx="8" fill="#fff" fill-opacity=".18"/>
    <g fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
      <rect x="1424" y="19" width="24" height="15" rx="2.5"/><path d="M1419 38H1453"/>
    </g>
    <text x="1500" y="36">100 %</text>
    <rect x="1572" y="19" width="34" height="18" rx="5" fill="none" stroke="#c9cede" stroke-width="2"/>
    <rect x="1576" y="23" width="26" height="10" rx="2" fill="var(--ok)"/>
    <g transform="translate(1650 34)" fill="none" stroke-linecap="round" stroke-width="2.6">
      <g class="t60 wifiOn" stroke="#fff"><path d="M-14 -10 A20 20 0 0 1 14 -10"/><path d="M-8 -4 A11 11 0 0 1 8 -4"/><circle r="2.5" fill="#fff" stroke="none"/></g>
      <g class="t60 wifiOff" stroke="#6b7080"><path d="M-14 -10 A20 20 0 0 1 14 -10"/><path d="M-8 -4 A11 11 0 0 1 8 -4"/><path d="M-14 -18 L14 4" stroke="var(--warn)"/></g>
    </g>
    <text x="1700" y="36" class="muted">Wed 28 Oct 7:30 PM</text>
  </g>
</g>

<!-- ========================================== -->
<!-- STAGE · LAPTOP & INTERACTIVE HARDWARE      -->
<!-- ========================================== -->
<g id="STAGE" class="t60">
  <ellipse cx="640" cy="690" rx="360" ry="26" fill="#000" opacity=".45" filter="url(#soft)"/>
  <rect x="404" y="634" width="512" height="22" rx="9" fill="url(#alu)"/>
  <rect x="404" y="652" width="512" height="5" rx="2.5" fill="#5d6378"/>
  <rect x="860" y="640" width="36" height="5" rx="2.5" fill="#6d7488"/>
  <g class="t60 lid">
    <rect x="414" y="620" width="492" height="14" rx="7" fill="url(#alu)"/>
    <g class="t60 screenGlow">
      <rect x="430" y="632" width="460" height="4" rx="2" fill="var(--accent2)" filter="url(#soft)"/>
      <rect x="430" y="632" width="460" height="3" rx="1.5" fill="#c8f7ff"/>
    </g>
    <circle cx="660" cy="621" r="5" fill="#fff" opacity=".7"/>
  </g>

  <!-- Moon in Sleep -->
  <g class="t60 moon" transform="translate(500 520)">
    <circle r="34" fill="#ffe8a3" mask="url(#moonMask)"/>
    <text class="zz" x="40" y="-20" font-size="28" style="font-weight:800" fill="#ffe8a3">z</text>
    <text class="zz" x="56" y="-40" font-size="22" style="font-weight:800;animation-delay:1s" fill="#ffe8a3">z</text>
  </g>

  <!-- Wi‑Fi Waves -->
  <g fill="none" stroke-linecap="round" stroke-width="16">
    <g class="t60 wifiOn" stroke="var(--accent2)">
      <circle cx="720" cy="430" r="150" fill="url(#glowB)" stroke="none"/>
      <path class="pulse" d="M691.7 441.7A40 40 0 0 1 748.3 441.7"/>
      <path class="pulse" style="animation-delay:.25s" d="M663.4 413.4A80 80 0 0 1 776.6 413.4"/>
      <path class="pulse" style="animation-delay:.5s" d="M635.1 385.1A120 120 0 0 1 804.9 385.1"/>
      <circle cx="720" cy="470" r="11" fill="var(--accent2)" stroke="none"/>
    </g>
    <!-- Wi-Fi Alert (S2) -->
    <g class="t60 warn" stroke="var(--warn)">
      <circle class="ring" cx="720" cy="430" r="120" stroke-width="4"/>
      <path class="pulse" d="M691.7 441.7A40 40 0 0 1 748.3 441.7"/>
      <path class="pulse" style="animation-delay:.25s" d="M663.4 413.4A80 80 0 0 1 776.6 413.4"/>
      <path class="pulse" style="animation-delay:.5s" d="M635.1 385.1A120 120 0 0 1 804.9 385.1"/>
      <circle cx="720" cy="470" r="11" fill="var(--warn)" stroke="none"/>
      <g stroke="none" font-size="20" style="font-weight:700">
        <g class="pk"><rect x="590" y="300" width="84" height="34" rx="17" fill="var(--warn)" fill-opacity=".18" stroke="var(--warn)" stroke-width="2"/><text x="632" y="323" text-anchor="middle" class="warnTxt">iCloud</text></g>
        <g class="pk" style="animation-delay:.8s"><rect x="680" y="300" width="80" height="34" rx="17" fill="var(--warn)" fill-opacity=".18" stroke="var(--warn)" stroke-width="2"/><text x="720" y="323" text-anchor="middle" class="warnTxt">Mail</text></g>
        <g class="pk" style="animation-delay:1.6s"><rect x="766" y="300" width="96" height="34" rx="17" fill="var(--warn)" fill-opacity=".18" stroke="var(--warn)" stroke-width="2"/><text x="814" y="323" text-anchor="middle" class="warnTxt">Sync</text></g>
      </g>
    </g>
    <!-- Wi-Fi Off -->
    <g class="t60 wifiOff" stroke="#3a3f55">
      <path d="M691.7 441.7A40 40 0 0 1 748.3 441.7"/>
      <path d="M663.4 413.4A80 80 0 0 1 776.6 413.4"/>
      <path d="M635.1 385.1A120 120 0 0 1 804.9 385.1"/>
      <circle cx="720" cy="470" r="11" fill="#3a3f55" stroke="none"/>
    </g>
    <path class="t60 slash" d="M640 380L800 500" stroke="var(--warn)" stroke-width="14"/>
  </g>

  <!-- Badges for Wi-Fi Off / On with battery state -->
  <g class="t60 offBadge">
    <rect x="530" y="520" width="380" height="52" rx="26" fill="var(--warn)" fill-opacity=".18" stroke="var(--warn)" stroke-width="2"/>
    <text id="txt_s4_badgeOff" x="720" y="554" text-anchor="middle" font-size="20" style="font-weight:700" class="warnTxt">${s.s4.badgeOff}</text>
  </g>
  <g class="t60 okBadge">
    <rect x="530" y="520" width="380" height="52" rx="26" fill="var(--ok)" fill-opacity=".18" stroke="var(--ok)" stroke-width="2"/>
    <text id="txt_s4_badgeOn" x="720" y="554" text-anchor="middle" font-size="20" style="font-weight:700" class="okTxt">${s.s4.badgeOn}</text>
  </g>
</g>

<!-- ========================================== -->
<!-- S2 · LA CAUSA (10–20s)                     -->
<!-- ========================================== -->
<g id="S2" class="t60">
  <text id="txt_s2_kicker" class="ap kicker" style="animation-delay:11s" x="1040" y="320">${s.s2.kicker}</text>
  <text id="txt_s2_h1Line1" class="ap h1" style="animation-delay:11.6s" x="1040" y="400">${s.s2.h1Line1}</text>
  <text id="txt_s2_h1Line2" class="ap h1-s2 warnTxt" style="animation-delay:12.4s" x="1040" y="475">${ml(s.s2.h1Line2, 1040, 62)}</text>
  <text id="txt_s2_body1" class="ap body" style="animation-delay:13.4s" x="1040" y="630">${ml(s.s2.body1, 1040, 44)}</text>
</g>

<!-- ========================================== -->
<!-- S3 · LA SOLUCIÓN: LIDWIFI (20–32s)         -->
<!-- ========================================== -->
<g id="S3" class="t60">
  <!-- Dropdown Menu Bar simulation -->
  <g class="t60 dropdown" filter="url(#shadow)">
    <rect x="1236" y="64" width="410" height="380" rx="16" fill="#23242e" fill-opacity=".96" stroke="var(--line)"/>
    <g font-size="20">
      <text x="1260" y="104" style="font-weight:800">LidWiFi</text>
      <text x="1260" y="140" fill="var(--ok)">✓ Batería protegida: Activa</text>
      <text x="1260" y="172" class="muted">Tapa: Abierta · Wi‑Fi: Conectado</text>
      <rect x="1252" y="190" width="378" height="1" fill="var(--line)"/>
      <rect x="1246" y="200" width="390" height="34" rx="7" fill="var(--accent)" fill-opacity=".85"/>
      <text x="1260" y="224">✓  Activo (cero consumo fantasma)</text>
      <text x="1260" y="262">     Apagar también con monitor externo</text>
      <text x="1260" y="298">✓  Abrir al iniciar sesión</text>
      <rect x="1252" y="318" width="378" height="1" fill="var(--line)"/>
      <text x="1260" y="356">     Ver registro de ahorro…</text><text x="1622" y="356" text-anchor="end" class="muted">⌘L</text>
      <text x="1260" y="394">     Salir</text><text x="1622" y="394" text-anchor="end" class="muted">⌘Q</text>
    </g>
  </g>
  <text id="txt_s3_kicker" class="ap kicker" style="animation-delay:21.5s" x="1040" y="580">${s.s3.kicker}</text>
  <text id="txt_s3_h2" class="ap h2" style="animation-delay:22.2s" x="1040" y="650">${s.s3.h2}</text>
  <text id="txt_s3_body" class="ap body" style="animation-delay:23s;font-size:30px;fill:#fff" x="1040" y="710">${s.s3.body}</text>
  <text id="txt_s3_sub" class="ap body" style="animation-delay:23.6s" x="1040" y="755">${ml(s.s3.sub, 1040, 42)}</text>
  <circle class="t60 click" cx="1436" cy="30" r="26" fill="none" stroke="#fff" stroke-width="3"/>
  <path class="t60 cursor" d="M0 0L0 34L9 25L16 40L22 37L15 23L27 23Z" fill="#fff" stroke="#000" stroke-width="2"/>
</g>

<!-- ========================================== -->
<!-- S4 · CÓMO FUNCIONA (32–44s)                -->
<!-- ========================================== -->
<g id="S4" class="t60">
  <text id="txt_s4_kicker" class="ap kicker" style="animation-delay:33s" x="1040" y="260">${s.s4.kicker}</text>
  <text id="txt_s4_h2Line1" class="ap h2" style="animation-delay:33.5s" x="1040" y="330">${s.s4.h2Line1}</text>
  <text id="txt_s4_h2Line2" class="ap h2 okTxt" style="animation-delay:34s" x="1040" y="395">${s.s4.h2Line2}</text>
  <g font-size="24">
    <g class="apL" style="animation-delay:35s"><circle cx="1060" cy="460" r="20" fill="url(#brand)"/><text x="1060" y="468" text-anchor="middle" font-size="18" style="font-weight:800">1</text><text id="txt_s4_step1" x="1096" y="468">${s.s4.step1}</text></g>
    <g class="apL" style="animation-delay:36s"><circle cx="1060" cy="525" r="20" fill="var(--ok)"/><text x="1060" y="533" text-anchor="middle" font-size="18" style="font-weight:800">✓</text><text id="txt_s4_step2" x="1096" y="533" class="okTxt">${s.s4.step2}</text></g>
    <g class="apL" style="animation-delay:37s"><circle cx="1060" cy="590" r="20" fill="url(#brand)"/><text x="1060" y="598" text-anchor="middle" font-size="18" style="font-weight:800">2</text><text id="txt_s4_step3" x="1096" y="598">${s.s4.step3}</text></g>
    <g class="apL" style="animation-delay:38s"><circle cx="1060" cy="655" r="20" fill="var(--accent2)"/><text x="1060" y="663" text-anchor="middle" font-size="18" style="font-weight:800">⚡</text><text id="txt_s4_step4" x="1096" y="663" class="muted">${s.s4.step4}</text></g>
  </g>
</g>

<!-- ========================================== -->
<!-- S5 · EL IMPACTO: 3 TARJETAS REALES (44–52s)-->
<!-- ========================================== -->
<g id="S5" class="t60">
  <text id="txt_s5_kicker" class="ap kicker" style="animation-delay:44.8s" x="960" y="180" text-anchor="middle">${s.s5.kicker}</text>
  <text id="txt_s5_title" class="ap h2" style="animation-delay:45.4s;font-size:48px" x="960" y="245" text-anchor="middle">${s.s5.title}</text>
  
  <g transform="translate(160, 310)">
    <!-- Card 1: Batería -->
    <g class="ap" style="animation-delay:46s">
      <rect x="0" y="0" width="500" height="340" rx="24" fill="var(--card)" stroke="var(--line)" filter="url(#shadow)"/>
      <circle cx="80" cy="80" r="40" fill="var(--ok)" fill-opacity=".18"/>
      <text id="txt_s5_card1Emoji" x="80" y="94" text-anchor="middle" font-size="42">${s.s5.card1Emoji}</text>
      <text id="txt_s5_card1Title" x="40" y="180" font-size="32" style="font-weight:800" class="okTxt">${s.s5.card1Title}</text>
      <text id="txt_s5_card1Desc" x="40" y="232" class="body" font-size="25">${ml(s.s5.card1Desc, 40, 36)}</text>
    </g>

    <!-- Card 2: No se calienta (position on outer g; animation on inner g) -->
    <g transform="translate(550, 0)"><g class="ap" style="animation-delay:46.8s">
      <rect x="0" y="0" width="500" height="340" rx="24" fill="var(--card)" stroke="var(--line)" filter="url(#shadow)"/>
      <circle cx="80" cy="80" r="40" fill="var(--warn)" fill-opacity=".18"/>
      <text id="txt_s5_card2Emoji" x="80" y="94" text-anchor="middle" font-size="42">${s.s5.card2Emoji}</text>
      <text id="txt_s5_card2Title" x="40" y="180" font-size="32" style="font-weight:800">${s.s5.card2Title}</text>
      <text id="txt_s5_card2Desc" x="40" y="232" class="body" font-size="25">${ml(s.s5.card2Desc, 40, 36)}</text>
    </g></g>

    <!-- Card 3: Conexión segura -->
    <g transform="translate(1100, 0)"><g class="ap" style="animation-delay:47.6s">
      <rect x="0" y="0" width="500" height="340" rx="24" fill="var(--card)" stroke="var(--line)" filter="url(#shadow)"/>
      <circle cx="80" cy="80" r="40" fill="var(--accent2)" fill-opacity=".18"/>
      <text id="txt_s5_card3Emoji" x="80" y="94" text-anchor="middle" font-size="42">${s.s5.card3Emoji}</text>
      <text id="txt_s5_card3Title" x="40" y="180" font-size="32" style="font-weight:800" fill="var(--accent2)">${s.s5.card3Title}</text>
      <text id="txt_s5_card3Desc" x="40" y="232" class="body" font-size="25">${ml(s.s5.card3Desc, 40, 36)}</text>
    </g></g>
  </g>
</g>

<!-- ========================================== -->
<!-- S6 · OUTRO: DOBLE CLIC E INSTALACIÓN (52–60s)-->
<!-- ========================================== -->
<g id="S6" class="t60">
  <g class="apS" style="animation-delay:52.5s">
    <circle cx="960" cy="300" r="140" fill="url(#glowA)" filter="url(#blur20)"/>
    <use href="#logo" x="870" y="210" width="180" height="180" filter="url(#shadow)"/>
  </g>

  <text id="txt_s6_title" class="ap" style="animation-delay:53.2s;font-size:90px;font-weight:800;letter-spacing:-2px" x="960" y="470" text-anchor="middle">${s.s6.title}</text>
  <text id="txt_s6_tagline" class="ap body" style="animation-delay:53.8s;font-size:32px;fill:#fff" x="960" y="525" text-anchor="middle">${s.s6.tagline}</text>
  
  <!-- Double Click Install Pill -->
  <g class="ap" style="animation-delay:54.6s">
    <rect x="560" y="570" width="800" height="120" rx="24" fill="#131728" stroke="var(--accent)" stroke-width="2.5" filter="url(#shadow)"/>
    <text x="960" y="620" text-anchor="middle" font-size="32" style="font-weight:800" fill="#fff" id="txt_s6_installStep">${s.s6.installStep}</text>
    <text x="960" y="664" text-anchor="middle" font-size="25" class="muted" id="txt_s6_installSub">${s.s6.installSub}</text>
  </g>

  <!-- Interactive Double Click Visual Pulse -->
  <circle class="t60 clickPulse" cx="960" cy="360" r="40" fill="none" stroke="var(--accent2)" stroke-width="6"/>
  <path class="t60 curDbl" d="M0 0L0 40L11 29L19 46L26 43L18 27L32 27Z" fill="#fff" stroke="#000" stroke-width="2.5"/>

  <text id="txt_s6_tech" class="ap body" style="animation-delay:55.6s;font-size:24px" x="960" y="750" text-anchor="middle">${s.s6.tech}</text>
</g>

<!-- 60s Progress Bar -->
<rect class="progress" x="0" y="1074" width="1920" height="6" fill="url(#brand)"/>
</svg>`;
}

function compile() {
  const jsonPath = path.resolve(__dirname, 'content.json');
  const svgPath = path.resolve(__dirname, 'lidwifi_motion.svg');
  const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const svg = generateSvg(content);
  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log('✅ Generated lidwifi_motion.svg from content.json');
}

if (require.main === module) {
  compile();
}

module.exports = { generateSvg, compile };
