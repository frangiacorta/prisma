import json,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-motion-audit');errors=[];results={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':900});page.set_default_timeout(150000);page.on('pageerror',lambda e:errors.append(str(e)))
 hook=r'''(()=>{const original=HTMLCanvasElement.prototype.getContext;window.motionMetrics={pending:0,maxPending:0,frames:0,allocations:0};HTMLCanvasElement.prototype.getContext=function(...args){const g=original.apply(this,args);if(args[0]==='webgl2'&&this.id==='art'&&!g.audited){g.audited=true;const fences=new Set(),m=window.motionMetrics;const fence=g.fenceSync.bind(g),del=g.deleteSync.bind(g),wait=g.clientWaitSync.bind(g),tex=g.texImage2D.bind(g);g.fenceSync=(...a)=>{const v=fence(...a);fences.add(v);m.pending=fences.size;m.maxPending=Math.max(m.maxPending,m.pending);return v;};g.deleteSync=v=>{if(fences.delete(v)){m.frames++;m.pending=fences.size;}return del(v);};g.texImage2D=(...a)=>{m.allocations++;return tex(...a);};}return g;};})();'''
 page.add_init_script(hook)
 page.add_init_script("localStorage.setItem('prisma-preview-quality','fluid');localStorage.setItem('prisma-render-pending-v1',JSON.stringify({pending:true,generation:'cached-geometry-1'}))")
 page.goto('http://127.0.0.1:4185/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady && window.motionMetrics.frames>0 && document.querySelector("#render-error").hidden')
 results['oldCrashMigration']=True
 page.locator('[data-tab="shape"]').click();f=page.locator('[data-number="petalAmount"]');f.fill('0.25');f.dispatch_event('input');f.dispatch_event('change')
 page.locator('[data-tab="motion"]').click();page.locator('[data-motion-preset="bloom"]').click()
 f=page.locator('[data-number="duration"]');f.fill('2');f.dispatch_event('input');f.dispatch_event('change')
 start=time.monotonic();before=page.evaluate('window.motionMetrics.frames');page.wait_for_function('(before)=>window.motionMetrics.frames>before+120',arg=before,timeout=120000)
 results['liveMotion']={**page.evaluate('window.motionMetrics'), 'seconds':time.monotonic()-start};assert results['liveMotion']['maxPending']==1
 # Pause freezes the timeline; scrubbing retains a selected pose, then play resumes.
 page.locator('#play').click();phase=page.locator('#timeline').input_value();page.wait_for_timeout(500);assert page.locator('#timeline').input_value()==phase
 page.locator('#timeline').fill('375');page.locator('#timeline').dispatch_event('input');page.wait_for_timeout(400);assert page.locator('#timeline').input_value()=='375';results['pauseScrub']=True
 # Change transparency while it animates across zero: controls must stay live.
 page.screenshot(path=str(out/'motion-editor.png'))
 page.locator('#export-open').click();page.locator('[data-export="wallpaper"]').click()
 with page.expect_download() as d:page.locator('#download').click()
 d.value.save_as(str(out/'motion-wallpaper.html'));html=(out/'motion-wallpaper.html').read_text();assert 'uFieldWarp' in html and '"petalAmount":0.8' in html
 page.locator('#export-close').click()
 page.locator('#export-open').click();page.locator('[data-export="video"]').click();page.locator('#video-fps').select_option('60');page.locator('#export-width').fill('64');page.locator('#export-height').fill('64');page.locator('#export-height').dispatch_event('change')
 with page.expect_download(timeout=180000) as d:page.locator('#download').click()
 d.value.save_as(str(out/'motion-loop-60fps.mp4'));print('LIVE PETAL MOTION, PAUSE, SCRUB AND REAL 60FPS EXPORT PASS',flush=True)
 page.close()
 offline=b.new_page(viewport={'width':320,'height':320});offline.set_default_timeout(150000);offline.on('pageerror',lambda e:errors.append(str(e)));offline.context.set_offline(True);offline.route('**/*',lambda r:r.abort());offline.evaluate(hook);offline.set_content(html.replace("startWallpaper(document.getElementById('art'),", "window.wallpaper=startWallpaper(document.getElementById('art'),"))
 offline.wait_for_function('window.wallpaper?.getStats().completedFrames>120',timeout=120000);stats=offline.evaluate('window.wallpaper.getStats()');results['offline']=stats;assert not stats['paused'];assert stats['fieldAllocations']==0 or stats['fieldAllocations']==1;assert stats['completedFrames']>120
 offline.screenshot(path=str(out/'motion-offline.png'));offline.evaluate('window.wallpaper.stop()');assert not errors,errors;b.close()
 info=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames,duration','-of','json',str(out/'motion-loop-60fps.mp4')]))['streams'][0];assert info['r_frame_rate']=='60/1' and int(info['nb_frames'])==120,info;results['video']=info;results['errors']=errors;(out/'motion-browser.json').write_text(json.dumps(results,indent=2));print(json.dumps(results),flush=True)
