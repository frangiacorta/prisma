import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-regression-audit');errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(90000)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:print('BROWSER '+m.text[:400],flush=True) if m.type=='error' else None)
 page.add_init_script('''(()=>{const original=HTMLCanvasElement.prototype.getContext;window.testContexts=[];HTMLCanvasElement.prototype.getContext=function(...args){const result=original.apply(this,args);if(args[0]==='webgl2'&&this.id==='art'&&!window.testContexts.includes(result))window.testContexts.push(result);return result;};})();''')
 page.goto('http://127.0.0.1:4183/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady===true')
 print('UI READY',flush=True);page.wait_for_function('document.querySelector("#render-error").hidden && !localStorage.getItem("prisma-render-pending-v1")')
 print('ACTUAL FIRST FRAME COMPLETED',flush=True);page.screenshot(path=str(out/'editor-corrected.png'))
 # Recover a real WebGL loss without navigation or clearing the creation.
 before=page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2"))')
 page.evaluate('window.testContexts[0].getExtension("WEBGL_lose_context").loseContext()')
 page.wait_for_function('!document.querySelector("#render-error").hidden && document.querySelector("#render-error").textContent.includes("conservata")')
 page.locator('#render-error button').filter(has_text='Scarica progetto').wait_for()
 page.get_by_role('button',name='Riprova anteprima',exact=True).click()
 page.wait_for_function('document.querySelector("#render-error").hidden && !localStorage.getItem("prisma-render-pending-v1")')
 assert page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2")).state')==before['state']
 print('REAL CONTEXT LOSS/RESTORE PASS',flush=True)
 # A previous failed boot must show the retained project rather than draw it automatically.
 page.evaluate('localStorage.setItem("prisma-render-pending-v1",JSON.stringify({pending:true,date:Date.now()}))')
 page.reload(wait_until='domcontentloaded');page.wait_for_function('window.prismaReady===true')
 assert 'precedente anteprima' in page.locator('#render-error').inner_text()
 assert page.locator('#controls input').count()>0
 assert page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2")).state')==before['state']
 page.screenshot(path=str(out/'avvio-recuperabile.png'))
 with page.expect_download() as d:page.get_by_role('button',name='Scarica progetto',exact=True).last.click()
 d.value.save_as(str(out/'retained-project.json'))
 page.get_by_role('button',name='Riprova anteprima',exact=True).click()
 page.wait_for_function('document.querySelector("#render-error").hidden && !localStorage.getItem("prisma-render-pending-v1")')
 print('PROTECTED RELOAD AND PROJECT DOWNLOAD PASS',flush=True)
 page.locator('#favorite').click();page.wait_for_function('JSON.parse(localStorage.getItem("prisma-favorites-v2")||"[]").length===1')
 page.locator('#similar').click();page.wait_for_function('document.querySelectorAll("#variants-grid .creation-card").length===8',timeout=120000)
 urls=page.locator('#variants-grid img').evaluate_all('(imgs)=>imgs.map(i=>i.src)');assert len(set(urls))==8
 page.locator('#variants-grid .creation-card').first.click();page.wait_for_function('!document.querySelector("#variants-dialog").open');print('REAL FAVORITE AND EIGHT VARIANTS PASS',flush=True)
 # Export the actual standalone runtime, then load it while all network is blocked.
 page.locator('#export-open').click();page.locator('[data-export="wallpaper"]').click()
 with page.expect_download() as d:page.locator('#download').click()
 d.value.save_as(str(out/'corrected-wallpaper.html'))
 offline=b.new_page(viewport={'width':640,'height':480});offline.on('pageerror',lambda e:errors.append(str(e)))
 offline.route('**/*',lambda r:r.abort())
 offline.context.set_offline(True)
 offline.set_content((out/'corrected-wallpaper.html').read_text())
 offline.wait_for_function('document.querySelector("canvas").width>100 && [...document.querySelectorAll("div")].every(d=>d.hidden)',timeout=90000)
 offline.screenshot(path=str(out/'wallpaper-offline.png'));print('OFFLINE EXPORTED WALLPAPER PASS',flush=True)
 # The intentional context loss logs an error; it must not produce a JS pageerror.
 assert not errors,errors
 (out/'browser-results.json').write_text(json.dumps({'startup':True,'contextRecovery':True,'safeReload':True,'projectDownload':True,'favorites':True,'variants':8,'offlineWallpaper':True,'pageErrors':errors},indent=2));b.close()
