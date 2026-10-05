import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-export-fix-audit');errors=[]
png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='
source=json.loads((out/'test-creation.json').read_text())
source['ratio']=9/16;source['phase']=1.234
state=source['state'];state['petalGrowth']=.65;state['petalCoil']=.45;state['palette']=['#123456','#abcdef','#ffeedd']
favorites=[dict(id=f'11111111-2222-3333-4444-{i:012d}',state=state,phase=1.234,ratio=9/16,thumbnail=png,date='2026-10-05T10:22:33.444Z') for i in range(1,4)]
init="""const originalContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:originalContext.call(this,kind,...args)};"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 a=b.new_context(accept_downloads=True,viewport={'width':1280,'height':1000});a.add_init_script(init)
 a.add_init_script('if(!localStorage.getItem("gallery-test-seeded")){localStorage.setItem("prisma-current-v2",'+json.dumps(json.dumps(source))+');localStorage.setItem("prisma-favorites-v2",'+json.dumps(json.dumps(favorites))+');localStorage.setItem("gallery-test-seeded","1")}')
 pa=a.new_page();pa.on('pageerror',lambda e:errors.append(str(e)));pa.goto('http://127.0.0.1:4186/',wait_until='domcontentloaded');pa.wait_for_function('window.prismaReady')
 pa.locator('#gallery-open').click();names=pa.locator('.favorite-name').evaluate_all('(els)=>els.map(e=>e.value)');dates=pa.locator('.favorite-date').all_text_contents();assert len(set(names))==3,names;assert all('22:33' in d for d in dates),dates
 first=pa.locator('.favorite-name').first;first.fill('Radici viola mie');first.press('Enter');assert pa.evaluate('JSON.parse(localStorage.getItem("prisma-favorites-v2"))[0].name')=='Radici viola mie'
 with pa.expect_download() as download:pa.locator('[data-export-favorite]').first.click()
 percard=download.value;percard.save_as(str(out/'gallery-card.json'));document=json.loads((out/'gallery-card.json').read_text());assert document['name']=='Radici viola mie';assert document['phase']==1.234 and document['ratio']==9/16;assert document['state']['palette']==state['palette']
 pa.locator('#project-name').fill('Trasferimento Chrome')
 pa.evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw new Error("denied")}}})')
 pa.locator('#project-copy').click();pa.locator('#project-copy-text').wait_for(state='visible');copied=json.loads(pa.locator('#project-copy-text').input_value());assert copied['name']=='Trasferimento Chrome' and copied['state']['palette']==state['palette'];assert pa.locator('#project-copy-text').evaluate('(el)=>el.selectionEnd-el.selectionStart')>100
 filenames=[]
 for i in range(2):
  with pa.expect_download() as download:pa.locator('#project-download').click()
  value=download.value;filenames.append(value.suggested_filename);value.save_as(str(out/f'gallery-current-{i}.json'))
 assert filenames[0]!=filenames[1],filenames
 pa.screenshot(path=str(out/'gallery-named.png'))
 pa.reload(wait_until='domcontentloaded');pa.wait_for_function('window.prismaReady');pa.locator('#gallery-open').click();assert pa.locator('.favorite-name').first.input_value()=='Radici viola mie'
 c=b.new_context(accept_downloads=True,viewport={'width':1280,'height':1000});c.add_init_script(init);pb=c.new_page();pb.on('pageerror',lambda e:errors.append(str(e)));pb.goto('http://127.0.0.1:4186/',wait_until='domcontentloaded');pb.wait_for_function('window.prismaReady');pb.locator('#gallery-open').click();assert pb.locator('.gallery-card').count()==0
 pb.locator('#project-file').set_input_files(str(out/'gallery-current-0.json'));pb.wait_for_function('document.querySelector("#art-name").textContent==="Trasferimento Chrome"');assert not pb.locator('#gallery-dialog').evaluate('(e)=>e.open')
 pb.locator('#export-open').click()
 pb.evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>{window.copiedPreset=text}}})')
 pb.locator('#export-copy-preset').click();pb.wait_for_function('!!window.copiedPreset');assert json.loads(pb.evaluate('window.copiedPreset'))['phase']==1.234;assert pb.locator('#export-copy-panel').is_hidden()
 with pb.expect_download() as download:pb.locator('#export-preset').click()
 download.value.save_as(str(out/'browser-b-reexport.json'));roundtrip=json.loads((out/'browser-b-reexport.json').read_text());original=json.loads((out/'gallery-current-0.json').read_text())
 for key in ['state','ratio','phase','name']:assert roundtrip[key]==original[key],key
 assert pb.locator('#render-error').is_visible();assert not errors,errors
 result={'passed':True,'sameDayNames':names,'dateTimes':dates,'renamePersisted':True,'cardExportName':document['name'],'uniqueCurrentFileNames':filenames,'isolatedBrowserRoundTrip':['state','ratio','phase','name'],'worksWithoutGPU':True,'copyFallbackSelected':True,'clipboardSuccess':True,'errors':errors}
 (out/'gallery-transfer-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True);b.close()
