const fs = require('fs');
const path = require('path');
const { generateSvg } = require('./render_svg');

const contentJson = fs.readFileSync(path.join(__dirname, 'content.json'), 'utf8');
const content = JSON.parse(contentJson);
const svgString = generateSvg(content);

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LidWiFi · Motion Graphics Studio</title>
  <style>
    :root {
      --bg: #090b14;
      --panel-bg: rgba(18, 21, 35, 0.94);
      --border: rgba(255, 255, 255, 0.12);
      --accent: #8b6cff;
      --accent-hover: #9d82ff;
      --accent2: #22d3ee;
      --ok: #34d399;
      --warn: #fb7185;
      --text: #f3f5fc;
      --muted: #959eb8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    #workspace {
      display: flex;
      flex: 1;
      height: calc(100vh - 64px);
      position: relative;
      overflow: hidden;
    }
    #stage-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow: hidden;
      background: radial-gradient(circle at center, #131728 0%, #070912 100%);
    }
    #stage-container svg {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      aspect-ratio: 16 / 9;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    #studio-drawer {
      width: 450px;
      background: var(--panel-bg);
      backdrop-filter: blur(20px);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, width 0.25s ease;
      z-index: 100;
    }
    #studio-drawer.collapsed {
      width: 0;
      transform: translateX(100%);
      border-left: none;
    }
    .drawer-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .drawer-title {
      font-weight: 700;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .server-badge {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      background: rgba(255,255,255,0.08);
      color: var(--muted);
      font-weight: 500;
    }
    .server-badge.online {
      background: rgba(52, 211, 153, 0.15);
      color: var(--ok);
    }
    
    .tabs-nav {
      display: flex;
      border-bottom: 1px solid var(--border);
      background: rgba(0,0,0,0.2);
    }
    .tab-btn {
      flex: 1;
      padding: 10px 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
      background: none;
      border: none;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
    }
    .tab-btn.active {
      color: var(--text);
      border-bottom-color: var(--accent);
      background: rgba(139, 108, 255, 0.08);
    }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }

    .scene-group {
      margin-bottom: 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.02);
      overflow: hidden;
    }
    .scene-header {
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.04);
      font-weight: 700;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }
    .scene-header:hover { background: rgba(255,255,255,0.08); }
    .scene-time-pill {
      font-size: 11px;
      color: var(--accent2);
      font-family: monospace;
      padding: 2px 6px;
      background: rgba(34, 211, 238, 0.12);
      border-radius: 4px;
    }
    .scene-body {
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .field-group label {
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field-group input, .field-group textarea {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      color: #fff;
      font-family: inherit;
      font-size: 13px;
      transition: border-color 0.15s;
    }
    .field-group input:focus, .field-group textarea:focus {
      outline: none;
      border-color: var(--accent);
      background: rgba(0,0,0,0.5);
    }
    
    .color-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .color-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .color-item input[type="color"] {
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: none;
      cursor: pointer;
    }
    .color-info { display: flex; flex-direction: column; }
    .color-label { font-size: 12px; font-weight: 600; }
    .color-hex { font-size: 11px; color: var(--muted); font-family: monospace; }

    #json-raw-editor {
      width: 100%;
      height: 480px;
      background: #0d101d;
      color: #a5b4fc;
      font-family: 'SF Mono', Menlo, monospace;
      font-size: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      resize: vertical;
    }

    .drawer-footer {
      padding: 14px 18px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: rgba(0,0,0,0.25);
    }
    .btn-row { display: flex; gap: 8px; }
    .btn {
      flex: 1;
      padding: 9px 14px;
      border-radius: 8px;
      border: none;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-secondary { background: rgba(255,255,255,0.08); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { background: rgba(255,255,255,0.14); }
    .btn-success { background: var(--ok); color: #071912; }
    .btn-success:hover { opacity: 0.9; }

    #timeline-bar {
      height: 64px;
      background: #0e111d;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 16px;
      z-index: 10;
    }
    .tl-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--accent);
      border: none;
      color: #fff;
      font-size: 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.1s, background 0.15s;
    }
    .tl-btn:hover { background: var(--accent-hover); transform: scale(1.05); }
    #scrub {
      flex: 1;
      accent-color: var(--accent);
      cursor: pointer;
      height: 6px;
    }
    #time-display {
      font-family: 'SF Mono', Menlo, monospace;
      font-size: 13px;
      min-width: 90px;
      font-variant-numeric: tabular-nums;
      color: var(--muted);
    }
    #time-display strong { color: var(--text); }
    
    .scene-pills {
      display: flex;
      gap: 6px;
      overflow-x: auto;
    }
    .scene-pill {
      background: rgba(255,255,255,0.06);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      padding: 5px 9px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .scene-pill:hover, .scene-pill.active {
      background: rgba(139, 108, 255, 0.2);
      border-color: var(--accent);
      color: #fff;
    }
    
    #toggle-drawer-btn {
      background: rgba(255,255,255,0.08);
      border: 1px solid var(--border);
      color: #fff;
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #toggle-drawer-btn:hover { background: rgba(255,255,255,0.15); }

    #toast {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      background: #1e2438;
      border: 1px solid var(--border);
      color: #fff;
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      transition: transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #toast.show { transform: translateX(-50%) translateY(0); }
  </style>
</head>
<body>

  <div id="toast"><span>💾</span> Guardado con éxito</div>

  <div id="workspace">
    <div id="stage-container">
      <div id="stage" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
        ${svgString}
      </div>
    </div>

    <!-- Side Studio Drawer -->
    <div id="studio-drawer">
      <div class="drawer-header">
        <div class="drawer-title">
          <span>🔋</span> Studio LidWiFi (Batería)
          <span id="server-badge" class="server-badge">Detectando...</span>
        </div>
        <button id="close-drawer" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;">✕</button>
      </div>

      <div class="tabs-nav">
        <button class="tab-btn active" data-tab="tab-texts">📝 Textos</button>
        <button class="tab-btn" data-tab="tab-theme">🎨 Colores</button>
        <button class="tab-btn" data-tab="tab-json">⚙️ JSON</button>
      </div>

      <div class="drawer-content">
        <!-- Tab 1: Texts -->
        <div id="tab-texts" class="tab-pane active">
          <!-- S1 -->
          <div class="scene-group" data-scene="s1" data-time="3">
            <div class="scene-header"><span>Escena 1 · El Dolor (Drenaje)</span><span class="scene-time-pill">0s – 10s</span></div>
            <div class="scene-body">
              <div class="field-group"><label>Kicker</label><input type="text" data-field="s1.kicker"></div>
              <div class="field-group"><label>Pregunta Línea 1</label><input type="text" data-field="s1.h1Line1"></div>
              <div class="field-group"><label>Pregunta Línea 2 (Rojo)</label><input type="text" data-field="s1.h1Line2"></div>
              <div class="field-group"><label>Subtítulo 1</label><textarea rows="2" data-field="s1.sub1" style="width:100%;background:#191d2d;border:1px solid var(--border);border-radius:6px;color:#fff;padding:8px;font-family:inherit;font-size:13px;resize:vertical;"></textarea></div>
            </div>
          </div>

          <!-- S2 -->
          <div class="scene-group" data-scene="s2" data-time="14">
            <div class="scene-header"><span>Escena 2 · La Causa (Wi-Fi)</span><span class="scene-time-pill">10s – 20s</span></div>
            <div class="scene-body">
              <div class="field-group"><label>Kicker</label><input type="text" data-field="s2.kicker"></div>
              <div class="field-group"><label>Título</label><input type="text" data-field="s2.h1Line1"></div>
              <div class="field-group"><label>Línea Clave (Rojo)</label><textarea rows="2" data-field="s2.h1Line2" style="width:100%;background:#191d2d;border:1px solid var(--border);border-radius:6px;color:#fff;padding:8px;font-family:inherit;font-size:13px;resize:vertical;"></textarea></div>
              <div class="field-group"><label>Explicación</label><textarea rows="2" data-field="s2.body1" style="width:100%;background:#191d2d;border:1px solid var(--border);border-radius:6px;color:#fff;padding:8px;font-family:inherit;font-size:13px;resize:vertical;"></textarea></div>
            </div>
          </div>

          <!-- S3 -->
          <div class="scene-group" data-scene="s3" data-time="24">
            <div class="scene-header"><span>Escena 3 · La Solución</span><span class="scene-time-pill">20s – 32s</span></div>
            <div class="scene-body">
              <div class="field-group"><label>Kicker</label><input type="text" data-field="s3.kicker"></div>
              <div class="field-group"><label>Nombre App</label><input type="text" data-field="s3.h2"></div>
              <div class="field-group"><label>Propuesta Valor</label><input type="text" data-field="s3.body"></div>
              <div class="field-group"><label>Bajada</label><textarea rows="2" data-field="s3.sub" style="width:100%;background:#191d2d;border:1px solid var(--border);border-radius:6px;color:#fff;padding:8px;font-family:inherit;font-size:13px;resize:vertical;"></textarea></div>
            </div>
          </div>

          <!-- S4 -->
          <div class="scene-group" data-scene="s4" data-time="36">
            <div class="scene-header"><span>Escena 4 · Cómo Funciona</span><span class="scene-time-pill">32s – 44s</span></div>
            <div class="scene-body">
              <div class="field-group"><label>Kicker</label><input type="text" data-field="s4.kicker"></div>
              <div class="field-group"><label>Título Línea 1</label><input type="text" data-field="s4.h2Line1"></div>
              <div class="field-group"><label>Título Línea 2 (Verde)</label><input type="text" data-field="s4.h2Line2"></div>
              <div class="field-group"><label>Paso 1 (Cierre)</label><input type="text" data-field="s4.step1"></div>
              <div class="field-group"><label>Paso 2 (Ahorro)</label><input type="text" data-field="s4.step2"></div>
              <div class="field-group"><label>Paso 3 (Apertura)</label><input type="text" data-field="s4.step3"></div>
              <div class="field-group"><label>Paso 4 (Sin esfuerzo)</label><input type="text" data-field="s4.step4"></div>
              <div class="field-group"><label>Badge Apagado</label><input type="text" data-field="s4.badgeOff"></div>
              <div class="field-group"><label>Badge Encendido</label><input type="text" data-field="s4.badgeOn"></div>
            </div>
          </div>

          <!-- S5 -->
          <div class="scene-group" data-scene="s5" data-time="48">
            <div class="scene-header"><span>Escena 5 · 3 Beneficios Reales</span><span class="scene-time-pill">44s – 52s</span></div>
            <div class="scene-body">
              <div class="field-group"><label>Kicker</label><input type="text" data-field="s5.kicker"></div>
              <div class="field-group"><label>Título Principal</label><input type="text" data-field="s5.title"></div>
              
              <div class="field-group"><label>Tarjeta 1 Título (Batería)</label><input type="text" data-field="s5.card1Title"></div>
              <div class="field-group"><label>Tarjeta 1 Detalle</label><textarea rows="2" data-field="s5.card1Desc" style="width:100%;background:#191d2d;border:1px solid var(--border);border-radius:6px;color:#fff;padding:8px;font-family:inherit;font-size:13px;resize:vertical;"></textarea></div>

              <div class="field-group"><label>Tarjeta 2 Título (Temperatura)</label><input type="text" data-field="s5.card2Title"></div>
              <div class="field-group"><label>Tarjeta 2 Detalle</label><textarea rows="2" data-field="s5.card2Desc" style="width:100%;background:#191d2d;border:1px solid var(--border);border-radius:6px;color:#fff;padding:8px;font-family:inherit;font-size:13px;resize:vertical;"></textarea></div>

              <div class="field-group"><label>Tarjeta 3 Título (Conexión)</label><input type="text" data-field="s5.card3Title"></div>
              <div class="field-group"><label>Tarjeta 3 Detalle</label><textarea rows="2" data-field="s5.card3Desc" style="width:100%;background:#191d2d;border:1px solid var(--border);border-radius:6px;color:#fff;padding:8px;font-family:inherit;font-size:13px;resize:vertical;"></textarea></div>
            </div>
          </div>

          <!-- S6 -->
          <div class="scene-group" data-scene="s6" data-time="56">
            <div class="scene-header"><span>Escena 6 · Outro e Instalación</span><span class="scene-time-pill">52s – 60s</span></div>
            <div class="scene-body">
              <div class="field-group"><label>Título App</label><input type="text" data-field="s6.title"></div>
              <div class="field-group"><label>Lema</label><input type="text" data-field="s6.tagline"></div>
              <div class="field-group"><label>Mensaje Instalación Doble Clic</label><input type="text" data-field="s6.installStep"></div>
              <div class="field-group"><label>Badges Tecnologías</label><input type="text" data-field="s6.tech"></div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Theme -->
        <div id="tab-theme" class="tab-pane">
          <div class="color-grid">
            <div class="color-item">
              <input type="color" data-theme="accent">
              <div class="color-info"><span class="color-label">Acento 1</span><span class="color-hex" id="hex-accent">#8b6cff</span></div>
            </div>
            <div class="color-item">
              <input type="color" data-theme="accent2">
              <div class="color-info"><span class="color-label">Acento 2</span><span class="color-hex" id="hex-accent2">#22d3ee</span></div>
            </div>
            <div class="color-item">
              <input type="color" data-theme="bg1">
              <div class="color-info"><span class="color-label">Fondo 1</span><span class="color-hex" id="hex-bg1">#070912</span></div>
            </div>
            <div class="color-item">
              <input type="color" data-theme="bg2">
              <div class="color-info"><span class="color-label">Fondo 2</span><span class="color-hex" id="hex-bg2">#151036</span></div>
            </div>
            <div class="color-item">
              <input type="color" data-theme="ok">
              <div class="color-info"><span class="color-label">Éxito (Verde)</span><span class="color-hex" id="hex-ok">#34d399</span></div>
            </div>
            <div class="color-item">
              <input type="color" data-theme="warn">
              <div class="color-info"><span class="color-label">Alerta (Rojo)</span><span class="color-hex" id="hex-warn">#fb7185</span></div>
            </div>
            <div class="color-item">
              <input type="color" data-theme="text">
              <div class="color-info"><span class="color-label">Texto</span><span class="color-hex" id="hex-text">#f5f7ff</span></div>
            </div>
            <div class="color-item">
              <input type="color" data-theme="muted">
              <div class="color-info"><span class="color-label">Secundario</span><span class="color-hex" id="hex-muted">#9aa3c7</span></div>
            </div>
          </div>
        </div>

        <!-- Tab 3: Raw JSON -->
        <div id="tab-json" class="tab-pane">
          <textarea id="json-raw-editor" spellcheck="false"></textarea>
          <div style="margin-top:10px;display:flex;gap:8px;">
            <button id="btn-apply-json" class="btn btn-primary">Aplicar JSON a la vista</button>
            <button id="btn-copy-json" class="btn btn-secondary">Copiar</button>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <button id="btn-save-project" class="btn btn-primary">💾 Guardar Cambios (content.json)</button>
        <div class="btn-row">
          <button id="btn-export-mp4" class="btn btn-success">🎬 Renderizar MP4</button>
          <button id="btn-download-svg" class="btn btn-secondary">📥 Bajar SVG</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Timeline Bar -->
  <div id="timeline-bar">
    <button id="play" class="tl-btn">⏸</button>
    <input id="scrub" type="range" min="0" max="60" step="0.1" value="0">
    <div id="time-display"><strong id="t-cur">0.0s</strong> / 60.0s</div>
    
    <div class="scene-pills">
      <button class="scene-pill" data-time="0">S1 · El Dolor (0s)</button>
      <button class="scene-pill" data-time="12">S2 · La Causa (10s)</button>
      <button class="scene-pill" data-time="24">S3 · La Solución (20s)</button>
      <button class="scene-pill" data-time="36">S4 · Mecánica (32s)</button>
      <button class="scene-pill" data-time="48">S5 · Beneficios (44s)</button>
      <button class="scene-pill" data-time="56">S6 · Outro (52s)</button>
    </div>

    <button id="toggle-drawer-btn">✏️ Editar Textos</button>
  </div>

  <script id="embedded-content" type="application/json">
${contentJson}
  </script>

  <script>
    let content = JSON.parse(document.getElementById('embedded-content').textContent);
    let isServerOnline = false;
    let playing = true;
    const svg = document.querySelector('#stage svg');
    const scrub = document.getElementById('scrub');
    const tCur = document.getElementById('t-cur');
    const playBtn = document.getElementById('play');
    const drawer = document.getElementById('studio-drawer');
    const toggleDrawerBtn = document.getElementById('toggle-drawer-btn');
    const closeDrawerBtn = document.getElementById('close-drawer');
    const toast = document.getElementById('toast');
    const serverBadge = document.getElementById('server-badge');

    function showToast(msg, icon = '💾') {
      toast.innerHTML = '<span>' + icon + '</span> ' + msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    }

    async function checkServer() {
      try {
        const res = await fetch('/api/content');
        if (res.ok) {
          content = await res.json();
          isServerOnline = true;
          serverBadge.textContent = '● Servidor Conectado';
          serverBadge.className = 'server-badge online';
          applyContentToDOM(content);
        }
      } catch (e) {
        isServerOnline = false;
        serverBadge.textContent = 'Modo Local (Exportable)';
        serverBadge.className = 'server-badge';
      }
    }

    function anims() { return svg.getAnimations({ subtree: true }); }
    function seek(sec) {
      anims().forEach(a => a.currentTime = sec * 1000);
      scrub.value = sec;
      tCur.textContent = sec.toFixed(1) + 's';
    }
    function setPlaying(p) {
      playing = p;
      playBtn.textContent = p ? '⏸' : '▶';
      anims().forEach(a => p ? a.play() : a.pause());
    }

    playBtn.onclick = () => setPlaying(!playing);
    scrub.oninput = () => {
      setPlaying(false);
      seek(+scrub.value);
    };

    (function tick() {
      if (playing) {
        const a = anims().find(x => x.effect && x.effect.getComputedTiming().duration === 60000);
        if (a) {
          const s = (a.currentTime / 1000) % 60;
          scrub.value = s;
          tCur.textContent = s.toFixed(1) + 's';
        }
      }
      requestAnimationFrame(tick);
    })();

    document.querySelectorAll('.scene-pill').forEach(btn => {
      btn.onclick = () => {
        const t = +btn.dataset.time;
        setPlaying(false);
        seek(t);
      };
    });

    toggleDrawerBtn.onclick = () => drawer.classList.toggle('collapsed');
    closeDrawerBtn.onclick = () => drawer.classList.add('collapsed');

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'tab-json') {
          document.getElementById('json-raw-editor').value = JSON.stringify(content, null, 2);
        }
      };
    });

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function setSvgText(el, val) {
      if (!el) return;
      if (typeof val === 'string' && val.includes('\n')) {
        const x = el.getAttribute('x') || '920';
        const isH1 = el.classList.contains('h1') || el.classList.contains('h1-s2');
        const lh = isH1 ? 62 : 44;
        el.innerHTML = val.split('\n').map((p, i) => '<tspan x="' + x + '" dy="' + (i ? lh : 0) + '">' + escapeHtml(p) + '</tspan>').join('');
      } else {
        el.textContent = val;
      }
    }

    function populateForm() {
      document.querySelectorAll('input[data-field], textarea[data-field]').forEach(inp => {
        const path = inp.dataset.field.split('.');
        inp.value = content.scenes[path[0]][path[1]] || '';
      });
      document.querySelectorAll('input[data-theme]').forEach(inp => {
        const key = inp.dataset.theme;
        inp.value = content.theme[key] || '#ffffff';
        const hex = document.getElementById('hex-' + key);
        if (hex) hex.textContent = inp.value;
      });
    }

    document.querySelectorAll('input[data-field], textarea[data-field]').forEach(inp => {
      inp.addEventListener('input', () => {
        const path = inp.dataset.field.split('.');
        const val = inp.value;
        content.scenes[path[0]][path[1]] = val;
        
        const targetId = 'txt_' + path[0] + '_' + path[1];
        const el = svg.querySelector('#' + targetId);
        setSvgText(el, val);
      });

      inp.addEventListener('focus', () => {
        const grp = inp.closest('.scene-group');
        if (grp && grp.dataset.time) {
          setPlaying(false);
          seek(+grp.dataset.time);
        }
      });
    });

    document.querySelectorAll('input[data-theme]').forEach(inp => {
      inp.addEventListener('input', () => {
        const key = inp.dataset.theme;
        content.theme[key] = inp.value;
        const hex = document.getElementById('hex-' + key);
        if (hex) hex.textContent = inp.value;
        svg.style.setProperty('--' + key, inp.value);
      });
    });

    document.querySelectorAll('.scene-header').forEach(hdr => {
      hdr.onclick = () => {
        const grp = hdr.closest('.scene-group');
        if (grp && grp.dataset.time) {
          setPlaying(false);
          seek(+grp.dataset.time);
        }
      };
    });

    function applyContentToDOM(c) {
      content = c;
      populateForm();
      for (const [sKey, sObj] of Object.entries(content.scenes)) {
        for (const [fKey, val] of Object.entries(sObj)) {
          if (typeof val === 'string') {
            const el = svg.querySelector('#txt_' + sKey + '_' + fKey);
            setSvgText(el, val);
          }
        }
      }
      for (const [key, val] of Object.entries(content.theme)) {
        svg.style.setProperty('--' + key, val);
      }
    }

    document.getElementById('btn-apply-json').onclick = () => {
      try {
        const parsed = JSON.parse(document.getElementById('json-raw-editor').value);
        applyContentToDOM(parsed);
        showToast('JSON aplicado a la vista', '✨');
      } catch (err) {
        alert('Error en formato JSON: ' + err.message);
      }
    };
    document.getElementById('btn-copy-json').onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(content, null, 2));
      showToast('Copiado al portapapeles', '📋');
    };

    document.getElementById('btn-save-project').onclick = async () => {
      if (isServerOnline) {
        try {
          const res = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content, null, 2)
          });
          const d = await res.json();
          if (d.ok) showToast('Guardado en content.json & SVG recompilado', '💾');
          else alert('Error: ' + d.error);
        } catch (e) {
          alert('Error de conexión: ' + e.message);
        }
      } else {
        const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'content.json';
        a.click();
        showToast('Descargando content.json', '📥');
      }
    };

    document.getElementById('btn-download-svg').onclick = () => {
      const s = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([s], { type: 'image/svg+xml' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lidwifi_motion.svg';
      a.click();
      showToast('Descargando SVG actualizado', '📥');
    };

    document.getElementById('btn-export-mp4').onclick = async () => {
      if (isServerOnline) {
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(content, null, 2)
        });
        showToast('Iniciando renderizado MP4...', '🎬');
        const res = await fetch('/api/render-mp4', { method: 'POST' });
        const d = await res.json();
        if (d.ok) alert('El renderizado MP4 ha comenzado.\\nAl terminar, se guardará en video/LidWiFi_Motion_60s.mp4 y en tu carpeta ~/Downloads.');
        else alert(d.message || 'Error al iniciar renderizado');
      }
    };

    populateForm();
    checkServer();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'preview.html'), html, 'utf8');
console.log('✅ Generated preview.html with updated Battery storyline');
