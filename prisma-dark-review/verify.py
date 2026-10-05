from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
import json, io, base64
out=Path('/workspace/prisma-dark-review')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);page.set_default_timeout(120000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('window.testTools={};Object.defineProperty(document,"modelContext",{value:{registerTool(t){testTools[t.name]=t}}});')
 page.goto('http://127.0.0.1:4173/',wait_until='networkidle');page.wait_for_function('document.querySelector("#art").width>250')
 state=lambda:page.evaluate('testTools.read_creation.execute()')
 original=state();page.locator('[data-tab=background]').click()
 assert page.locator('[data-backdrop]:visible').count()==12
 for i in range(8,20):
  page.locator(f'[data-backdrop="{i}"]').click();q=state()
  for k in ['volume','transparency','lights','motions','palette','environment','renderVersion']:assert q[k]==original[k],k
 page.locator('summary',has_text='Fondali chiari').click();assert page.locator('[data-backdrop]:visible').count()==20
 page.locator('[data-backdrop="0"]').click();assert state()['background']=='#d0dbea' and state()['bgWash']==.12
 page.locator('[data-backdrop="13"]').click();saved=state();assert saved['bgWash']==0 and saved['bgMode']=='studio'
 page.wait_for_timeout(700);page.reload(wait_until='networkidle');assert state()==saved
 page.locator('[data-tab=background]').click();page.screenshot(path=str(out/'fondali-scuri-editor.png'))
 page.locator('[data-backdrop="8"]').click();assert state()['background']=='#000000' and state()['bgMode']=='solid';page.locator('#undo').click();assert state()==saved;page.locator('#redo').click()
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/'fondali-scuri-mobile.png'));page.set_viewport_size({'width':1440,'height':1000})
 page.locator('#export-open').click();page.locator('#export-width').fill('128');page.locator('#export-width').dispatch_event('change');page.locator('#export-height').fill('128');page.locator('#export-height').dispatch_event('change')
 with page.expect_download(timeout=180000) as dl:page.locator('#download').click()
 dl.value.save_as(str(out/'nero-puro.png'));page.wait_for_function('!document.querySelector("#download").disabled')
 im=Image.open(out/'nero-puro.png');assert im.size==(128,128)
 for pt in [(0,0),(127,0),(0,127),(127,127)]:assert im.getpixel(pt)==(0,0,0,255),(pt,im.getpixel(pt))
 assert not errors,errors
 print('12 dark backgrounds, unchanged creation, 8 light backgrounds, restore, undo/redo, mobile, pure black PNG: PASS',flush=True)
 page.goto('http://127.0.0.1:4173/renderer.js')
 data=page.evaluate('''async()=>{
 const {Renderer}=await import('./renderer.js'),{newCreation}=await import('./creative-model.js'),{BACKDROPS,MATERIAL_STYLES}=await import('./studio-model.js');const r=new Renderer(document.createElement('canvas')),q=Object.assign(newCreation(),MATERIAL_STYLES[9].values,{palette:['#819bea','#e0a8d1','#a9d8dc'],scale:.85}),images=[];
 for(const bg of BACKDROPS.filter(b=>b.dark)){Object.assign(q,{bgMode:bg.mode||'studio',background:bg.colors[0],background2:bg.colors[1],bgHeight:-.65,bgSoftness:1.1,bgWash:bg.wash,bgShade:bg.shade});r.draw(q,0,240,280);const pix=r.pixels(),rgb=(x,y)=>Array.from(pix.slice((y*240+x)*4,(y*240+x)*4+3));images.push({name:bg.name,url:r.canvas.toDataURL(),top:rgb(5,5),bottom:rgb(5,275)});if(r.gl.getError())throw Error('GL background failed');}
 r.dispose();return images;}''')
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14);sheet=Image.new('RGB',(1040,980),'#17191e');d=ImageDraw.Draw(sheet)
 for i,q in enumerate(data):
  x=16+(i%4)*256;y=16+(i//4)*320;d.text((x,y),q['name'],font=font,fill='white');im=Image.open(io.BytesIO(base64.b64decode(q['url'].split(',')[1])));sheet.paste(im.convert('RGB'),(x,y+24))
 sheet.save(out/'fondali-scuri.png');(out/'dark-background-metrics.json').write_text(json.dumps([{k:v for k,v in q.items() if k!='url'} for q in data],indent=2))
 assert data[0]['top']==[0,0,0] and data[0]['bottom']==[0,0,0]
 assert all(max(q['top'])<=64 and max(q['bottom'])<30 for q in data[5:]),[{k:v for k,v in q.items() if k!='url'} for q in data[5:]]
 b.close();print('Actual rendered dark colors and gallery: PASS',flush=True)
