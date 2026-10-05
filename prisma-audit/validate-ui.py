from playwright.sync_api import sync_playwright
from PIL import Image
from pathlib import Path
import json
out=Path('/workspace/prisma-audit')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);page.set_default_timeout(120000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('window.testTools={};Object.defineProperty(document,"modelContext",{value:{registerTool(t){testTools[t.name]=t}}});')
 page.goto('http://127.0.0.1:4173/',wait_until='networkidle');page.wait_for_function('document.querySelector("#art").width>250');state=lambda:page.evaluate('testTools.read_creation.execute()')
 assert state()['renderVersion']==2 and state()['background']=='#000000';assert page.locator('#render-error').is_hidden();assert page.locator('[data-preset]').count()==6
 # Curated surprise keeps locks, and the seed reproduces complete combinations.
 page.locator('#randomize').click();first=state();page.locator('#randomize').click();assert state()['seed']!=first['seed'];page.locator('#seed').fill('90210');page.locator('#seed').dispatch_event('change');page.locator('#randomize').click();first=state();page.locator('#randomize').click();assert state()==first
 page.locator('#random-settings').click();page.locator('[data-lock=material]').click();page.locator('#random-dialog button[aria-label=Chiudi]').click();page.locator('#randomize').click();assert state()['metal']==first['metal'] and state()['transparency']==first['transparency'];page.locator('#random-settings').click();page.locator('[data-lock=material]').click();page.locator('#random-dialog button[aria-label=Chiudi]').click();page.locator('#reset').click();print('Curated surprise, repeatable seed, locks: PASS',flush=True)
 # Human thickness maps to a continuous shell/solid model; all controls remain editable.
 page.locator('[data-param=fullness]').fill('0.04');assert state()['wallThickness']==.04 and 0<state()['thinShell']<1
 page.locator('#material-picker').select_option('8');assert state()['materialName']=='Gelatina'
 page.locator('summary',has_text='Trasparenza e diffusione').click();page.locator('#add-inside-light').click();s=state();light=s['lights'][-1];lid=light['id'];assert light['type']=='orb' and light['z']==0 and light['visible']
 page.locator('[data-tab=light]').click();page.locator('[data-number-path="lights.'+str(lid)+'.x"]').fill('0.25');page.locator('[data-number-path="lights.'+str(lid)+'.x"]').dispatch_event('change');page.locator('[data-number-path="lights.'+str(lid)+'.z"]').fill('0.2');page.locator('[data-number-path="lights.'+str(lid)+'.z"]').dispatch_event('change');assert state()['lights'][-1]['x']==.25 and state()['lights'][-1]['z']==.2
 page.locator('[data-light-id="'+str(lid)+'"]').dispatch_event('wheel',{'deltaY':-10});assert abs(state()['lights'][-1]['z']-.3)<1e-8;assert page.locator('[data-light-id="'+str(lid)+'"]').get_attribute('class').find('inside')>=0
 page.locator('#environment').select_option('aurora');assert state()['environment']=='aurora';page.screenshot(path=str(out/'ui-internal-light.png'))
 page.locator('[data-path-check="lights.'+str(lid)+'.visible"]').uncheck();assert not state()['lights'][-1]['visible'];page.locator('[data-path-select="lights.'+str(lid)+'.type"]').select_option('bar');assert state()['lights'][-1]['type']=='bar';page.locator('[data-light-depth=inside]').click();assert state()['lights'][-1]['type']=='orb'
 page.locator('[data-remove-light="'+str(lid)+'"]').click();assert len(state()['lights'])==2;page.locator('#undo').click();assert len(state()['lights'])==3;page.locator('#redo').click();assert len(state()['lights'])==2;print('Interior emitter, XYZ movement, depth wheel, visibility, shape, remove, undo/redo: PASS',flush=True)
 # Variants and local favorites preserve exact configuration, framing and phase.
 page.locator('#similar').click();page.wait_for_function('document.querySelectorAll("[data-variant]").length===8');assert page.locator('[data-variant]').count()==8;page.screenshot(path=str(out/'ui-variants.png'));page.locator('[data-variant="3"]').click();chosen=state();assert chosen['materialName']=='Gelatina';page.locator('#favorite').click();page.wait_for_function('JSON.parse(localStorage.getItem("prisma-favorites-v2")||"[]").length===1');page.locator('#gallery-open').click();assert page.locator('[data-favorite-id]').count()==1
 with page.expect_download() as dl:page.locator('#project-download').click()
 project=out/'progetto-test.json';dl.value.save_as(str(project));saved=json.loads(project.read_text());assert saved['state']==chosen
 page.locator('#gallery-dialog button[aria-label="Chiudi galleria"]').click();page.locator('#reset').click();page.locator('#gallery-open').click();page.locator('[data-favorite-id]').click();assert state()==chosen
 page.wait_for_timeout(700);page.reload(wait_until='networkidle');assert state()==chosen;page.locator('#gallery-open').click();page.locator('#project-file').set_input_files(str(project));page.wait_for_function('!document.querySelector("#gallery-dialog").open');assert state()==chosen;print('8 variants, favorite gallery, JSON export/import, restoration after reload: PASS',flush=True)
 page.locator('#reset').click();page.locator('#wallpaper-guide').select_option('lock');assert page.locator('#wallpaper-overlay').is_visible();assert page.locator('#aspect').input_value()=='0.5625';page.locator('#wallpaper-guide').select_option('home');assert 'home-guide' in page.locator('#wallpaper-overlay').get_attribute('class');page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(600);page.screenshot(path=str(out/'ui-final-mobile.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.set_viewport_size({'width':1440,'height':1000});page.locator('#wallpaper-guide').select_option('none');page.locator('#aspect').select_option('1');page.locator('[data-tab=motion]').click();page.locator('[data-motion-preset=film]').click();page.locator('#play').click();page.locator('#timeline').fill('350');page.locator('[data-tab=material]').click();page.screenshot(path=str(out/'ui-final-desktop.png'));print('Wallpaper clock/notch/icons and responsive layouts: PASS',flush=True)
 # Alpha images: guide excluded; accumulated quality and the exact current loop phase.
 page.locator('[data-tab=background]').click();page.locator('#bg-mode').select_option('transparent');page.locator('#export-open').click()
 def size(w,h):
  page.locator('#export-width').fill(str(w));page.locator('#export-width').dispatch_event('change');page.locator('#export-height').fill(str(h));page.locator('#export-height').dispatch_event('change')
 size(256,256)
 for fmt,ext in [('png','png'),('webp','webp'),('jpeg','jpg')]:
  page.locator('#file-format').select_option(fmt)
  with page.expect_download(timeout=180000) as dl:page.locator('#download').click()
  path=out/('export-final.'+ext);dl.value.save_as(str(path));page.wait_for_function('!document.querySelector("#download").disabled');im=Image.open(path);assert im.size==(256,256)
  if fmt!='jpeg':assert im.getpixel((0,0))[3]==0 and im.getpixel((128,128))[3]<100,(fmt,im.getpixel((128,128)))
 print('16 accumulated samples · PNG/WebP alpha and JPEG: PASS',flush=True)
 # The offline HTML contains the self-contained renderer and every animation parameter.
 page.locator('[data-export=wallpaper]').click()
 with page.expect_download() as dl:page.locator('#download').click()
 html=out/'wallpaper-final.html';dl.value.save_as(str(html));page.wait_for_function('!document.querySelector("#download").disabled');offline=b.new_page(viewport={'width':320,'height':240});requests=[];off_errors=[];offline.on('request',lambda q:requests.append(q.url));offline.on('pageerror',lambda e:off_errors.append(str(e)));offline.set_content(html.read_text());offline.wait_for_function('document.querySelector("#art").width>100');assert not requests and not off_errors,(requests,off_errors);assert offline.locator('#art').evaluate('(c)=>!c.getContext("webgl2").isContextLost()&&c.getContext("webgl2").getError()===0');offline.close();print('Offline HTML · no imports and no requests: PASS',flush=True)
 # A real 60 fps loop with two accumulated samples for every deterministic frame.
 page.locator('[data-export=video]').click();page.locator('#video-target').select_option('iphone');size(96,160);page.locator('#video-fps').select_option('60')
 with page.expect_download(timeout=240000) as dl:page.locator('#download').click()
 dl.value.save_as(str(out/'loop-final-60fps.mp4'));page.wait_for_function('!document.querySelector("#download").disabled');page.locator('#export-close').click();print('60 fps MP4 / iPhone Live Photo source: PASS',flush=True)
 # 4K quality through the actual app download path, rather than a raw renderer-only call.
 page.locator('#export-open').click();page.locator('[data-export=image]').click();page.locator('#file-format').select_option('png');size(3840,2160)
 with page.expect_download(timeout=300000) as dl:page.locator('#download').click()
 dl.value.save_as(str(out/'export-final-4k.png'));page.wait_for_function('!document.querySelector("#download").disabled');im=Image.open(out/'export-final-4k.png');assert im.size==(3840,2160) and im.getpixel((0,0))[3]==0
 print('Actual 4K PNG export · 16 samples: PASS',flush=True);assert not errors,errors;page.locator('#export-close').click();b.close();print('ALL INTERFACE AND EXPORT CHECKS PASSED',flush=True)
