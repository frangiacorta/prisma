"""Real browser compatibility/recovery and a self-contained crown wallpaper offline."""
import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-fast-audit');errors=[];results={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(150000)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:print('BROWSER '+m.text[:400],flush=True) if m.type=='error' else None)
 hook=r'''(()=>{const original=HTMLCanvasElement.prototype.getContext;window.testContexts=[];window.completed=0;HTMLCanvasElement.prototype.getContext=function(...args){const result=original.apply(this,args);if(args[0]==='webgl2'&&this.id==='art'&&!window.testContexts.includes(result)){window.testContexts.push(result);const wait=result.clientWaitSync;result.clientWaitSync=function(...args){const v=wait.apply(this,args);if(v===this.ALREADY_SIGNALED||v===this.CONDITION_SATISFIED)window.completed++;return v;};}return result;};})();'''
 page.add_init_script(hook)
 page.goto('http://127.0.0.1:4185/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady===true')
 page.wait_for_function('window.completed>0 && document.querySelector("#render-error").hidden && !localStorage.getItem("prisma-render-pending-v1")')
 print('UI AND ACTUAL FRAME READY',flush=True);results['startup']=True
 # Exercise the triggering intermediate shape, keep it for recovery and offline HTML.
 page.locator('[data-tab="shape"]').click();field=page.locator('[data-number="petalAmount"]');field.fill('0.35');field.dispatch_event('input');field.dispatch_event('change')
 page.wait_for_function('JSON.parse(localStorage.getItem("prisma-current-v2")||"null")?.state.petalAmount===.35')
 page.wait_for_function('document.querySelector("#render-error").hidden && !localStorage.getItem("prisma-render-pending-v1")')
 page.screenshot(path=str(out/'compat-crown-editor.png'))
 before=page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2"))')
 page.locator('#favorite').click();page.wait_for_function('JSON.parse(localStorage.getItem("prisma-favorites-v2")||"[]").length===1')
 favorite=page.evaluate('JSON.parse(localStorage.getItem("prisma-favorites-v2"))')
 assert favorite[0]['state']['petalAmount']==.35;results['favoriteCrown']=True
 # Force a real context loss, restore it and preserve current project/gallery.
 page.evaluate('window.testContexts[0].getExtension("WEBGL_lose_context").loseContext()')
 page.wait_for_function('!document.querySelector("#render-error").hidden && document.querySelector("#render-error").textContent.includes("conservata")')
 page.get_by_role('button',name='Riprova anteprima',exact=True).click()
 page.wait_for_function('document.querySelector("#render-error").hidden && !localStorage.getItem("prisma-render-pending-v1")')
 assert page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2")).state')==before['state']
 assert page.evaluate('JSON.parse(localStorage.getItem("prisma-favorites-v2"))')==favorite
 print('REAL CROWN CONTEXT LOSS/RESTORE AND FAVORITE PRESERVATION PASS',flush=True);results['contextRecovery']=True
 # Old v12 failed boots must not permanently block the redesigned preview.
 page.evaluate('localStorage.setItem("prisma-render-pending-v1",JSON.stringify({pending:true,date:Date.now()}))')
 page.reload(wait_until='domcontentloaded');page.wait_for_function('window.prismaReady && window.completed>0 && document.querySelector("#render-error").hidden && !localStorage.getItem("prisma-render-pending-v1")')
 assert page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2")).state')==before['state']
 results['oldFailedBootMigration']=True;print('V12 FAILED BOOT MIGRATION PASS',flush=True)
 # A failure of this generation must still provide controlled recovery.
 page.evaluate('localStorage.setItem("prisma-render-pending-v1",JSON.stringify({pending:true,generation:"cached-geometry-1",date:Date.now()}))')
 page.reload(wait_until='domcontentloaded');page.wait_for_function('window.prismaReady===true')
 assert 'precedente anteprima' in page.locator('#render-error').inner_text()
 assert page.locator('#controls input').count()>0
 assert page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2")).state')==before['state']
 assert page.evaluate('JSON.parse(localStorage.getItem("prisma-favorites-v2"))')==favorite
 with page.expect_download() as d:page.get_by_role('button',name='Scarica progetto',exact=True).last.click()
 d.value.save_as(str(out/'compat-retained-project.json'))
 project=json.loads((out/'compat-retained-project.json').read_text());assert project.get('state',project)['petalAmount']==.35,project.keys()
 page.get_by_role('button',name='Riprova anteprima',exact=True).click()
 page.wait_for_function('document.querySelector("#render-error").hidden && !localStorage.getItem("prisma-render-pending-v1")')
 print('PROTECTED RELOAD AND PROJECT DOWNLOAD PASS',flush=True);results['safeReload']=True;results['projectDownload']=True
 # Real eight thumbnails use the same cheap geometry path, retaining saved favorites.
 page.locator('#similar').click();page.wait_for_function('document.querySelectorAll("#variants-grid .creation-card").length===8',timeout=150000)
 urls=page.locator('#variants-grid img').evaluate_all('(imgs)=>imgs.map(i=>i.src)');assert len(set(urls))==8
 page.locator('#variants-grid .creation-card').first.click();page.wait_for_function('!document.querySelector("#variants-dialog").open')
 results['variants']=8;print('REAL EIGHT CROWN VARIANTS PASS',flush=True)
 # Restore saved .35 crown before offline export; exact source has no network dependencies.
 page.locator('#gallery-open').click();page.locator('#gallery-grid .creation-card').first.click();page.wait_for_function('!document.querySelector("#gallery-dialog").open')
 page.locator('#export-open').click();page.locator('[data-export="wallpaper"]').click()
 with page.expect_download() as d:page.locator('#download').click()
 d.value.save_as(str(out/'compat-crown-wallpaper.html'))
 html=(out/'compat-crown-wallpaper.html').read_text();assert '"petalAmount":0.35' in html
 offline=b.new_page(viewport={'width':640,'height':480});offline.set_default_timeout(150000);offline.on('pageerror',lambda e:errors.append(str(e)))
 offline.route('**/*',lambda r:r.abort());offline.context.set_offline(True);offline.evaluate(hook);offline.set_content(html)
 offline.wait_for_function('window.completed>0 && document.querySelector("canvas").width>100 && [...document.querySelectorAll("div")].every(d=>d.hidden)',timeout=150000)
 offline.screenshot(path=str(out/'compat-crown-wallpaper-offline.png'));results['offlineCrownWallpaper']=True;print('OFFLINE CROWN WALLPAPER PASS',flush=True)
 assert not errors,errors;results['pageErrors']=errors
 (out/'compat-browser-results.json').write_text(json.dumps(results,indent=2));b.close()
