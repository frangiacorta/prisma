from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
import json, base64, io

out = Path('/workspace/prisma-bloom-review')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--use-angle=gl-egl', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'])
    page = browser.new_page(viewport={'width':1440, 'height':1000}, accept_downloads=True)
    page.set_default_timeout(120000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: print(m.text, flush=True) if m.type == 'log' else None)
    page.goto('http://127.0.0.1:4173/renderer.js')
    data = page.evaluate('''async beforeSource => {
      const {Renderer}=await import('./renderer.js'), {Renderer:Before}=await import(URL.createObjectURL(new Blob([beforeSource],{type:'text/javascript'}))), {preset}=await import('./model.js'), {newCreation,normalizeCreation}=await import('./creative-model.js'), {MATERIAL_STYLES,BACKDROPS}=await import('./studio-model.js');
      const r=new Renderer(document.createElement('canvas')), old=new Before(document.createElement('canvas')), metrics={compatibility:[]}, images=[];
      const difference=(a,b)=>a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0);
      const draw=(q,w=96,h=w)=>{r.draw(q,0,w,h,{preview:true});const a=r.pixels();if(r.gl.getError())throw Error('GL background draw failed');return a;};
      for(let i=0;i<6;i++){const q=preset(i);old.draw(q,0,96,96,{preview:true});metrics.compatibility.push(difference(old.pixels(),draw(q)));console.log('Previous preset '+i+' unchanged');}
      for(const index of [0,2,8]){const q=Object.assign(newCreation(),MATERIAL_STYLES[index].values);old.draw(q,0,96,96,{preview:true});metrics.compatibility.push(difference(old.pixels(),draw(q)));console.log('Modern material '+index+' unchanged');}
      const q=Object.assign(newCreation(),MATERIAL_STYLES[9].values,{palette:['#6b7ee9','#d38dbb','#91cbd5'],scale:.85,bgMode:'studio'});q.lights.forEach(l=>l.visible=false);
      for(const b of BACKDROPS){q.background=b.colors[0];q.background2=b.colors[1];draw(q,240,320);images.push({name:b.name,url:r.canvas.toDataURL()});}
      q.lights=[];q.positionX=5;q.bgWash=0;q.bgShade=0;q.background='#ffffff';q.background2='#000000';const a=draw(q,96,128),pixel=(x,y)=>Array.from(a.slice((y*96+x)*4,(y*96+x)*4+3));metrics.gradient={top:pixel(48,0),bottom:pixel(48,127)};
      q.bgHeight=.7;const high=draw(q,96,128);metrics.heightChange=difference(a,high);q.bgSoftness=2.5;metrics.softnessChange=difference(high,draw(q,96,128));
      Object.assign(q,{bgHeight:-.65,bgSoftness:1.1,bgWash:1,bgShade:.35});metrics.lightChange=difference(high,draw(q,96,128));
      const normalized=normalizeCreation(q);metrics.restored=['bgMode','bgHeight','bgSoftness','bgWash','bgShade'].every(k=>normalized[k]===q[k]);
      const clear=Object.assign(newCreation(),{bgMode:'transparent',iridescence:0,thinFilm:0,refraction:1,absorption:0,tintStrength:0,coat:0,dispersion:0});clear.lights=[];r.draw(clear,0,96,96);metrics.clearAlphaMax=Math.max(...r.pixels().filter((v,i)=>i%4===3));metrics.glError=r.gl.getError();r.dispose();old.dispose();return {metrics,images};
    }''', (out/'renderer-before.js').read_text())
    m = data['metrics']
    assert not errors and all(v == 0 for v in m['compatibility']), m
    assert m['gradient']['top'][0] == 255 and m['gradient']['bottom'][0] < 25, m
    assert min(m['heightChange'], m['softnessChange'], m['lightChange']) > 10000 and m['restored'], m
    assert m['clearAlphaMax'] == 0 and m['glError'] == 0, m
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    sheet = Image.new('RGB', (1040,760), '#17191e')
    d = ImageDraw.Draw(sheet)
    for i, item in enumerate(data['images']):
        x=16+(i%4)*256;y=16+(i//4)*372
        d.text((x,y),item['name'],font=font,fill='white')
        im=Image.open(io.BytesIO(base64.b64decode(item['url'].split(',')[1])))
        sheet.paste(im.convert('RGB'),(x,y+26))
    sheet.save(out/'fondali-morbidi.png')
    (out/'background-metrics.json').write_text(json.dumps(m,indent=2))
    print('Renderer, previous appearances, transparent export and 8 backdrops: PASS',flush=True)

    page.add_init_script('window.testTools={};Object.defineProperty(document,"modelContext",{value:{registerTool(t){testTools[t.name]=t}}});')
    page.goto('http://127.0.0.1:4173/',wait_until='networkidle')
    state=lambda:page.evaluate('testTools.read_creation.execute()')
    page.locator('[data-tab=background]').click()
    assert page.locator('[data-backdrop]').count()==8
    original=state()
    for i in range(8):
        page.locator(f'[data-backdrop="{i}"]').click()
        q=state();assert q['bgMode']=='studio'
        for key in ['lights','palette','volume','renderVersion','transparency','iridescence','motions']:
            assert q[key]==original[key],key
    page.locator('[data-backdrop="0"]').click()
    page.locator('[data-param=bgHeight]').fill('-0.4')
    page.locator('[data-param=bgHeight]').dispatch_event('change')
    page.locator('[data-param=bgSoftness]').fill('1.4')
    page.locator('[data-param=bgSoftness]').dispatch_event('change')
    saved=state();page.wait_for_timeout(700);page.reload(wait_until='networkidle')
    assert state()['bgHeight']==-.4 and state()['bgSoftness']==1.4 and state()['bgMode']=='studio'
    page.locator('[data-tab=background]').click()
    page.screenshot(path=str(out/'fondali-editor.png'))
    page.locator('[data-backdrop="2"]').click();page.locator('#undo').click();assert state()['background']==saved['background']
    page.locator('#redo').click();assert state()['background']=='#e8d6dc'
    page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/'fondali-mobile.png'));page.set_viewport_size({'width':1440,'height':1000})
    page.locator('[data-tab=material]').click();page.locator('#material-picker').select_option('2')
    page.locator('[data-tab=background]').click();assert state()['bgMode']=='studio'
    page.locator('#export-open').click()
    page.locator('#export-width').fill('128');page.locator('#export-width').dispatch_event('change');page.locator('#export-height').fill('128');page.locator('#export-height').dispatch_event('change')
    with page.expect_download(timeout=180000) as dl:page.locator('#download').click()
    dl.value.save_as(str(out/'fondale-export.png'));page.wait_for_function('!document.querySelector("#download").disabled')
    im=Image.open(out/'fondale-export.png');assert im.size==(128,128) and im.getpixel((0,0))[3]==255
    page.locator('[data-export=wallpaper]').click()
    with page.expect_download() as dl:page.locator('#download').click()
    html=out/'fondale-wallpaper.html';dl.value.save_as(str(html));page.wait_for_function('!document.querySelector("#download").disabled')
    assert '"bgMode":"studio"' in html.read_text()
    offline=browser.new_page(viewport={'width':240,'height':320});requests=[];offline.on('request',lambda req:requests.append(req.url));offline.set_content(html.read_text());offline.wait_for_function('document.querySelector("#art").width>100')
    assert not requests and offline.locator('#art').evaluate('c=>!c.getContext("webgl2").isContextLost()&&c.getContext("webgl2").getError()===0');offline.close()
    page.locator('#export-close').click();page.locator('[data-tab=motion]').click();page.locator('[data-motion-preset=reflect]').click();page.locator('#play').click()
    page.locator('#export-open').click();page.locator('[data-export=video]').click();page.locator('#video-target').select_option('iphone');page.locator('#export-width').fill('96');page.locator('#export-width').dispatch_event('change');page.locator('#export-height').fill('160');page.locator('#export-height').dispatch_event('change');page.locator('#video-fps').select_option('60')
    with page.expect_download(timeout=240000) as dl:page.locator('#download').click()
    dl.value.save_as(str(out/'fondale-loop-60fps.mp4'));page.wait_for_function('!document.querySelector("#download").disabled')
    assert not errors,errors
    browser.close();print('Background controls, undo/redo, persistence, mobile, PNG, offline HTML and 60 fps MP4: PASS',flush=True)
