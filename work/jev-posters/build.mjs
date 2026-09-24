import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const qr = require('/Users/ailln/Workspace/my/github/panda-trading-platform/web/node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode');
const root = resolve(import.meta.dirname, '../..');
const output = resolve(root, 'outputs/jev-posters');
const data = JSON.parse(readFileSync(resolve(import.meta.dirname, 'content.json'), 'utf8'));
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
writeFileSync(resolve(output, 'signup-qr.svg'), await qr.toString(data.url, {type:'svg',errorCorrectionLevel:'M',margin:2,color:{dark:'#14191b',light:'#ffffff'}}));
copyFileSync(resolve(import.meta.dirname, 'posters.css'), resolve(output, 'posters.css'));
const variants=[
 {cls:'prism',name:'决策之核',art:'art-01-typesafe.png'},
 {cls:'windows',name:'云端窗口',art:'art-02-windows.png'},
 {cls:'ribbons',name:'分岔绸带',art:'art-03-ribbons.png'},
 {cls:'eye',name:'孔版之眼',art:'art-04-eye.png'}
];
const poster=(v,i)=>`<article class="poster ${v.cls}" aria-label="${esc(v.name)}报名海报"><img class="art" src="${v.art}" alt=""><div class="wash"></div><div class="poster-content"><header class="masthead"><span class="brand">云谷<strong>404</strong></span><span>第二期 · JEV 黑客松</span></header><div class="hero"><p class="eyebrow">HACKATHON 002 / SYSTEM ONE</p><h2><span>${esc(data.theme[0])}</span><span>${esc(data.theme[1])}</span></h2><p class="one-line">把判断做成产品。</p></div><div class="essentials"><p><b>创作方向</b>${esc(data.directions)}</p><p><b>欢迎参加</b>${esc(data.audience)}</p></div><div class="apply"><div class="apply-copy"><span class="apply-label">● ${esc(data.status)}</span><strong>扫码提交想法 <i>↗</i></strong><span class="url">cv404.tv/events/jev</span></div><div class="qr"><img src="signup-qr.svg" alt="报名页二维码"></div></div><footer class="foot"><span>${esc(data.pending)}</span><small>${esc(data.notice)}</small></footer></div></article>`;
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>云谷404 Jev 黑客松 · 艺术报名海报</title><link rel="stylesheet" href="posters.css"></head><body><header class="preview-header"><div><h1>云谷404 Jev 黑客松 · 艺术报名海报</h1><p>四张独立海报 · 每张包含报名入口 · 2160 × 2880 PNG</p></div><a href="jev-registration-posters.zip" download>下载四张 PNG ↓</a></header><nav class="preview-nav">${variants.map((v,i)=>`<a href="#poster-${i+1}">${i+1} · ${v.name}</a>`).join('')}</nav><main class="gallery">${variants.map((v,i)=>`<section class="preview-item" id="poster-${i+1}"><div class="poster-frame">${poster(v,i)}</div><div class="preview-actions"><span>${i+1} · ${v.name}</span><a href="poster-0${i+1}.png" download>下载 PNG ↓</a></div></section>`).join('')}</main><script>function fit(){for(const frame of document.querySelectorAll('.poster-frame')){const scale=frame.clientWidth/1080;frame.querySelector('.poster').style.transform='scale('+scale+')';frame.style.height=1440*scale+'px'}}new ResizeObserver(fit).observe(document.querySelector('.gallery'));fit();</script></body></html>`;
writeFileSync(resolve(output,'index.html'),html);
