import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('/workspace/prisma-root-export-fix')
fixture=json.loads((out/'user-preset.json').read_text())
errors=[];events=[]
def event(item):
    print(json.dumps(item,ensure_ascii=False),flush=True);events.append(item)
    (out/'preview-ui-events.json').write_text(json.dumps(events,indent=2))
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
    page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(90000)
    page.on('pageerror',lambda e:errors.append(str(e)))
    def app_route(route):
        source=Path('/workspace/prisma-studio/dist/app.js').read_text()
        route.fulfill(content_type='application/javascript',body=source+'\nwindow.qaRenderState=()=>({state:structuredClone(state),playing,dirty,refined,refining,idle:!!idleJob,generation:idleGeneration,revision:previewRevision,hidden:idleCanvas.hidden,width:idleCanvas.width,height:idleCanvas.height,label:document.querySelector("#preview-size").textContent,mainFrames:renderer?.completedFrames,idleFrames:idleRenderer?.completedFrames,lost:renderer?.gl.isContextLost(),idleLost:idleRenderer?.gl.isContextLost()});')
    page.route('**/app.js*',app_route)
    page.add_init_script('localStorage.setItem("prisma-preview-quality","fluid");localStorage.setItem("prisma-current-v2",'+json.dumps(json.dumps({'state':fixture['state'],'ratio':fixture['ratio'],'phase':fixture['phase']}))+')')
    page.goto('http://127.0.0.1:4186/',wait_until='domcontentloaded')
    page.wait_for_function('window.prismaReady && window.qaRenderState')
    def status():return page.evaluate('window.qaRenderState()')
    initial=status()['state'];event({'stage':'ready'})
    def refined(label,budget=120):
        started=time.monotonic();last=0
        while time.monotonic()-started<budget:
            s=status()
            if time.monotonic()-started-last>10:event({'stage':label,**{k:v for k,v in s.items() if k!='state'}});last=time.monotonic()-started
            assert not s['lost'] and not s['idleLost'],s
            if not s['hidden'] and not s['idle']:
                event({'stage':label+'-complete',**{k:v for k,v in s.items() if k!='state'}});return s
            page.wait_for_timeout(100)
        raise AssertionError({'timeout':label,'last':s})
    s=refined('initial');assert s['width']==640 and 358<=s['height']<=360,s;assert s['state']==initial
    page.screenshot(path=str(out/'preview-refined.png'))
    stableFrames=s['idleFrames'];page.wait_for_timeout(1200);assert status()['idleFrames']==stableFrames and not status()['idle'],'Static preview must not repeatedly schedule refinement'
    page.locator('#play').click();s=status();assert s['playing'] and s['hidden'],'Play must hide the static overlay immediately';event({'stage':'play-hides-overlay'})
    page.wait_for_timeout(250);assert status()['hidden'];page.locator('#play').click();page.wait_for_function('window.qaRenderState().idle',timeout=15000)
    page.locator('#creation-description').fill('sfondo nero');page.locator('#description-apply').click();assert status()['hidden'],'Edit must hide the old overlay';event({'stage':'edit-hides-overlay'})
    s=refined('edited');assert s['state']['background']=='#000000';assert s['width']==640
    page.locator('[data-preset="2"]').click();assert status()['hidden'],'Preset change must hide old overlay';event({'stage':'preset-hides-overlay'})
    s=refined('preset');assert s['state']!=initial
    page.locator('#export-open').click();page.wait_for_timeout(100);page.locator('#export-close').click()
    assert not errors,errors;event({'stage':'PASS','errors':errors});b.close()
