import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {newCreation} from '../creative-model.js';
import {particleCreation} from '../particle-model.js';

const source=process.env.PRISMA_STUDIO_ROOT||(existsSync('web/studio/index.html')?'web/studio':'.');
const origin='http://localhost:8416';
const scenes={
 solid:newCreation(),
 particles:particleCreation(newCreation()),
 mixed:{...newCreation(),grainSource:'body',sceneGrains:.48,structWeaveCradle:.6,structWeaveNodes:.7,fiberPile:.4,veilAmount:.5},
 legacyVeil:{...particleCreation(newCreation()),pLiving:4,pVeilSourceKind:0,pVeilFromForm:1,pVeilMorph:.75}
};
const levels=['simple','complete','expert'];
const levelsFor=engine=>['solid','particles'].includes(engine)?levels:['expert'];
const browser=await chromium.launch({channel:'chrome',headless:true});
const all=[];
function collectRows(root){
 const rows=[];
 for(const el of root.querySelectorAll('input,select')){
  // A numeric companion and its range are two inputs for one command.
  if(el.type==='number'||el.type==='hidden'||el.type==='file'||el.classList.contains('hex-input'))continue;
  let key;
  for(const attr of ['param','path','check','color','pathCheck','pathColor','pathSelect','particleSelect','finishSelect']){
   if(el.dataset[attr]!==undefined){key=el.dataset[attr];break;}
  }
  if(!key)for(const [attr,prefix] of Object.entries({bodyParam:'bodyTracking.',bodySelect:'bodyTracking.',bodyCheck:'bodyTracking.',audioSetting:'audioReactive.',audioMap:'audioReactive.mappings.',forceParam:'forcePoints.selected.',guideParam:'forcePaths.selected.',palette:'palette.'})){
   if(el.dataset[attr]!==undefined){key=prefix+el.dataset[attr];break;}
  }
  if(el.hasAttribute('data-grain-motion'))key='grainMotion';
  if(el.hasAttribute('data-force-enabled'))key='forcePoints.selected.enabled';
  if(el.hasAttribute('data-guide-enabled'))key='forcePaths.selected.enabled';
  const row=el.closest('.param,.field,.check,.color-field')||el;
  // Native setting selects using an ID (environment etc.) are also real controls.
  if(!key&&el.id)key='#'+el.id;
  if(!key)continue;
  const labelNode=(row.matches('label')?row:row.querySelector('label')||el.labels?.[0]||row).cloneNode(true);
  labelNode.querySelectorAll('select,input,button,output,.range-ends').forEach(e=>e.remove());
  const label=labelNode.textContent.trim()||el.getAttribute('aria-label')||key;
  const sections=[];let section=row.closest('details');
  while(section){const heading=section.querySelector(':scope > summary')?.cloneNode(true);heading?.querySelectorAll('button,span.section-state').forEach(b=>b.remove());sections.unshift(heading?.textContent.trim());section=section.parentElement?.closest('details');}
  rows.push({key,label,sections});
 }
 return rows;
}
try{
 for(const [engine,scene] of Object.entries(scenes)){
  // Include controls that appear only when a layer or an editable field exists.
  Object.assign(scene,{pCount:2000,pLinks:.5,pLinkNodes:50,pSkin:.4,pTrailCount:160,pTrailLength:.2,pTrailOpacity:.6,dynObstacle:2,
   forcePoints:[{id:1,enabled:true,x:1,y:0,z:0,radius:.4,strength:0,swirl:0}],
   forcePaths:[{id:1,enabled:true,mode:'follow',closed:true,strength:0,points:[{x:-1,y:-1},{x:1,y:-1},{x:0,y:1}]}]});
  const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',route=>{
   const pathname=new URL(route.request().url()).pathname;
   const file=path.join(source,pathname==='/'?'index.html':pathname.slice(1));
   return existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404});
  });
  await page.addInitScript(state=>{
   localStorage.setItem('prisma-current-v2',JSON.stringify({state,ratio:16/9,phase:0,name:'Audit'}));
   localStorage.setItem('prisma-control-level','"expert"');
  },scene);
  await page.goto(origin);await page.waitForFunction(()=>window.prismaReady);
  for(const level of levelsFor(engine)){
  await page.locator('#control-level').selectOption(level);
  for(const tab of ['shape','material','color','light','background','photo','motion','fields','body','audio','library']){
   await page.locator('#tabs [data-tab="'+tab+'"]').last().click();
   if(tab==='body')await page.locator('#controls [data-body-param]').first().waitFor({state:'attached'});
   if(tab==='audio')await page.locator('#controls [data-audio-setting]').first().waitFor({state:'attached'});
   const rows=await page.locator('#controls').evaluate(collectRows);
   const extras=await page.locator('#controls').evaluate(root=>{
    const actions=[];
    for(const button of root.querySelectorAll('button')){
     if(button.matches('.parameter-info,.animate-toggle,.audio-link,.condition-action,.control-lock'))continue;
     const fields=[...button.attributes].filter(a=>a.name.startsWith('data-'));
     // Preserve the complete action, e.g. a preset includes its engine, a move includes its direction.
     const binding=fields.map(a=>a.name+'='+a.value).sort().join('|')||(button.id?'#'+button.id:'');
     if(binding)actions.push({binding,label:button.textContent.trim()});
    }
    const ids=[...root.querySelectorAll('[id]')].map(el=>el.id).filter(Boolean);
    const nestedRows=[...root.querySelectorAll('label.field')].filter(el=>el.querySelector('.param')).map(el=>el.querySelector('select')?.outerHTML.slice(0,80));
    return {actions,ids,nestedRows};
   });
   all.push({engine,level,tab,rows,...extras});
   if(tab==='light'&&level==='expert'){
    for(const kind of ['orbit','pulse']){
     const prefix='lights.1.'+kind;
     await page.locator('#controls [data-animate-path="'+prefix+'"]').first().evaluate(b=>b.click());
     const editor=page.locator('#animation-editor');
     const available=(await editor.evaluate(collectRows)).map(row=>row.key);
     const settings=kind==='orbit'?['axis','curve','direction']:['curve','direction'];
     for(const key of settings)assert(available.includes(prefix+'.'+key),engine+' lost '+prefix+'.'+key);
     // The keyframe style select writes directly through its own editor change handler.
     if(kind==='orbit')assert.equal(await editor.locator('select').filter({has:page.locator('option[value="points"]')}).count(),1);
     await editor.locator('[aria-label="Chiudi editor"]').evaluate(b=>b.click());
    }
    await page.locator('#controls [data-light-select="2"]').first().evaluate(b=>b.click());
    await page.locator('#controls [data-path-color="lights.2.color"]').first().evaluate(e=>{
     e.value='#486ace';e.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await page.locator('#controls [data-path-select="lights.2.type"]').first().evaluate(e=>{
     e.value='spot';e.dispatchEvent(new Event('change',{bubbles:true}));
    });
    await page.waitForFunction(()=>{
     const lights=JSON.parse(localStorage.getItem('prisma-current-v2')||'null')?.state?.lights;
     return lights?.some(l=>l.id===2&&l.type==='spot'&&l.color==='#486ace')&&lights?.some(l=>l.id===1&&l.color!=='#486ace');
    });
   }
   if(tab==='motion'){
    for(const group of await page.locator('[data-animation-group]').all()){
     const name=await group.textContent();
     await group.evaluate(b=>b.click());
     const editor=page.locator('#animation-editor');
     all.push({engine,level,tab:'motion / '+name,rows:await editor.evaluate(collectRows)});
     await editor.locator('[aria-label="Chiudi editor"]').click();
    }
   }
  }
  if(level==='expert'){
   const search=page.locator('#control-search');
   await search.fill('Rotazione');
   const exact=page.locator('#control-search-results button').filter({has:page.locator('strong',{hasText:/^Rotazione$/})});
   assert.equal(await exact.count(),1,engine+' duplicate search results for the rotation recipe');
   await exact.click();
   await page.waitForFunction(()=>document.activeElement?.dataset.motionPreset==='turn');
  }
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
}finally{await browser.close();}
if(process.env.PRISMA_AUDIT_FILE)await writeFile(process.env.PRISMA_AUDIT_FILE,JSON.stringify(all,null,2));
for(const engine of Object.keys(scenes))for(const level of levelsFor(engine)){
 const panels=all.filter(item=>item.engine===engine&&item.level===level);
 const owners=new Map();
 for(const {tab,rows} of panels)for(const {key} of rows){
  if(!owners.has(key))owners.set(key,[]);owners.get(key).push(tab);
 }
 const repeated=[...owners].filter(([,tabs])=>tabs.length>1);
 const duplicate=(list)=>[...new Set(list.filter((value,i)=>list.indexOf(value)<i))];
 const perTab=panels.filter(row=>row.actions).map(row=>({tab:row.tab,actions:duplicate(row.actions.map(a=>a.binding)),ids:duplicate(row.ids),nestedRows:row.nestedRows})).filter(row=>row.actions.length||row.ids.length||row.nestedRows.length);
 console.log(engine,level,owners.size,'unique paths in',panels.length,'panels and motion groups');
 assert.deepEqual(repeated,[],engine+' '+level+' repeated setting');
 assert.deepEqual(perTab,[],engine+' '+level+' redundant actions, duplicate IDs or malformed labels');
}
