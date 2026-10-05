import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-command-fix');errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/description.js*',lambda r:r.fulfill(body=(out/'description-before.js').read_text(),content_type='text/javascript'))
 page.add_init_script('localStorage.setItem("prisma-current-v2",'+json.dumps((out/'vela-fixture.json').read_text())+');localStorage.setItem("prisma-preview-quality","fluid")')
 page.goto('http://127.0.0.1:4186/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady && document.querySelector("#render-error").hidden')
 results={};phrase='rendilo morbido nel movimento'
 for method in ['Applica','Enter']:
  page.locator('#creation-description').fill(phrase)
  if method=='Applica':page.locator('#description-apply').click()
  else:page.locator('#creation-description').press('Enter')
  page.wait_for_timeout(100);results[method]={'status':page.locator('#description-status').inner_text(),'kind':page.locator('#description-status').get_attribute('data-kind'),'state':page.evaluate('JSON.parse(localStorage.getItem("prisma-current-v2")).state')}
 page.screenshot(path=str(out/'commands-before.png'));b.close();(out/'commands-before.json').write_text(json.dumps({'results':results,'errors':errors},indent=2));print(json.dumps({k:{'status':v['status'],'kind':v['kind']} for k,v in results.items()},ensure_ascii=False));assert all('Non riconosciuto' in v['status'] for v in results.values());assert not errors,errors
