import json,time,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-roots-audit'); errors=[]; result={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(150000);page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("localStorage.setItem('prisma-preview-quality','fluid')")
 page.goto('http://127.0.0.1:4186/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady && document.querySelector("#render-error").hidden')
 def command(text):
  page.locator('#creation-description').fill(text);page.locator('#description-apply').click();page.wait_for_timeout(650)
  msg=page.locator('#description-status').inner_text();assert 'Non ho riconosciuto' not in msg,msg
  return msg
 def state():return page.evaluate("JSON.parse(localStorage.getItem('prisma-current-v2')).state")
 result['command']=command('Radici nodose che entrano ed escono dalla sfera, sfondo nero')
 s=state();assert s['petalReentry']>0 and s['petalKnots']>0 and s['background']=='#000000',s
 page.locator('[data-tab="shape"]').click();assert page.locator('[data-number="volume"]').count()==1
 assert page.locator('[data-number="petalWander"]').count()==1
 page.screenshot(path=str(out/'roots-editor.png'))
 page.locator('[data-tab="motion"]').click();assert page.locator('[data-number="speed"]').is_visible();assert page.locator('[data-number="duration"]').is_visible()
 assert page.locator('[data-check="perfectLoop"]').is_checked()
 page.locator('[data-check="perfectLoop"]').uncheck()
 inp=page.locator('[data-number-path="motions.petalGrowth.cycles"]');assert inp.get_attribute('step')=='0.1'
 inp.evaluate("el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true}");inp.fill('0.5');inp.dispatch_event('input');inp.dispatch_event('change')
 page.locator('[data-check="perfectLoop"]').check();page.wait_for_timeout(650);assert state()['motions']['petalGrowth']['cycles']==1
 result['perfectLoopControls']=True
 result['motionCommand']=command('Falle comparire gradualmente e poi sparire')
 assert page.locator('#play').get_attribute('aria-label')=='Metti in pausa'
 page.locator('#play').click()
 page.locator('[data-tab="shape"]').click();page.locator('#perfect-sphere').click();page.wait_for_timeout(650);s=state();assert s['petalGrowth']==1 and all(s[k]==0 for k in ['petalWander','petalKnots','petalReentry','petalDisorder','petalRidges','petalCoil'])
 result['sphereReset']=True
 # Native app export path, 120 computed frames. Keep the scene small on software GPU.
 result['exportCommand']=command('Metallo');page.locator('[data-tab="motion"]').click();page.locator('[data-motion-preset="reflect"]').evaluate("el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true}");page.locator('[data-motion-preset="reflect"]').click()
 page.locator('[data-tab="motion"]').click();inp=page.locator('[data-number="duration"]');inp.fill('2');inp.dispatch_event('input');inp.dispatch_event('change')
 page.locator('#export-open').click();page.locator('[data-export="video"]').click();page.locator('#video-fps').select_option('60');page.locator('#export-width').fill('64');page.locator('#export-height').fill('64');page.locator('#export-height').dispatch_event('change')
 with page.expect_download(timeout=240000) as d:page.locator('#download').click()
 d.value.save_as(str(out/'editor-60fps.mp4'));result['videoBytes']=(out/'editor-60fps.mp4').stat().st_size
 assert not errors,errors;result['errors']=errors;b.close()
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames,duration','-of','json',str(out/'editor-60fps.mp4')]))['streams'][0];assert info['r_frame_rate']=='60/1' and int(info['nb_frames'])==120,info;result['video']=info
(out/'editor-check.json').write_text(json.dumps(result,indent=2,ensure_ascii=False));print(json.dumps(result,ensure_ascii=False),flush=True)
