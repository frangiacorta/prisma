"""Exclusive GPU slot required. Output candidates stay in audit until visually approved."""
import base64,io,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-texture-audit');dist=Path('/workspace/prisma-studio/dist');errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.set_default_timeout(180000);page.on('console',lambda m:print(m.text,flush=True));page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/__texture_qa__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'))
 page.route('**/__before_texture.js',lambda r:r.fulfill(body=(out/'renderer-before.js').read_text(),content_type='text/javascript'))
 page.goto('http://127.0.0.1:4186/__texture_qa__')
 result=page.evaluate(r'''async()=>{
 const {Renderer}=await import('/renderer.js'),Old=await import('/__before_texture.js'),{preset,PRESETS}=await import('/model.js'),{newCreation,sculpt,material,textureStyle}=await import('/creative-model.js'),{TEXTURE_STYLES}=await import('/studio-model.js');
 const r=new Renderer(document.createElement('canvas')),old=new Old.Renderer(document.createElement('canvas'));const metrics={hardware:r.hardwareInfo(),compatibility:[],materials:[],sliders:[],loop:[]},images=[],thumbs=[];
 const draw=async(s,phase=0,options={preview:true,quality:'fast'},w=192,h=w,renderer=r)=>{const t=performance.now();await renderer.prepareAsync(s,phase,options);renderer.draw(s,phase,w,h,options);await renderer.waitForGpu();if(renderer.gl.getError()||renderer.gl.isContextLost())throw Error('WebGL failure');return {pixels:renderer.pixels(),ms:performance.now()-t};};
 const cmp=(a,b)=>{let total=0,max=0,changed=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);total+=d;max=Math.max(max,d);changed+=d>0;}return {difference:total,mean:total/a.length,max,changed};};
 const image=name=>images.push({name,url:r.canvas.toDataURL()});
 const cases=[...Array.from({length:3},(_,i)=>[PRESETS[i].name,preset(i)]),...[[14,'Opaque'],[1,'Glass'],[11,'Metal']].map(([i,name])=>{const s=newCreation();material(s,i);return [name,s];})];
 for(const [name,s] of cases){const a=await draw(s,0,{quality:'full'},64,64,old),bb=await draw(s,0,{quality:'full'},64,64);const row={name,...cmp(a.pixels,bb.pixels)};metrics.compatibility.push(row);console.log('COMPAT '+JSON.stringify(row));}
 old.dispose();
 for(const [i,name] of [[14,'Opaque'],[1,'Glass'],[11,'Metal']]){
  const s=newCreation();material(s,i);s.grounding=0;s.background='#0d1118';s.palette=['#ad8b68','#8ac6c0','#dbbfc6'];
  const before=await draw(s);image(name+' smooth');
  for(let style=0;style<TEXTURE_STYLES.length;style++){textureStyle(s,style);const after=await draw(s);image(name+' '+TEXTURE_STYLES[style].name);const row={material:name,style:TEXTURE_STYLES[style].name,...cmp(before.pixels,after.pixels)};metrics.materials.push(row);console.log('MATERIAL '+JSON.stringify(row));}
 }
 const shape=sculpt(newCreation(),4);material(shape,11);textureStyle(shape,0);await draw(shape);const counters={bakes:r.bakeUploads||0,growth:r.growthUploads||0,roots:r.rootUploads||0,programs:r.programs.size,allocations:r.fieldAllocations||0};
 for(const key of ['textureDepth','textureScale','textureOrganic','textureAngle','textureWrinkles','textureFolds','textureWear','textureRipples','surfaceTexture']){const s={...shape,[key]:key==='textureAngle'?77:key==='textureScale'?2.5:.8};const frame=await draw(s);metrics.sliders.push({key,ms:frame.ms});}
 metrics.cache={bakes:(r.bakeUploads||0)-counters.bakes,growth:(r.growthUploads||0)-counters.growth,roots:(r.rootUploads||0)-counters.roots,programs:r.programs.size-counters.programs,allocations:(r.fieldAllocations||0)-counters.allocations};console.log('CACHE '+JSON.stringify(metrics.cache));
 for(let i=3;i<6;i++){const s=preset(i);await draw(s,0,{preview:true,quality:'balanced'},192,113);image(PRESETS[i].name);thumbs.push({index:i,name:PRESETS[i].name,png:r.canvas.toDataURL(),webp:r.canvas.toDataURL('image/webp',.94)});}
 const close=newCreation();material(close,11);textureStyle(close,1);Object.assign(close.motions.rotateY,{enabled:true,cycles:1,mode:'cycle'});const a=await draw(close,0),bb=await draw(close,Math.PI*2);metrics.loop.push(cmp(a.pixels,bb.pixels));
 r.dispose();return {metrics,images,thumbs,offlineState:close};
 }''')
 (out/'texture-render-results.json').write_text(json.dumps(result['metrics'],indent=2))
 for item in result['thumbs']:
  (out/f'preset-{item["index"]}.png').write_bytes(base64.b64decode(item['png'].split(',')[1]));(out/f'preset-{item["index"]}.webp').write_bytes(base64.b64decode(item['webp'].split(',')[1]))
 pics=result['images'];sheet=Image.new('RGB',(3*260,((len(pics)+2)//3)*234),'#20232a');d=ImageDraw.Draw(sheet);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
 for i,item in enumerate(pics):
  x=i%3*260;y=i//3*234;d.text((x+7,y+7),item['name'],font=font,fill='white');im=Image.open(io.BytesIO(base64.b64decode(item['url'].split(',')[1]))).convert('RGB');sheet.paste(im,(x+30,y+30))
 sheet.save(out/'texture-materials-comparison.png')
 page.close();context=b.new_context(offline=True,viewport={'width':192,'height':192});offline=context.new_page();offline.route('**/*',lambda r:r.abort());offline.on('pageerror',lambda e:errors.append(str(e)))
 html='<html><style>html,body{margin:0;width:100%;height:100%;background:black}canvas{width:100%;height:100%}</style><canvas id="art"></canvas><script type="module">'+dist.joinpath('renderer.js').read_text()+'\nwindow.wallpaper=startWallpaper(document.querySelector("canvas"),'+json.dumps(result['offlineState'])+');</script></html>'
 (out/'texture-wallpaper.html').write_text(html);offline.set_content(html);offline.wait_for_function('window.wallpaper?.getStats().completedFrames>=8',timeout=120000);result['metrics']['offline']=offline.evaluate('window.wallpaper.getStats()');offline.screenshot(path=str(out/'texture-offline.png'));offline.evaluate('window.wallpaper.stop()');b.close()
 m=result['metrics'];m['errors']=errors;(out/'texture-render-results.json').write_text(json.dumps(m,indent=2));print(json.dumps(m,indent=2),flush=True)
 assert all(x['difference']==0 for x in m['compatibility']),m['compatibility'];assert all(x['mean']>.05 for x in m['materials']),m['materials'];assert all(v==0 for v in m['cache'].values()),m['cache'];assert m['loop'][0]['mean']<.05,m['loop'];assert not errors,errors
 print('TEXTURE DEFAULTS, 3 MATERIALS, NINE CONTROLS WITH ZERO REBAKES, NEW THUMBNAILS AND OFFLINE PASS',flush=True)
