import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-command-fix');fixture=json.loads((out/'vela-fixture.json').read_text());errors=[];result={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(90000);page.on('pageerror',lambda e:errors.append(str(e)))
 # Register the browser's existing read-only tool to inspect actual in-memory state.
 # This does not bypass the text textarea, Enter, submit button or validated operations.
 page.add_init_script('window.qaTools={};Object.defineProperty(document,"modelContext",{value:{registerTool:tool=>{window.qaTools[tool.name]=tool;}}});localStorage.setItem("prisma-preview-quality","fluid")')
 page.add_init_script('localStorage.setItem("prisma-current-v2",'+json.dumps(json.dumps(fixture))+')')
 page.goto('http://127.0.0.1:4186/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady && window.qaTools.read_creation && document.querySelector("#render-error").hidden')
 def state():return page.evaluate('window.qaTools.read_creation.execute()')
 def submit(text,method='Applica'):
  page.locator('#creation-description').fill(text)
  if method=='Enter':page.locator('#creation-description').press('Enter')
  else:page.locator('#description-apply').click()
  return {'status':page.locator('#description-status').inner_text(),'kind':page.locator('#description-status').get_attribute('data-kind'),'state':state(),'play':page.locator('#play').get_attribute('aria-label')}
 initial=state();keys=page.evaluate('async()=>{const {GROUPS}=await import("/model.js");return [...GROUPS.shape,...GROUPS.material,...GROUPS.color,...GROUPS.background];}')
 for method in ['Applica','Enter']:
  got=submit('rendilo morbido nel movimento',method);assert got['kind']=='success' and 'Non riconosciuto' not in got['status'],got;assert got['play']=='Metti in pausa',got
  assert any(t['enabled'] for t in got['state']['motions'].values()),got
  for key in keys:assert got['state'][key]==initial[key],f'{method}: base changed {key}'
  assert got['state']['duration']==initial['duration'];result[method]={'status':got['status'],'state':got['state'],'play':got['play']}
  phase=page.locator('#timeline').input_value();page.wait_for_function('(phase)=>document.querySelector("#timeline").value!==phase',arg=phase,timeout=10000)
  if method=='Enter':page.screenshot(path=str(out/'commands-success.png'))
  page.locator('#description-undo').click();assert state()==initial,'Undo must restore the original creation';assert page.locator('#play').get_attribute('aria-label')=='Avvia animazione','Undo to static creation stops playback';result['undo_'+method]={'status':page.locator('#description-status').inner_text(),'stateRestored':True,'play':page.locator('#play').get_attribute('aria-label')}
 # Import a state with several independent animation tracks via the saved project,
 # then reload normally so model normalization and controls use production paths.
 multi=json.loads(json.dumps(initial));multi['duration']=27.5;multi['speed']=.75;multi['motion']=.42
 for key,cycles,phase,amplitude in [('rotateY',2,37,45),('volume',3,123,.08),('gradientOffset',2,28,.3)]:multi['motions'][key].update(enabled=True,cycles=cycles,phase=phase,amplitude=amplitude,curve='triangle',mode='wave',direction=-1)
 for key,cycles,phase in [('orbit',2,29),('pulse',3,11)]:multi['lights'][0][key].update(enabled=True,cycles=cycles,phase=phase,curve='triangle',direction=-1)
 page.evaluate('(saved)=>localStorage.setItem("prisma-current-v2",JSON.stringify(saved))',{'state':multi,'ratio':1,'phase':.8})
 # The fixture initializer runs on every navigation; replace it by routing a new page
 # in the same browser context without that initializer.
 context=b.new_context(viewport={'width':1440,'height':1000});multi_page=context.new_page();multi_page.set_default_timeout(90000);multi_page.on('pageerror',lambda e:errors.append(str(e)));multi_page.add_init_script('window.qaTools={};Object.defineProperty(document,"modelContext",{value:{registerTool:tool=>{window.qaTools[tool.name]=tool;}}});localStorage.setItem("prisma-preview-quality","fluid");localStorage.setItem("prisma-current-v2",'+json.dumps(json.dumps({'state':multi,'ratio':1,'phase':.8}))+')');page.close();page=multi_page
 page.goto('http://127.0.0.1:4186/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady && window.qaTools.read_creation && document.querySelector("#render-error").hidden');before=state();got=submit('rendilo morbido nel movimento');after=got['state'];assert got['kind']=='success',got
 assert after['duration']==before['duration'];assert after['perfectLoop']==before['perfectLoop']
 for key,t in before['motions'].items():
  assert after['motions'][key]['enabled']==t['enabled'],key+' active track changed'
  for parameter in ['cycles','phase','mode','direction']:assert after['motions'][key][parameter]==t[parameter],key+' '+parameter
  if t['enabled']:assert after['motions'][key]['curve']=='sine',key+' smooth curve'
 for index,l in enumerate(before['lights']):
  for track in ['orbit','pulse']:
   for parameter in ['cycles','phase','mode','direction','enabled']:assert after['lights'][index][track][parameter]==l[track][parameter],track+' '+parameter
   if l[track]['enabled']:assert after['lights'][index][track]['curve']=='sine',track+' smooth curve'
 for key in keys:assert after[key]==before[key],key+' existing animation base changed'
 result['multiTrack']={'status':got['status'],'before':before,'after':after}
 # Regression: ordinary typed material detail and palette changes remain functional.
 got=submit('più grinze','Enter');assert got['kind']=='success',got;assert got['state']['textureWrinkles']>after['textureWrinkles'];result['texture']={'status':got['status'],'before':after['textureWrinkles'],'after':got['state']['textureWrinkles']}
 got=submit('palette blu e viola, sfondo nero');assert got['kind']=='success',got;assert len(got['state']['palette'])==2 and got['state']['palette']!=after['palette'] and got['state']['background']=='#000000';result['palette']={'status':got['status'],'palette':got['state']['palette'],'background':got['state']['background']}
 assert not errors,errors;page.close();b.close();result['errors']=errors;(out/'commands-after.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v.get('status',v) if isinstance(v,dict) else v for k,v in result.items() if k not in ['multiTrack']},ensure_ascii=False));print('EXACT PHRASE CLICK/ENTER, GENTLE MOTION, BASE PRESERVATION, UNDO, MULTITRACK, TEXTURE AND PALETTE PASS')
