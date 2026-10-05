from pathlib import Path
from playwright.sync_api import sync_playwright
import json,subprocess
out=Path('/workspace/prisma-description-audit')
s=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{newCreation,sculpt,material}from'./dist/creative-model.js';const s=newCreation();material(s,14);sculpt(s,3);s.scale=.7;console.log(JSON.stringify(s));"],cwd='/workspace/prisma-studio'))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':920});page.set_default_timeout(240000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('window.testTools={};Object.defineProperty(document,"modelContext",{value:{registerTool(t){testTools[t.name]=t}}});')
 page.add_init_script("if(!localStorage.getItem('text-test')){localStorage.setItem('prisma-current-v2',"+json.dumps(json.dumps({'state':s,'ratio':1,'phase':0}))+ ");localStorage.setItem('text-test','1');}")
 # Isolate UI and state QA from Mesa's expensive shader compilation. The production renderer is unchanged.
 page.route('**/renderer-real.js',lambda route:route.fulfill(path='/workspace/prisma-studio/dist/renderer.js',content_type='text/javascript'))
 page.route('**/renderer.js',lambda route:route.fulfill(body='import {Renderer as Base,fieldAt,sampleFrame} from "./renderer-real.js"; export {fieldAt,sampleFrame}; export class Renderer extends Base {draw(s,p,w,h){this.canvas.width=w;this.canvas.height=h;}}',content_type='text/javascript'))
 page.goto('http://127.0.0.1:4173/',wait_until='networkidle');read=lambda:page.evaluate('testTools.read_creation.execute()')
 page.wait_for_function('document.querySelector("#art").width>0');before=read()
 def command(t,enter=False):
  page.locator('#creation-description').fill(t)
  if enter:page.locator('#creation-description').press('Enter')
  else:page.locator('#description-apply').click()
 command('Spine più organiche e curve',True);r=read();assert r['petalBlend']>=.8 and r['petalCurl']>before['petalCurl'];assert r['palette']==before['palette'];assert page.locator('#description-status').inner_text().startswith('Modificati:')
 page.locator('#description-undo').click();assert read()==before
 command('Palette blu e viola, sfondo nero, Trasparenza 80%, metallo 25%');r=read();assert r['palette']==['#365eff','#ad75ff'] and r['background']=='#000000' and r['transparency']==.8 and r['metal']==.25
 page.locator('#undo').click();assert read()==before;page.locator('#redo').click();assert read()==r
 command('Aggiungi una barra neon rosa dietro');r=read();assert r['lights'][-1]['type']=='bar' and r['lights'][-1]['z']<0 and r['lights'][-1]['color']=='#ff69b4'
 page.locator('#creation-description').fill('Disegna una giraffa fotografica');page.locator('#description-apply').click();assert read()==r;assert 'Non ho riconosciuto' in page.locator('#description-status').inner_text()
 page.locator('[data-description="Spine più organiche e curve"]').click();assert page.locator('#creation-description').input_value()=='Spine più organiche e curve';page.locator('#description-apply').click();r=read()
 page.screenshot(path=str(out/'barra-desktop.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#description-apply').bounding_box()['y']<920
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#description-apply').bounding_box()['y']<600;assert page.locator('#art').bounding_box()['height']>=90;page.screenshot(path=str(out/'barra-mobile.png'))
 page.wait_for_timeout(600);page.reload(wait_until='networkidle');assert read()==r
 invalid=page.evaluate('''()=>{try{testTools.apply_description_plan.execute({operations:[{type:'set',key:'metal',value:.5},{type:'set',key:'notAParameter',value:1}]});return false;}catch{return true;}}''');assert invalid and read()==r
 page.evaluate('testTools.apply_description_plan.execute({operations:[{type:"set",key:"groundCaustic",value:0}]})');assert read()['groundCaustic']==0
 assert not errors,errors;b.close();print('Text entry, Enter, combined edits, palette, 3D light, single-step undo/redo, unknown commands, mobile, reload and atomic validation: PASS',flush=True)
