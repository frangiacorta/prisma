import json,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-export-fix-audit');errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':900});page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('localStorage.setItem("prisma-current-v2",'+json.dumps((out/'test-creation.json').read_text())+');localStorage.setItem("prisma-preview-quality","fluid")')
 page.goto('http://127.0.0.1:4186/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady && document.querySelector("#render-error").hidden');print('app ready',flush=True)
 page.locator('#export-open').click();page.locator('[data-export="video"]').click();page.locator('#video-fps').select_option('60');page.locator('#export-width').fill('64');page.locator('#export-height').fill('64');page.locator('#export-height').dispatch_event('change')
 meta=page.locator('#export-meta').inner_text();assert '25.0 s' in meta and '1500' in meta.replace('.', ''),meta
 started=time.monotonic()
 try:
  with page.expect_download(timeout=120000) as download:page.locator('#download').click()
 except Exception:
  print('EXPORT STATUS',page.locator('#export-message').inner_text(),page.locator('#progress-text').inner_text(),'ERRORS',errors,flush=True);page.screenshot(path=str(out/'export-timeout.png'));page.locator('#export-cancel').click();b.close();raise
 download.value.save_as(str(out/'app-25sec-60fps.mp4'));assert not errors,errors
 page.screenshot(path=str(out/'export-completed.png'));b.close()
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames,nb_read_frames,duration','-of','json',str(out/'app-25sec-60fps.mp4')]))['streams'][0]
 assert info['duration']=='25.000000' and info['nb_read_frames']=='1500' and info['r_frame_rate']=='60/1',info
 result={'meta':meta,'video':info,'seconds':time.monotonic()-started,'errors':errors};(out/'app-25sec-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
