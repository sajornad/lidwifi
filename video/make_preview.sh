#!/bin/zsh
# Generates preview.html (SVG inlined + timeline scrubber). Re-run after editing the SVG.
# Open with: open preview.html   (add ?t=30 to jump to second 30)
cd "$(dirname "$0")"
{
cat <<'HEAD'
<!doctype html><html lang="es"><head><meta charset="utf-8"><title>LidWiFi · preview</title>
<style>
 body{margin:0;background:#05060c;color:#ccd;font:14px -apple-system,system-ui;display:flex;flex-direction:column;height:100vh}
 #stage{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
 #stage svg{width:100%;height:100%;max-height:calc(100vh - 56px)}
 #bar{display:flex;gap:12px;align-items:center;padding:12px 18px;background:#11131d}
 #bar input{flex:1;accent-color:#8b6cff} button{background:#8b6cff;color:#fff;border:0;border-radius:8px;padding:6px 14px;cursor:pointer}
 #t{font-variant-numeric:tabular-nums;width:56px}
</style></head><body><div id="stage">
HEAD
sed '1d' lidwifi_motion.svg
cat <<'TAIL'
</div><div id="bar"><button id="play">⏸</button><input id="scrub" type="range" min="0" max="60" step="0.1" value="0"><span id="t">0.0s</span></div>
<script>
 const svg=document.querySelector('#stage svg'), scrub=document.getElementById('scrub'), tEl=document.getElementById('t'), btn=document.getElementById('play');
 const anims=()=>svg.getAnimations({subtree:true});
 let playing=true, t0=performance.now();
 function seek(s){anims().forEach(a=>{a.currentTime=s*1000});}
 function setPlaying(p){playing=p;btn.textContent=p?'⏸':'▶';anims().forEach(a=>p?a.play():a.pause());}
 btn.onclick=()=>setPlaying(!playing);
 scrub.oninput=()=>{setPlaying(false);seek(+scrub.value);tEl.textContent=(+scrub.value).toFixed(1)+'s';};
 (function tick(){ if(playing){const a=anims().find(x=>x.effect&&x.effect.getComputedTiming().duration===60000); if(a){const s=(a.currentTime/1000)%60; scrub.value=s; tEl.textContent=s.toFixed(1)+'s';}} requestAnimationFrame(tick);})();
 const q=new URLSearchParams(location.search).get('t'); if(q!==null){setPlaying(false);seek(+q);scrub.value=q;tEl.textContent=(+q).toFixed(1)+'s';}
</script></body></html>
TAIL
} > preview.html
echo "preview.html updated"
