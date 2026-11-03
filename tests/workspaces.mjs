import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {chromium,firefox,webkit} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const started=Date.now(),name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];assert.ok(engine);
const fixture=JSON.parse(readFileSync('_data/dashboards.json')),dir=mkdtempSync(join(tmpdir(),'krigsvold-workspaces-')),rows=[];
let server,browser;
const deadline=setTimeout(()=>{console.error('Operational overall 180s deadline exceeded');process.exit(1)},180000);
const bounded=async(label,fn,ms=15000)=>{console.log('OPERATION',label);let timer;try{return await Promise.race([fn(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' timed out')),ms))])}finally{clearTimeout(timer)}};
const text=async locator=>(await locator.textContent()).trim();
const focusIs=locator=>locator.evaluate(n=>n===document.activeElement);

async function analytics(page) {
 const scope=page.getByRole('region',{name:'Analytics scope',exact:true});assert.equal(await scope.count(),1);
 assert.equal(await scope.locator('#analytics-filters').count(),1);assert.equal(await scope.locator('.dash-metrics output').count(),4);
 await page.locator('#analytics-category').selectOption('Research');await page.locator('#analytics-filters button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#analytics-source tbody').rows.length===7);
 assert.equal(await text(page.locator('[data-metric=sessions]')),'2,303');
 assert.equal(new URL(page.url()).searchParams.get('category'),'Research');
 assert.deepEqual(await page.locator('#analytics-source tbody tr').evaluateAll(ns=>ns.map(n=>n.cells[1].textContent)),Array(7).fill('Research'));
 const originalRows=await page.locator('#analytics-source tbody').innerHTML();
 await page.locator('#analytics-start').fill('2026-10-28');await page.locator('#analytics-end').fill('2026-10-22');await page.locator('#analytics-filters button[type=submit]').click();
 assert.equal(await page.locator('#analytics-error').isVisible(),true);assert.equal(await focusIs(page.locator('#analytics-error')),true);
 assert.equal(await page.locator('#analytics-source tbody').innerHTML(),originalRows,'Invalid range retains previous observations');
 assert.equal(await page.locator('[data-export-analytics]').isDisabled(),true);
 await page.locator('#analytics-start').fill('2026-10-22');await page.locator('#analytics-end').fill('2026-10-28');await page.locator('#analytics-filters button[type=submit]').click();
 assert.equal(await page.locator('#analytics-error').isVisible(),false);assert.equal(await text(page.locator('[data-metric=sessions]')),'2,303');
 return {researchRecords:7,sessions:2303,invalidRangeRetained:true,errorFocus:true};
}

