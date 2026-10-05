import json,time,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-root-export-fix');fixture=json.loads((out/'user-preset.json').read_text());events=[];errors=[]
def event(item):
 print(json.dumps(item,ensure_ascii=False),flush=True);events.append(item);(out/'export-ui-events.json').write_text(json.dumps(events,indent=2))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=b.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
 def app_route(route):
  source=Path('/workspace/prisma-studio/dist/app.js').read_text()
  route.fulfill(content_type='application/javascript',body=source+'\nwindow.qaExport=()=>({state:structuredClone(state),busy,playing,phase,idle:!!idleJob,programs:exportRenderer?[...exportRenderer.programs.keys()]:[],width:exportRenderer?.canvas.width,height:exportRenderer?.canvas.height,contextLost:exportRenderer?.gl.isContextLost(),pending:!!exportRenderer?.completionSync});window.qaExportIdentity=()=>exportRenderer;')
 page.route('**/app.js*',app_route);page.add_init_script('localStorage.setItem("prisma-preview-quality","fluid");localStorage.setItem("prisma-current-v2",'+json.dumps(json.dumps({'state':fixture['state'],'ratio':fixture['ratio'],'phase':fixture['phase']}))+')')
 page.goto('http://127.0.0.1:4186/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady && window.qaExport');page.locator('#export-open').click();initial=page.evaluate('window.qaExport().state')
 def size(w,h):
  page.locator('#export-width').fill(str(w));page.locator('#export-height').fill(str(h));page.locator('#export-height').dispatch_event('change')
 def download(name,timeout=240000):
  start=time.monotonic();event({'stage':'download-start','name':name})
  with page.expect_download(timeout=timeout) as info:page.locator('#download').click()
  d=info.value;d.save_as(out/name);page.wait_for_function('!window.qaExport().busy',timeout=30000);s=page.evaluate('window.qaExport()');assert s['width']==1 and s['height']==1 and not s['contextLost'] and not s['pending'],s
  event({'stage':'download-complete','name':name,'seconds':time.monotonic()-start,'bytes':(out/name).stat().st_size,'programs':s['programs'],'surface':[s['width'],s['height']],'message':page.locator('#export-message').inner_text()});return s
 size(128,72);s=download('user-roots-128.png');assert s['state']==initial;page.evaluate('window.previousExportRenderer=window.qaExportIdentity()');s=download('user-roots-128-repeat.png');assert s['state']==initial;assert page.evaluate('window.previousExportRenderer===window.qaExportIdentity()'),'Second export must reuse renderer and programs';assert (out/'user-roots-128.png').read_bytes()==(out/'user-roots-128-repeat.png').read_bytes(),'Same static source/phase exports identical PNG'
 page.screenshot(path=str(out/'export-success.png'))
 page.locator('#export-close').click();page.locator('#creation-description').fill('rendilo morbido nel movimento, durata 2, velocità 2');page.locator('#description-apply').click();s=page.evaluate('window.qaExport()');assert s['state']['duration']==2 and s['state']['speed']==2 and any(t['enabled'] for t in s['state']['motions'].values()),s
 if s['playing']:page.locator('#play').click()
 page.locator('#export-open').click();page.locator('[data-export="video"]').click();size(128,72);page.locator('#video-fps').select_option('60');download('user-roots-gentle-60fps.mp4');assert page.evaluate('window.previousExportRenderer===window.qaExportIdentity()'),'Video should also reuse the warm renderer'
 assert not errors,errors;event({'stage':'PASS','errors':errors});b.close()
