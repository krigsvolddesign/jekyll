import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium,firefox,webkit} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const started=Date.now(),name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];assert.ok(engine);
const fixtures=JSON.parse(readFileSync('_data/examples.json')).pages,report=fixtures.find(x=>x.id==='report'),article=fixtures.find(x=>x.id==='article');
const dir=mkdtempSync(join(tmpdir(),'krigsvold-collections-')),rows=[];
let browser,server;
const watchdog=setTimeout(()=>{console.error('Collection overall deadline exceeded');process.exit(1)},210000);
const bounded=async(label,fn,ms=20000)=>{let timer;try{return await Promise.race([fn(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' timed out')),ms))])}finally{clearTimeout(timer)}};
const norm=s=>s.replace(/\s+/g,' ').trim();
const submitLabelFits=page=>page.locator('.example-search__controls button[type=submit]').evaluate(n=>{const range=document.createRange();range.selectNodeContents(n);const lines=Array.from(range.getClientRects()).filter(r=>r.width&&r.height),box=n.getBoundingClientRect();return lines.length===1&&lines.every(r=>r.left>=box.left-1&&r.right<=box.right+1)});
try {
 for(const base of['','/preview'])assert.equal(spawnSync('python3',['nightjar/build.py','--destination',join(dir,base||'.'),'--baseurl',base],{stdio:'inherit',timeout:120000}).status,0);
 server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1','--directory',dir],{stdio:['ignore','pipe','ignore']});
 const port=await bounded('server startup',()=>new Promise(resolve=>server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m)resolve(m[1])})),10000),origin=`http://127.0.0.1:${port}`;
 browser=await engine.launch(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
 for(const base of['','/preview'])for(const mode of['light','dark'])for(const width of[320,768,1440]) {
  const c=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});c.setDefaultTimeout(10000);c.setDefaultNavigationTimeout(15000);
  await c.addInitScript(m=>localStorage.setItem('design-appearance',m),mode);
  try {
   const p=await c.newPage();
   for(const id of['report','search']) {
    console.log('COLLECTION',name,base||'/',mode,width,id);
    assert.equal((await p.goto(`${origin}${base}/examples/${id}/`,{waitUntil:'load'})).status(),200);
    await bounded('fonts '+id,()=>p.evaluate(()=>document.fonts.ready.then(()=>true)),10000);
    assert.equal(await p.locator('html').getAttribute('data-appearance'),mode);
    if(id==='report') {
     const nav=p.getByRole('navigation',{name:'Report sections',exact:true}),body=p.locator('.example-report-body');
     assert.deepEqual(await nav.locator('a').evaluateAll(ns=>ns.map(n=>n.getAttribute('href'))),report.sections.map(s=>'#'+s.id));
     assert.deepEqual((await body.locator('h2').allTextContents()).map(norm),report.sections.map(s=>s.title));
     const measures=report.sections.find(s=>s.id==='measures').items;
     assert.deepEqual((await body.locator('.example-stats dt').allTextContents()).map(norm),measures.map(m=>m.label));
     assert.deepEqual((await body.locator('.example-stats dd').allTextContents()).map(norm),measures.map(m=>m.value));
     const table=p.getByRole('region',{name:'Observation register table',exact:true});
     assert.equal(await table.count(),1);
     assert.deepEqual(await table.locator('tbody tr').evaluateAll(ns=>ns.map(n=>Array.from(n.querySelectorAll('th,td'),x=>x.textContent.trim()))),report.sections.find(s=>s.id==='register').rows);
     await nav.locator('a[href="#register"]').focus();await p.keyboard.press('Enter');await p.waitForURL('**/#register');
     const csv=p.getByRole('link',{name:'Download example data (CSV)',exact:true});assert.equal(await csv.getAttribute('href'),base+'/assets/examples/observations.csv');assert.equal(await csv.getAttribute('download'),'observations.csv');
    } else {
     const region=p.getByRole('region',{name:'Search results',exact:true}),box=p.getByRole('searchbox',{name:'Search the example record'});
     assert.equal(await region.count(),1);assert.equal(await box.isEnabled(),true);assert.equal(await submitLabelFits(p),true,'native submit label stays on one line within its button');
     await box.fill(article.title);await box.press('Enter');await p.waitForFunction(()=>document.querySelectorAll('[data-search-results] li').length===1);
     assert.equal(norm(await region.locator('h3').textContent()),article.title);
     assert.equal(norm(await region.locator('li p').textContent()),article.summary);
     assert.equal(await region.locator('li a').getAttribute('href'),base+'/examples/article/');
     assert.equal(new URL(p.url()).searchParams.get('q'),article.title);
     if(width===1440)assert.ok((await region.locator('li > div').boundingBox()).width>300,'body-only result uses the working region, not the metadata column');
    }
    const axe=await bounded('full accessibility '+id,()=>new AxeBuilder({page:p}).analyze(),30000);
    assert.deepEqual(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
    await p.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'200% text retains context');if(id==='search')assert.equal(await submitLabelFits(p),true,'enlarged submit label remains complete and unwrapped');await p.evaluate(()=>document.documentElement.style.fontSize='');
    await p.emulateMedia({forcedColors:'active'});assert.equal(await p.locator('main h1').isVisible(),true);await p.emulateMedia({forcedColors:'none',media:'print'});assert.equal(await p.locator('main h1').isVisible(),true);await p.emulateMedia({media:'screen'});
    if(id==='search') {
     const box=p.getByRole('searchbox',{name:'Search the example record'});
     await box.fill('no-match-nightjar-record');await box.press('Enter');await p.waitForFunction(()=>document.querySelector('[data-search-status]').textContent.startsWith('No results'));
     assert.equal(await p.locator('[data-search-results] li').count(),0);assert.equal(await p.locator('[data-search-status] a').getAttribute('href'),base+'/examples/');
     await box.fill('');await box.press('Enter');await p.waitForFunction(()=>document.querySelector('[data-search-status]').textContent.startsWith('Enter a word'));assert.equal(new URL(p.url()).searchParams.has('q'),false);
    }
    rows.push({base:base||'/',mode,width,id,incomplete:axe.incomplete.map(x=>x.id)});
   }
  }finally{await c.close();}
 }
 for(const base of['','/preview']) {
  const c=await browser.newContext({viewport:{width:320,height:1000}});c.setDefaultTimeout(10000);c.setDefaultNavigationTimeout(15000);
  try {
   const p=await c.newPage();await p.goto(`${origin}${base}/examples/search/?q=${encodeURIComponent(article.title)}`);
   await p.waitForFunction(()=>document.querySelectorAll('[data-search-results] li').length===1);assert.equal(await p.getByRole('searchbox').inputValue(),article.title);
   await p.evaluate(()=>history.replaceState=()=>{throw Error('simulated address failure')});await p.getByRole('searchbox').fill('shoreline');await p.getByRole('searchbox').press('Enter');await p.waitForFunction(()=>document.querySelector('[data-search-status]').textContent.includes('address could not be updated'));assert.ok(await p.locator('[data-search-results] li').count()>0);
   await p.goto(`${origin}${base}/examples/report/`);const downloadPromise=p.waitForEvent('download');await p.getByRole('link',{name:'Download example data (CSV)',exact:true}).click();const download=await bounded('CSV download',()=>downloadPromise,15000);assert.equal(download.suggestedFilename(),'observations.csv');const path=await bounded('complete CSV',()=>download.path(),15000);assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),createHash('sha256').update(readFileSync('assets/examples/observations.csv')).digest('hex'));
  }finally{await c.close();}
  const unavailable=await browser.newContext({viewport:{width:320,height:1000}});unavailable.setDefaultTimeout(10000);unavailable.setDefaultNavigationTimeout(15000);
  try {
   const html=readFileSync(join(dir,base||'.','examples/search/index.html'),'utf8'),corrupt=html.replace(/(<script[^>]*data-search-index[^>]*>)[\s\S]*?(<\/script>)/,'$1not-json$2');assert.notEqual(corrupt,html);
   await unavailable.route('**/examples/search/**',route=>route.fulfill({status:200,contentType:'text/html',body:corrupt}));const p=await unavailable.newPage();await p.goto(`${origin}${base}/examples/search/`);assert.equal(await p.getByRole('searchbox').isDisabled(),true);assert.equal(await p.locator('[data-search-fallback]').isVisible(),true);assert.match(await p.locator('[data-search-status]').textContent(),/unavailable/);
  }finally{await unavailable.close();}
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:1000}});nojs.setDefaultNavigationTimeout(15000);
  try{const p=await nojs.newPage();for(const id of['report','search']){await p.goto(`${origin}${base}/examples/${id}/`);if(id==='report')assert.equal(await p.getByRole('navigation',{name:'Report sections'}).locator('a').count(),4);else{assert.equal(await p.getByRole('searchbox').isDisabled(),true);assert.equal(await p.locator('[data-search-fallback]').isVisible(),true);}}}finally{await nojs.close();}
 }
 const result={status:'passed',engine:name,cases:rows.length,fullAxeScans:rows.length,noJsCases:4,additionalStates:['initial query URL','address update failure retains results','corrupt index unavailable fallback','complete CSV bytes/filename'],durationMilliseconds:Date.now()-started,rows};
 if(process.env.COLLECTIONS_EVIDENCE_DIR){mkdirSync(process.env.COLLECTIONS_EVIDENCE_DIR,{recursive:true});writeFileSync(join(process.env.COLLECTIONS_EVIDENCE_DIR,name+'-collections.json'),JSON.stringify(result,null,2)+'\n');}
 console.log(JSON.stringify({status:result.status,engine:name,cases:rows.length,durationMilliseconds:result.durationMilliseconds}));
}finally{clearTimeout(watchdog);try{if(browser)await bounded('browser cleanup',()=>browser.close(),10000)}finally{if(server)server.kill();rmSync(dir,{recursive:true,force:true})}}
