const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/Users/ailln/Workspace/work/git-vervn/franchisee-system/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const assert = require('node:assert/strict');
const out = path.resolve(__dirname, '../../outputs/jev-posters');
const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:1700},deviceScaleFactor:2,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(out,'index.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const posters=page.locator('.poster');assert.equal(await posters.count(),4);
  const files=[];
  for(let i=0;i<4;i++){
   const card=posters.nth(i);
   const report=await card.evaluate(el=>{
    const pr=el.getBoundingClientRect(), qr=el.querySelector('.qr img'), art=el.querySelector('.art');
    const overflowText=[...el.querySelectorAll('.masthead,.hero h2 span,.one-line,.essentials p,.apply-copy strong,.url,.foot span,.foot small')].filter(e=>{const r=e.getBoundingClientRect();return r.left<pr.left-1||r.right>pr.right+1||r.top<pr.top-1||r.bottom>pr.bottom+1||e.scrollWidth>e.clientWidth+2}).map(e=>({text:e.textContent.slice(0,36),width:e.clientWidth,scrollWidth:e.scrollWidth}));
    return {width:pr.width,height:pr.height,scrollHeight:el.scrollHeight,qrLoaded:qr.complete&&qr.naturalWidth>0,artLoaded:art.complete&&art.naturalWidth>0,overflowText};
   });
   assert.equal(report.width,1080);assert.equal(report.height,1440);
   if(report.scrollHeight>1441||report.overflowText.length)console.log('overflow report',i+1,report);
   assert(report.scrollHeight<=1441 && report.overflowText.length===0,`poster ${i+1} overflows canvas`);
   assert(report.qrLoaded,`poster ${i+1} QR missing`);
   assert(report.artLoaded,`poster ${i+1} art missing`);
   const name=`poster-0${i+1}.png`;
   const p=path.join(out,name);
   await card.screenshot({path:p,type:'png',animations:'disabled'});
   files.push({name,width:2160,height:2880,sha256:sha(p)});
  }
  assert.deepEqual(errors,[]);
  execFileSync('zip',['-q','-j',path.join(out,'jev-registration-posters.zip'),...files.map(f=>path.join(out,f.name))]);
  fs.writeFileSync(path.join(out,'export-manifest.json'),JSON.stringify({count:4,files,zip:{name:'jev-registration-posters.zip',sha256:sha(path.join(out,'jev-registration-posters.zip'))}},null,2)+'\n');
  console.log('PASS: four 2160×2880 PNG posters; no canvas or text overflow; art and QR images loaded; ZIP created.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
