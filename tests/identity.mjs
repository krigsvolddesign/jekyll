import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import{spawn,spawnSync}from'node:child_process';
import{chromium,firefox,webkit}from'@playwright/test';import AxeBuilder from '@axe-core/playwright';
const name=process.env.BROWSER||'chromium',engine={chromium,firefox,webkit}[name];assert.ok(engine);
const dir=mkdtempSync(join(tmpdir(),'krigsvold-identity-')),rows=[],scans=[];let browser,server;
const bounded=async(label,fn,ms=15000)=>{let timer;try{return await Promise.race([fn(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' timed out')),ms))])}finally{clearTimeout(timer)}};
const deadline=setTimeout(()=>{console.error('Identity overall deadline exceeded');process.exit(1)},330000);

/* Test actual computed placeholder ink against each control's surface. */
function placeholderContrast(ink,background) {
 const luminance=color=>{
  const values=color.match(/[0-9.]+/g);
  assert.ok(values&&values.length>=3,'Expected RGB computed style: '+color);
  const [r,g,b]=values.slice(0,3).map(Number).map(c=>{
   const v=c/255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;
  });
  return 0.2126*r+0.7152*g+0.0722*b;
 };
 const first=luminance(ink),second=luminance(background);
 return (Math.max(first,second)+0.05)/(Math.min(first,second)+0.05);
}
const paths=[['/language/','section'],['/examples/','section'],['/journal/','section'],['/setup/','compact'],['/journal/what-a-shell-should-own/','compact'],['/404.html','plain'],['/examples/dashboard-administration/',null]];
try{
for(const base of['','/preview'])assert.equal(spawnSync('python3',['nightjar/build.py','--destination',join(dir,base||'.'),'--baseurl',base],{stdio:'inherit',timeout:120000}).status,0);
server=spawn('python3',['-m','http.server','0','--bind','127.0.0.1','--directory',dir],{stdio:['ignore','pipe','ignore'],env:{...process.env,PYTHONUNBUFFERED:'1'}});
const port=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server startup timeout')),10000);server.stdout.on('data',b=>{const m=String(b).match(/port (\d+)/);if(m){clearTimeout(t);resolve(m[1]);}});});
browser=await engine.launch(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
for(const base of['','/preview'])for(const mode of['light','dark']){
const context=await browser.newContext({reducedMotion:'reduce'});await context.route('**/*',route=>route.continue());context.setDefaultTimeout(10000);context.setDefaultNavigationTimeout(15000);await context.addInitScript(m=>localStorage.setItem('design-appearance',m),mode);
try{const p=await context.newPage();for(const[path,variant]of paths){for(const width of[320,375,768,1024,1440,1920,3440]){console.log('IDENTITY',name,base||'/',mode,path,width);await p.setViewportSize({width,height:1100});const response=await p.goto(`http://127.0.0.1:${port}${base}${path}`,{waitUntil:'load'});assert.equal(response.status(),200,path);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');const hero=p.locator('header[data-hero-variant]');assert.equal(await hero.count(),variant?1:0);if(variant){assert.equal(await hero.getAttribute('data-hero-variant'),variant);assert.equal(await hero.locator('h1').count(),1);if(variant==='compact'){
 const shell=p.locator('.nav-shell'),shellBox=await shell.boundingBox(),heroBox=await hero.boundingBox();
 if(width>=992){
  assert.ok(heroBox.y<=shellBox.y+1 && heroBox.y+heroBox.height>shellBox.y+shellBox.height,'Compact Krigsvold hero begins behind the floating navigation');
  assert.equal(await shell.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','Floating navigation has no separate navy backdrop');
 }else{
  const titleBox=await hero.locator('h1').boundingBox();assert.ok(shellBox.y+shellBox.height<=titleBox.y+1,`In-flow compact navigation does not obscure the actual heading (shell ${JSON.stringify(shellBox)}, hero ${JSON.stringify(heroBox)}, title ${JSON.stringify(titleBox)})`);
  assert.equal(await shell.evaluate(el=>getComputedStyle(el).backgroundColor),await hero.evaluate(el=>getComputedStyle(el).backgroundColor),'The in-flow navigation backdrop matches the hero surface in both modes');
 }
}if(variant==='section'){const credit=hero.getByRole('link',{name:'Image credits and licenses'});assert.equal(await credit.getAttribute('href'),base+'/image-credits/');assert.ok(await credit.isVisible());assert.equal(await credit.evaluate(n=>getComputedStyle(n).color),'rgb(255, 255, 255)','credits remain readable across appearances');const img=hero.locator('img');assert.ok(await img.evaluate(n=>n.complete&&n.naturalWidth>0));assert.ok((await img.getAttribute('src')).startsWith(base+'/assets/images/sections/'));if(width<992){const r=await img.boundingBox(),h=await hero.locator('h1').boundingBox();assert.ok(h.y>=r.y+r.height,'mobile title follows image');assert.equal(await img.evaluate(n=>getComputedStyle(n).objectFit),'contain');}else assert.ok((await hero.boundingBox()).height<=360,'short desktop section');}else assert.equal(await hero.locator('img').count(),0,'restrained interiors have no forced photography');}rows.push({base:base||'/',mode,path,width,variant});}
if(variant){await p.setViewportSize({width:1440,height:1100});const audit=await bounded('identity accessibility '+path,()=>new AxeBuilder({page:p}).include('header[data-hero-variant]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(),45000);assert.deepEqual(audit.violations,[]);scans.push({base:base||'/',mode,path,incomplete:audit.incomplete.map(x=>x.id)});}}

  /* Manual acceptance blockers: placeholder contrast and printable credits. */
  await p.setViewportSize({width:1440,height:1100});
  const searchResponse=await p.goto(`http://127.0.0.1:${port}${base}/examples/search/`,{waitUntil:'load'});
  assert.equal(searchResponse.status(),200,'Placeholder test page exists');
  const searchInput=p.locator('.example-root input[placeholder]').first();
  assert.equal(await searchInput.count(),1,'Example search exposes placeholder ink');
  const styles=await searchInput.evaluate(el=>({ink:getComputedStyle(el,'::placeholder').color,
    opacity:getComputedStyle(el,'::placeholder').opacity,background:getComputedStyle(el).backgroundColor}));
  assert.equal(Number(styles.opacity),1,'Placeholder is fully opaque in '+mode);
  const contrast=placeholderContrast(styles.ink,styles.background);
  assert.ok(contrast>=4.5,`${name} ${mode} placeholder must meet 4.5:1 (observed ${contrast.toFixed(2)}:1)`);
  await p.goto(`http://127.0.0.1:${port}${base}/language/`,{waitUntil:'load'});
  await p.emulateMedia({media:'print'});
  const printedCredit=p.locator('.hero--section .hero-image-credit a');
  assert.equal(await printedCredit.count(),1,'Image attribution remains present in print');
  assert.equal(await printedCredit.isVisible(),true,'Image attribution remains displayed in print');
  const printInk=await printedCredit.evaluate(el=>getComputedStyle(el).color);
  const printContrast=placeholderContrast(printInk,'rgb(255, 255, 255)');
  assert.ok(printContrast>=4.5,`Printed image-credit link must use dark, readable ink on white paper (observed ${printContrast.toFixed(2)}:1, ${printInk})`);
  await p.emulateMedia({media:'screen'});

}finally{await context.close();}}
for(const base of['','/preview'])for(const width of[320,1440])for(const[path,variant]of paths){const c=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:1100}});try{c.setDefaultTimeout(10000);c.setDefaultNavigationTimeout(15000);const p=await c.newPage();await p.goto(`http://127.0.0.1:${port}${base}${path}`);assert.equal(await p.locator('header[data-hero-variant]').count(),variant?1:0);assert.ok(await p.locator('a.navbar-brand').isVisible());assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}finally{await c.close();}}
for(const base of['','/preview']){const c=await browser.newContext({forcedColors:'active',viewport:{width:320,height:1000}});try{c.setDefaultTimeout(10000);c.setDefaultNavigationTimeout(15000);const p=await c.newPage();await p.goto(`http://127.0.0.1:${port}${base}/language/`);assert.equal(await p.locator('.page-masthead__art').isVisible(),false);const menu=p.getByRole('button',{name:'Menu',exact:true});await menu.focus();await p.keyboard.press('Enter');assert.equal(await menu.getAttribute('aria-expanded'),'true');assert.equal(await menu.evaluate(n=>getComputedStyle(n,'::after').content),'"Close"');await p.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.ok(await menu.evaluate(n=>document.activeElement===n));}finally{await c.close();}}
// Full-page rules include landmark-unique, beyond the WCAG-tagged hero scans.
const analyticsScans=[];
for(const base of['','/preview'])for(const mode of['light','dark']){
 const c=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});c.setDefaultTimeout(10000);c.setDefaultNavigationTimeout(15000);await c.addInitScript(m=>localStorage.setItem('design-appearance',m),mode);
 try{const p=await c.newPage();console.log('IDENTITY analytics full accessibility',base||'/',mode);await p.goto(`http://127.0.0.1:${port}${base}/examples/dashboard-analytics/`,{waitUntil:'load'});
 const audit=await bounded('analytics full accessibility '+(base||'/')+' '+mode,()=>new AxeBuilder({page:p}).analyze(),45000);assert.deepEqual(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],'Analytics regions and complete page remain accessible');analyticsScans.push({base:base||'/',mode,incomplete:audit.incomplete.map(v=>v.id)});
 }finally{await c.close();}
}
const report={status:'passed',engine:name,cases:rows.length,axeScans:scans.length,rows,scans,noJsCases:28,forcedColorKeyboardCases:2,analyticsFullPageScans:analyticsScans};if(process.env.IDENTITY_EVIDENCE_DIR){mkdirSync(process.env.IDENTITY_EVIDENCE_DIR,{recursive:true});writeFileSync(join(process.env.IDENTITY_EVIDENCE_DIR,name+'-identity.json'),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify({status:report.status,engine:name,cases:report.cases,axeScans:report.axeScans}));
}finally{clearTimeout(deadline);if(browser)await bounded('identity browser cleanup',()=>browser.close(),10000);if(server)server.kill();rmSync(dir,{recursive:true,force:true});}