async function administration(page) {
 const work=page.locator('.dash-administration-work');assert.equal(await work.locator('#people-table').count(),1);assert.equal(await work.locator('#person-editor').count(),1);
 await page.locator('#people-query').fill('Mara Ellis');await page.locator('#people-filters button[type=submit]').click();
 assert.equal(await page.locator('#people-table tbody tr').count(),1);assert.equal(await page.locator('#people-table tbody tr').getAttribute('data-person'),'P-001');
 await page.locator('#people-density').selectOption('compact');assert.equal(await page.locator('[data-directory-region]').getAttribute('data-density'),'compact');
 await page.locator('[data-clear-people]').click();assert.equal(await page.locator('#people-table tbody tr').count(),5);
 const edit=page.locator('[data-edit-person]').first(),id=await edit.getAttribute('data-edit-person'),person=fixture.people.find(x=>x.id===id);
 await edit.focus();await page.keyboard.press('Enter');assert.equal(await focusIs(page.locator('#person-name')),true);
 await page.locator('#person-name').fill(person.name+' reviewed');await page.locator('#person-email').fill('invalid-email');await page.locator('#person-editor button[type=submit]').click();
 assert.equal(await page.locator('#person-errors').isVisible(),true);assert.equal(await focusIs(page.locator('#person-errors')),true);
 assert.equal(await page.locator('#person-name').inputValue(),person.name+' reviewed');assert.equal(await page.locator('#person-email').getAttribute('aria-invalid'),'true');
 await page.locator('[data-edit-person]').nth(1).click();assert.match(await text(page.locator('[data-dashboard-status]')),/Unsaved changes/);assert.equal(await page.locator('#person-email').inputValue(),'invalid-email');assert.equal(await focusIs(page.locator('#person-name')),true);
 await page.locator('#person-email').fill(person.email);await page.locator('#person-editor button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('[data-dashboard-status]').textContent.startsWith('Saved '));
 await page.locator('#person-name').fill('Retained recovery draft');await page.locator('#people-state').selectOption('error');
 assert.equal(await page.locator('[data-directory-state]').getAttribute('role'),'alert');assert.equal(await page.locator('#person-name').inputValue(),'Retained recovery draft');
 await page.getByRole('button',{name:'Retry directory',exact:true}).click();assert.equal(await page.locator('#person-name').inputValue(),'Retained recovery draft');assert.equal(await page.locator('#person-name').isEnabled(),true);
 await page.locator('[data-discard-person]').click();
 const checks=page.locator('[data-select-person]');const selected=[await checks.nth(0).getAttribute('data-select-person'),await checks.nth(1).getAttribute('data-select-person')];
 const before=await page.locator('#people-table tbody tr').evaluateAll(ns=>Object.fromEntries(ns.map(n=>[n.dataset.person,n.querySelector('.dash-badge').textContent])));
 await checks.nth(0).check();await checks.nth(1).check();const bulk=page.locator('[data-bulk=Suspended]');await bulk.click();
 const dialog=page.locator('[data-bulk-dialog]');assert.equal(await dialog.evaluate(n=>n.open),true);assert.equal(await focusIs(page.locator('[data-bulk-cancel]')),true);
 await page.keyboard.press('Escape');assert.equal(await dialog.evaluate(n=>n.open),false);assert.equal(await focusIs(bulk),true);
 await bulk.click();await page.locator('[data-bulk-confirm]').click();assert.equal(await dialog.evaluate(n=>n.open),false);assert.equal(await focusIs(page.locator('[data-select-page]')),true);
 const after=await page.locator('#people-table tbody tr').evaluateAll(ns=>Object.fromEntries(ns.map(n=>[n.dataset.person,n.querySelector('.dash-badge').textContent])));
 for(const [key,value] of Object.entries(before))assert.equal(after[key],selected.includes(key)?'Suspended':value,'Bulk change is scoped to selected people');
 return {filterRecord:'P-001',invalidEditRetained:true,dirtyGuard:true,errorRetryRetained:true,bulkCancelAndConfirmFocus:true,selectedOnly:true};
}

async function operations(page) {
 const scope=page.getByRole('region',{name:'Operational scope',exact:true});assert.equal(await scope.locator('#operations-filters').count(),1);assert.equal(await scope.locator('.dash-metrics output').count(),4);
 assert.equal(await page.getByRole('region',{name:'Service status table',exact:true}).count(),1);
 const previous=await page.locator('#service-table tbody').innerHTML();
 await page.locator('#operations-threshold').fill('49');await page.locator('#operations-filters button[type=submit]').click();
 assert.equal(await page.locator('#operations-error').isVisible(),true);assert.equal(await focusIs(page.locator('#operations-error')),true);assert.equal(await page.locator('#service-table tbody').innerHTML(),previous);
 await page.locator('#operations-threshold').fill('300');await page.locator('#operations-filters button[type=submit]').click();
 const latest=fixture.services.map(s=>s.samples.slice().sort((a,b)=>a.time.localeCompare(b.time)).at(-1));
 assert.equal(await text(page.locator('[data-metric=warnings]')),String(latest.filter(s=>s.latency_ms>=300).length));
 assert.equal(await text(page.locator('[data-metric=queue]')),String(latest.reduce((sum,s)=>sum+s.queue,0)));
 await page.locator('#operations-service').selectOption('SVC-01');await page.locator('#operations-filters button[type=submit]').click();
 assert.equal(await page.locator('#service-table tbody tr').count(),1);assert.equal(await text(page.locator('#service-table tbody th')),fixture.services.find(s=>s.id==='SVC-01').name);
 await page.locator('#operations-service').selectOption('');await page.locator('#operations-filters button[type=submit]').click();
 const ack=page.locator('[data-acknowledge="AL-001"]');await ack.focus();await page.keyboard.press('Enter');
 assert.match(await text(ack),/Undo acknowledgement/);assert.equal(await focusIs(ack),true);assert.match(await text(page.locator('[data-dashboard-status]')),/No live alert was changed/);
 await page.locator('[data-reset-operations]').click();assert.equal(await page.locator('#operations-threshold').inputValue(),'250');assert.equal(await text(ack),'Acknowledge');assert.equal(await page.locator('#service-table tbody tr').count(),fixture.services.length);
 return {invalidThresholdRetained:true,errorFocus:true,validThreshold:300,serviceScoped:true,acknowledgeFocus:true,resetRestored:true};
}

try {
 for(const base of['','/preview'])assert.equal(spawnSync('python3',['nightjar/build.py','--destination',join(dir,base||'.'),'--baseurl',base],{stdio:'inherit',timeout:120000}).status,0);
 server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1','--directory',dir],{stdio:['ignore','pipe','ignore']});
 const port=await bounded('server startup',()=>new Promise(resolve=>server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m)resolve(m[1])})),10000),origin=`http://127.0.0.1:${port}`;
 browser=await bounded('browser launch',()=>engine.launch(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),30000);
 for(const base of['','/preview'])for(const mode of['light','dark'])for(const width of[320,1440]) {
  const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});context.setDefaultTimeout(10000);context.setDefaultNavigationTimeout(15000);await context.addInitScript(m=>localStorage.setItem('design-appearance',m),mode);
  try {
   const page=await context.newPage();
   for(const kind of['analytics','administration','operations']) {
    console.log('WORKSPACES',name,base||'/',mode,width,kind);
    assert.equal((await page.goto(`${origin}${base}/examples/dashboard-${kind}/`,{waitUntil:'load'})).status(),200);
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-dashboard-controls]')).every(n=>!n.disabled));
    await bounded('font readiness '+kind,()=>page.evaluate(()=>document.fonts.ready.then(()=>true)),10000);
    const state=await bounded(kind+' transactions',()=>({analytics,administration,operations}[kind](page)),45000);
    const axe=await bounded(kind+' full accessibility',()=>new AxeBuilder({page}).analyze(),45000);assert.deepEqual(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(width===1440) {
     await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
     if(kind==='administration'){const regions=await page.locator('.dash-administration-work > .dash-panel').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom}}));assert.ok(regions[1].y>=regions[0].bottom-1,'Enlarged editor wraps as a complete region');}
     await page.evaluate(()=>document.documentElement.style.fontSize='');
    }
    await page.emulateMedia({forcedColors:'active'});assert.equal(await page.locator('main h1').isVisible(),true);await page.emulateMedia({forcedColors:'none'});
    if(kind==='administration'){await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));assert.equal(await page.locator('[data-print-people] tr').count(),fixture.people.length);await page.emulateMedia({media:'print'});await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));assert.equal(await page.locator('[data-print-people]').count(),0);}
    rows.push({base:base||'/',mode,width,kind,state,incomplete:axe.incomplete.map(v=>v.id)});
   }
  }finally{await bounded('context cleanup',()=>context.close(),10000);}
 }
 for(const base of['','/preview']) {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});context.setDefaultTimeout(10000);context.setDefaultNavigationTimeout(15000);
  try {
   const page=await context.newPage();await page.goto(`${origin}${base}/examples/dashboard-analytics/`);await page.locator('#analytics-category').selectOption('Research');await page.locator('#analytics-filters button[type=submit]').click();
   const pending=page.waitForEvent('download');await page.locator('[data-export-analytics]').click();const download=await bounded('filtered analytics CSV',()=>pending,15000);assert.equal(download.suggestedFilename(),'northlight-analytics.csv');const file=await bounded('complete filtered CSV',()=>download.path(),15000),lines=readFileSync(file,'utf8').split(/\r?\n/);assert.equal(lines.length,8);assert.equal(lines[0],'"Date","Category","Sessions","Downloads","Completed tasks"');assert.ok(lines.slice(1).every(line=>line.includes('"Research"')));
  }finally{await bounded('CSV context cleanup',()=>context.close(),10000);}
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:1000}});nojs.setDefaultNavigationTimeout(15000);
  try{const page=await nojs.newPage();for(const kind of['analytics','administration','operations']){await page.goto(`${origin}${base}/examples/dashboard-${kind}/`);assert.equal(await page.locator('[data-dashboard-controls]').evaluateAll(ns=>ns.every(n=>n.disabled)),true);assert.equal(await page.locator('[data-dashboard-fallback]').isVisible(),true);const table=page.locator(kind==='analytics'?'#analytics-source':kind==='administration'?'#people-table':'#service-table');assert.ok(await table.locator('tbody tr').count()>0);}}finally{await bounded('no-JS context cleanup',()=>nojs.close(),10000);}
 }
 const result={status:'passed',engine:name,cases:rows.length,fullAxeScans:rows.length,true200PercentCases:12,noJsCases:6,filteredCsvCases:2,durationMilliseconds:Date.now()-started,rows};
 if(process.env.WORKSPACES_EVIDENCE_DIR){mkdirSync(process.env.WORKSPACES_EVIDENCE_DIR,{recursive:true});writeFileSync(join(process.env.WORKSPACES_EVIDENCE_DIR,name+'-workspaces.json'),JSON.stringify(result,null,2)+'\n');}
 console.log(JSON.stringify({status:result.status,engine:name,cases:rows.length,durationMilliseconds:result.durationMilliseconds}));
}finally{clearTimeout(deadline);try{if(browser)await bounded('browser cleanup',()=>browser.close(),10000)}finally{if(server)server.kill();rmSync(dir,{recursive:true,force:true});}}
