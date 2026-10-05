import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-texture-audit');states=json.loads((out/'old-states.json').read_text());initial=next(x['state'] for x in states if x['name']=='opaque');errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('localStorage.setItem("prisma-current-v2",'+json.dumps(json.dumps({'state':initial,'ratio':1,'phase':0}))+');localStorage.setItem("prisma-preview-quality","fluid")')
 page.goto('http://127.0.0.1:4186/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady && document.querySelector("#render-error").hidden');page.locator('[data-tab="material"]').click();page.locator('summary',has_text='Texture organica').click()
 keys=['textureDepth','textureScale','textureOrganic','textureAngle','textureWrinkles','textureFolds','textureWear','textureRipples','surfaceTexture'];assert all(page.locator('[data-number="'+k+'"]').count()==1 for k in keys)
 page.locator('[data-texture-style="0"]').click();page.wait_for_function('JSON.parse(localStorage.getItem("prisma-current-v2")).state.textureWrinkles>.5');active=page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2")).state');assert active['renderVersion']==2
 page.screenshot(path=str(out/'texture-editor.png'))
 page.locator('summary',has_text='Materiali precedenti').click();page.locator('[data-legacy-material="2"]').click();page.wait_for_function('JSON.parse(localStorage.getItem("prisma-current-v2")).state.materialName==="Cromo"');legacy=page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2")).state');assert legacy['renderVersion']==2
 for key in keys[:-1]:assert active[key]==legacy[key],key
 page.locator('#reset-texture').click();page.wait_for_function('JSON.parse(localStorage.getItem("prisma-current-v2")).state.textureWrinkles===0');reset=page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2")).state');assert all(reset[k]==0 for k in ['textureWrinkles','textureFolds','textureWear','textureRipples','surfaceTexture'])
 page.locator('[data-legacy-material="2"]').click();page.wait_for_function('JSON.parse(localStorage.getItem("prisma-current-v2")).state.renderVersion===1')
 assert not errors,errors;b.close();(out/'texture-ui-results.json').write_text(json.dumps({'controls':keys,'styleApplied':True,'textureKeptOnLegacyMaterial':True,'legacyWithTextureVersion':legacy['renderVersion'],'resetClearsAllWeights':True,'legacyAfterResetVersion':1,'errors':errors},indent=2));print('UI STYLE, LEGACY-MATERIAL PRESERVATION AND RESET PASS')
