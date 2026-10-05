import json,subprocess
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-fast-audit');errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':900});page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:4185/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady && document.querySelector("#render-error").hidden')
 # Use the real controls and download implementation, including full-quality AA.
 page.locator('[data-tab="background"]').click();page.locator('#bg-mode').select_option('transparent');page.locator('#export-open').click()
 page.locator('#export-width').fill('96');page.locator('#export-height').fill('96');page.locator('#export-height').dispatch_event('change')
 with page.expect_download(timeout=120000) as d:page.locator('#download').click()
 d.value.save_as(str(out/'compat-transparent-export.png'));im=Image.open(out/'compat-transparent-export.png');assert im.size==(96,96);assert im.mode=='RGBA';assert im.getchannel('A').getextrema()[0]==0;assert im.getchannel('A').getextrema()[1]>0;print('PNG AND TRANSPARENT ALPHA PASS',flush=True)
 page.locator('#export-close').click();page.locator('[data-tab="motion"]').click();page.locator('[data-motion-preset="breathe"]').click()
 page.locator('[data-number="duration"]').fill('2');page.locator('[data-number="duration"]').dispatch_event('input');page.locator('[data-number="duration"]').dispatch_event('change');page.locator('#play').click()
 page.locator('#export-open').click();page.locator('[data-export="video"]').click();page.locator('#video-fps').select_option('60')
 page.locator('#export-width').fill('96');page.locator('#export-height').fill('96');page.locator('#export-height').dispatch_event('change')
 with page.expect_download(timeout=120000) as d:page.locator('#download').click()
 d.value.save_as(str(out/'compat-loop-60fps.mp4'));assert (out/'compat-loop-60fps.mp4').stat().st_size>1000;print('ACTUAL 60FPS MP4 DOWNLOAD PASS',flush=True)
 assert not errors,errors;b.close()
data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames,duration','-of','json',str(out/'compat-loop-60fps.mp4')]))['streams'][0]
assert data['r_frame_rate']=='60/1',data;assert int(data['nb_frames'])==120,data;assert data['width']==96 and data['height']==96,data
(out/'compat-export-results.json').write_text(json.dumps({'png':True,'transparent':True,'video':data},indent=2));print(json.dumps(data),flush=True)
