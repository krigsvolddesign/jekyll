import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {chromium,firefox,webkit} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];assert.ok(engine);
const fixtures=JSON.parse(readFileSync('_data/examples.json')).pages;
const ids=['documentation','guide','reference','privacy','terms','opportunity','integrations','stress-test','article','event','report'];
const dir=mkdtempSync(join(tmpdir(),'krigsvold-reading-')),rows=[];
let browser,server;
const watchdog=setTimeout(()=>{console.error('Reading overall deadline exceeded');process.exit(1)},330000);
const bounded=async(label,fn,ms=20000)=>{let timer;try{return await Promise.race([fn(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' timed out')),ms))])}finally{clearTimeout(timer)}};
const norm=s=>s.replace(/\s+/g,' ').trim();
try {
 for(const base of['','/preview'])assert.equal(spawnSync('python3',['nightjar/build.py','--destination',join(dir,base||'.'),'--baseurl',base],{stdio:'inherit',timeout:120000}).status,0);
 server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1','--directory',dir],{stdio:['ignore','pipe','ignore']});
 const port=await bounded('server startup',()=>new Promise(resolve=>server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m)resolve(m[1])})),10000);
 browser=await engine.launch(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
 for(const base of['','/preview'])for(const mode of['light','dark'])for(const width of[320,1440]) {
  const c=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});
  c.setDefaultTimeout(10000);c.setDefaultNavigationTimeout(15000);
  await c.addInitScript(m=>localStorage.setItem('design-appearance',m),mode);
  try {
   const p=await c.newPage();
   for(const id of ids) {
    console.log('READING',name,base||'/',mode,width,id);
    const response=await p.goto(`http://127.0.0.1:${port}${base}/examples/${id}/`,{waitUntil:'load'});assert.equal(response.status(),200);
    const root=p.locator(`[data-example="${id}"]`),record=fixtures.find(r=>r.id===id);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'page overflow stays contained');
    for(const section of record.sections) {
     assert.equal(await root.locator(`[id="${section.id}"]`).count(),1,'original anchor retained');
     if(section.kind==='table') {
      const region=root.getByRole('region',{name:section.title+' table',exact:true});
      assert.equal(await region.count(),1,'inner table scope is distinct from its enclosing section');
      assert.equal(await region.getAttribute('tabindex'),'0');
      assert.equal(norm(await region.locator('caption').textContent()),section.title);
      assert.deepEqual((await region.locator('thead th').allTextContents()).map(norm),section.headers);
      assert.deepEqual((await region.locator('tbody tr').evaluateAll(ns=>ns.map(n=>Array.from(n.querySelectorAll('th,td'),c=>c.textContent.replace(/\s+/g,' ').trim())))),section.rows.map(r=>r.map(String)));
      await region.focus();assert.ok(await region.evaluate(n=>document.activeElement===n));
      if(await region.evaluate(n=>n.scrollWidth>n.clientWidth+1)) {await p.keyboard.press('ArrowRight');await p.waitForFunction(n=>n.scrollLeft>0,await region.elementHandle());}
     }
    }
    if(id==='documentation') {
     const items=record.sections[0].items;
     assert.deepEqual((await root.locator('.example-documentation-paths h3').allTextContents()).map(norm),items.map(x=>x.title));
     assert.deepEqual((await root.locator('.example-documentation-paths p').allTextContents()).map(norm),items.map(x=>x.summary));
     assert.deepEqual(await root.locator('.example-documentation-paths a').evaluateAll(ns=>ns.map(n=>n.getAttribute('href'))),items.map(x=>base+x.url));
    }
    if(record.composition==='document'&&width===1440) {
     const wrapper=await root.locator('.example-wrap').boundingBox(),body=await root.locator('.example-wrap > article').boundingBox();
     assert.ok(wrapper.width>1000&&body.width>700,'default documents retain their full content envelope without a contents sidebar');
     assert.equal(await root.locator('.example-local-index').count(),0,'contents require explicit author opt-in');
     for(const prose of await root.locator('.example-prose').all())assert.ok((await prose.boundingBox()).width<=750,'prose keeps a readable independent measure');
    }
    const axe=await bounded('full accessibility '+id,()=>new AxeBuilder({page:p}).analyze(),45000);
    assert.deepEqual(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
    await p.evaluate(()=>document.documentElement.style.fontSize='200%');
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'200% text keeps context');
    await p.evaluate(()=>document.documentElement.style.fontSize='');
    await p.emulateMedia({forcedColors:'active'});assert.ok(await root.isVisible());
    await p.emulateMedia({forcedColors:'none',media:'print'});assert.ok(await root.isVisible());
    await p.emulateMedia({media:'screen'});
    rows.push({base:base||'/',mode,width,id,incomplete:axe.incomplete.map(x=>x.id)});
   }
  }finally{await c.close();}
 }
 for(const base of['','/preview']) {
  const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:1000}});c.setDefaultNavigationTimeout(15000);
  try{const p=await c.newPage();for(const id of ids){await p.goto(`http://127.0.0.1:${port}${base}/examples/${id}/`);assert.equal(await p.locator('main h1').count(),1);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}}finally{await c.close();}
 }
 const report={status:'passed',engine:name,cases:rows.length,fullAxeScans:rows.length,noJsCases:ids.length*2,rows};
 if(process.env.READING_EVIDENCE_DIR){mkdirSync(process.env.READING_EVIDENCE_DIR,{recursive:true});writeFileSync(join(process.env.READING_EVIDENCE_DIR,name+'-reading.json'),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({status:report.status,engine:name,cases:rows.length,noJsCases:report.noJsCases}));
}finally{clearTimeout(watchdog);try{if(browser)await bounded('browser cleanup',()=>browser.close(),10000)}finally{if(server)server.kill();rmSync(dir,{recursive:true,force:true})}}
