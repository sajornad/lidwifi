#!/bin/zsh
# Builds icon/AppIcon.icns from icon/AppIcon.svg (uses Chrome via puppeteer-core in ../video/node_modules)
set -euo pipefail
cd "$(dirname "$0")"
VID=../video

node -e "
const p=require('$PWD/$VID/node_modules/puppeteer-core');
(async()=>{
 const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
 const g=await b.newPage(); await g.setViewport({width:1024,height:1024});
 await g.goto('file://$PWD/AppIcon.svg');
 await g.screenshot({path:'AppIcon_1024.png',omitBackground:true});
 await b.close();})();
"

rm -rf AppIcon.iconset && mkdir AppIcon.iconset
for s in 16 32 128 256 512; do
  sips -z $s $s AppIcon_1024.png --out AppIcon.iconset/icon_${s}x${s}.png >/dev/null
  d=$((s*2)); sips -z $d $d AppIcon_1024.png --out AppIcon.iconset/icon_${s}x${s}@2x.png >/dev/null
done
iconutil -c icns AppIcon.iconset -o AppIcon.icns
rm -rf AppIcon.iconset
echo "Created icon/AppIcon.icns"
