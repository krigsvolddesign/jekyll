import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {chromium,firefox,webkit} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const engineName=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[engineName];
assert.ok(engine,'Unknown browser');
const root=resolve('.'),temporary=mkdtempSync(join(tmpdir(),'krigsvold-hero-'));
const evidence=process.env.HERO_EVIDENCE_DIR;
if(evidence)mkdirSync(evidence,{recursive:true});
const report={family:'krigsvold',engine:engineName,cases:[],axe:[],limitations:['Automated checks and screenshots do not certify visual fidelity or manual assistive technology.','Image-backed contrast uses a conservative white-image bound under the measured scrim; axe incomplete findings remain incomplete.']};
let browser,server;
const watchdog=setTimeout(()=>{console.error('Hero verification overall deadline exceeded');process.exit(1)},240000);
const bounded=async(label,fn,ms=15000)=>{console.log('START '+label);let timer;try{return await Promise.race([fn(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' timed out')),ms))])}finally{clearTimeout(timer)}};
const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
const ratio=rgb=>1.05/(rgb.reduce((s,v,i)=>s+linear(v/255)*[.2126,.7152,.0722][i],0)+.05);
function scrimAlpha(x,narrow){if(narrow)return .97+(.8-.97)*x;const stops=[[0,.94],[.52,.82],[.84,.64],[1,.42]];for(let i=1;i<stops.length;i++)if(x<=stops[i][0])return stops[i-1][1]+(stops[i][1]-stops[i-1][1])*(x-stops[i-1][0])/(stops[i][0]-stops[i-1][0]);return .42}
try{
 const overlayDeclarations=[...readFileSync('assets/css/krigsvold.css','utf8').matchAll(/background:linear-gradient\([^;]+;/g)].map(m=>m[0]);
 assert.deepEqual(overlayDeclarations,[
  'background:linear-gradient(90deg, rgb(6 19 37 / .94) 0%, rgb(10 29 53 / .82) 52%, rgb(10 29 53 / .64) 84%, rgb(10 29 53 / .42) 100%);',
  'background:linear-gradient(90deg, rgb(6 19 37 / .97), rgb(10 29 53 / .8));'
 ],'Existing Krigsvold overlay must remain byte-for-byte unchanged');
 const manifest=JSON.parse(readFileSync('assets/images/hero/provenance.json'));
 for(const f of manifest.files){const bytes=readFileSync(f.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);assert.equal(bytes.length,f.bytes);assert.ok(bytes.length <= (f.role==='archival-master'?3000000:250000),'Supplied image budget')}
 assert.equal(manifest.approvedMasterSha256,'11ab8f82242fc0d51232c9e7f1603f30d69a9234024b09effc3f579176bb81ef');
 assert.equal(manifest.files.find(f=>f.path.endsWith('krigsvold-hero-2172.webp')).sha256,'e967893b399f8e13041b011a71cb55440b44340e140050e0408d6f7b0ad158e5');
 for(const base of ['', '/preview']){const r=spawnSync('python3',['nightjar/build.py','--destination',join(temporary,base||'.'),'--baseurl',base],{stdio:'inherit',timeout:120000});assert.equal(r.status,0,'Locked Jekyll build')}
 server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1','--directory',temporary],{stdio:['ignore','pipe','pipe']});
 const port=await bounded('local server',()=>new Promise((res,rej)=>{for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m)res(m[1])});server.on('exit',code=>rej(Error('Server exited '+code)))}),10000);
 browser=await engine.launch(engineName==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
 for(const base of ['', '/preview'])for(const js of [false,true])for(const mode of ['light','dark'])for(const width of [320,375,640,768,1024,1440,1920]){
  const c=await browser.newContext({javaScriptEnabled:js,viewport:{width,height:1000},reducedMotion:'reduce'});c.setDefaultTimeout(10000);c.setDefaultNavigationTimeout(15000);
  const p=await c.newPage(),failures=[],requests=[];p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>failures.push(e.message));p.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url())});
  try{
   await bounded(`${base||'/'} ${mode} JS=${js} ${width}`,()=>p.goto(`http://127.0.0.1:${port}${base}/`,{waitUntil:'load'}));
   await p.evaluate(mode=>document.documentElement.dataset.appearance=mode,mode);
   if(js)await bounded('fonts',()=>p.evaluate(()=>document.fonts.ready.then(()=>true)));
   const result=await p.evaluate(()=>{const mast=document.querySelector('.page-masthead'),img=mast.querySelector('picture img'),style=getComputedStyle(img),veil=getComputedStyle(mast.querySelector('.page-masthead__veil'));const rectangle=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height}};return {imageBox:rectangle(img),pictureBox:rectangle(img.closest('picture')),headingBox:rectangle(mast.querySelector('h1')),navbarBox:rectangle(document.querySelector('.nav-shell')),mastBackground:getComputedStyle(mast).backgroundColor,loaded:img.complete&&img.naturalWidth>0,currentSrc:img.currentSrc,alt:img.alt,hidden:img.closest('picture').getAttribute('aria-hidden'),priority:img.fetchPriority,lazy:img.loading,fit:style.objectFit,position:style.objectPosition,overflow:document.documentElement.scrollWidth>innerWidth,veil:veil.backgroundImage,text:[...mast.querySelectorAll('h1,p')].map(n=>({tag:n.tagName,color:getComputedStyle(n).color,font:getComputedStyle(n).fontFamily,right:n.getBoundingClientRect().right/innerWidth}))}});
   assert.equal(result.loaded,true);assert.equal(result.alt,'');assert.equal(result.hidden,'true');assert.equal(result.priority,'high');assert.notEqual(result.lazy,'lazy');assert.equal(result.fit,'contain');assert.equal(result.overflow,false);assert.match(result.currentSrc,new RegExp(base+'/assets/images/hero/krigsvold-hero-(?:640|960|1440|1920|2172)\\.webp$'));assert.equal(result.position,'50% 50%');assert.notEqual(result.veil,'none');assert.ok(!requests.some(u=>u.endsWith('krigsvold-hero-master.png')),'Archival PNG must not be downloaded by the page');
   if(width<992){assert.ok(Math.abs(result.imageBox.width/result.imageBox.height-3)<.02,'Full3:1 image band');assert.ok(result.pictureBox.bottom<=result.headingBox.top,'Mobile text is below the complete image');assert.ok(result.navbarBox.bottom<=result.pictureBox.top+1,'Mobile navigation does not occlude the panorama');}
   for(const text of result.text){assert.equal(text.color,'rgb(255, 255, 255)');const alpha=scrimAlpha(Math.min(1,text.right),width<992),contrast=width<992?ratio([10,29,53]):ratio([10,29,53].map(v=>v*alpha+255*(1-alpha)));
    if(width<992)assert.equal(result.mastBackground,'rgb(10, 29, 53)','Mobile text stays on the existing navy field');assert.ok(contrast>=4.5,'Conservative scrim contrast '+contrast);text.minimumContrast=contrast}
   assert.match(result.text.find(t=>t.tag==='H1').font,/Roboto Slab/);assert.deepEqual(failures,[]);
   if(js&&width===1440){const axe=await bounded('hero axe',()=>new AxeBuilder({page:p}).analyze(),30000);assert.deepEqual(axe.violations.map(v=>v.id),[]);report.axe.push({base,mode,violations:[],incomplete:axe.incomplete.map(v=>v.id)})}
   if(evidence&&js)await p.screenshot({path:join(evidence,`${engineName}-${base?'preview':'root'}-${mode}-${width}.png`),fullPage:false});
   report.cases.push({base:base||'/',js,mode,width,...result});
  }finally{await c.close()}
 }
 const c=await browser.newContext(),p=await c.newPage();
 try{
  await p.goto(`http://127.0.0.1:${port}/setup/`);assert.equal(await p.locator('.page-masthead__art').count(),0,'Hero must remain opt-in on compact pages');
  await p.goto(`http://127.0.0.1:${port}/`);await p.emulateMedia({forcedColors:'active'});assert.equal(await p.locator('.page-masthead__art').evaluate(n=>getComputedStyle(n).display),'none');
  await p.emulateMedia({forcedColors:'none',media:'print'});assert.equal(await p.locator('.page-masthead__art').evaluate(n=>getComputedStyle(n).display),'none');assert.equal(await p.locator('h1').evaluate(n=>getComputedStyle(n).color),'rgb(0, 0, 0)');
  await p.emulateMedia({media:'screen'});await p.evaluate(()=>document.querySelector('.page-masthead__art').remove());assert.match(await p.locator('.page-masthead').evaluate(n=>getComputedStyle(n).backgroundColor),/rgb\(10, 29, 53\)/);
 }finally{await c.close()}
 report.forcedColorNavigation=[];
 for(const base of ['', '/preview'])for(const mode of ['light','dark']){
  const c=await browser.newContext({viewport:{width:320,height:1000},forcedColors:'active',reducedMotion:'reduce'});c.setDefaultTimeout(10000);c.setDefaultNavigationTimeout(15000);
  const p=await c.newPage();
  try{
   await bounded(`forced-color navigation ${base||'/'} ${mode}`,()=>p.goto(`http://127.0.0.1:${port}${base}/`,{waitUntil:'load'}));
   await p.evaluate(mode=>document.documentElement.dataset.appearance=mode,mode);
   const menu=p.getByRole('button',{name:'Menu',exact:true});
   assert.equal(await menu.isVisible(),true,'Forced-color menu button remains visible');
   const cue=()=>menu.evaluate(n=>{const style=getComputedStyle(n,'::after'),rect=n.getBoundingClientRect();return {text:style.content,display:style.display,color:style.color,width:rect.width,height:rect.height,iconDisplay:getComputedStyle(n.querySelector('.navbar-toggler-icon')).display}});
   const closed=await cue();assert.equal(closed.text,'"Menu"','A visible Menu cue replaces the background-only icon');assert.notEqual(closed.display,'none');assert.notEqual(closed.color,'rgba(0, 0, 0, 0)');assert.ok(closed.width>=44&&closed.height>=44);assert.equal(closed.iconDisplay,'none');
   await menu.focus();await p.keyboard.press('Enter');assert.equal(await menu.getAttribute('aria-expanded'),'true');assert.equal(await p.locator('#site-nav').isVisible(),true);const opened=await cue();assert.equal(opened.text,'"Close"','Expanded state exposes a visible Close cue');
   if(evidence)await p.screenshot({path:join(evidence,`${engineName}-${base?'preview':'root'}-${mode}-forced-menu.png`),fullPage:false});
   await p.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.equal(await menu.evaluate(n=>document.activeElement===n),true,'Escape restores menu focus');assert.equal((await cue()).text,'"Menu"');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Forced-color navigation does not overflow');
   report.forcedColorNavigation.push({base:base||'/',mode,closed,opened,keyboardOpenAndEscapeRestore:true});
  }finally{await c.close()}
 }
 report.status='passed';if(evidence)writeFileSync(join(evidence,engineName+'-hero.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'passed',engine:engineName,cases:report.cases.length,axeScans:report.axe.length}));
}finally{
 clearTimeout(watchdog);if(browser)await bounded('browser cleanup',()=>browser.close(),10000);if(server)server.kill();rmSync(temporary,{recursive:true,force:true});
}
