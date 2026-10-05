"""Run only with the exclusive software-GPU QA slot granted by root."""
import base64,io,json,time
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-roots-audit');dist=Path('/workspace/prisma-studio/dist');errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=browser.new_page(viewport={'width':600,'height':500});page.set_default_timeout(180000)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:print(m.text,flush=True))
 page.route('**/__roots_qa__',lambda r:r.fulfill(body='<html><body></body></html>',content_type='text/html'))
 page.route('**/__before_renderer.js',lambda r:r.fulfill(body=(out/'renderer-before.js').read_text(),content_type='text/javascript'))
 page.route('**/__old_states.json',lambda r:r.fulfill(body=(out/'old-states.json').read_text(),content_type='application/json'))
 page.goto('http://127.0.0.1:4186/__roots_qa__')
 result=page.evaluate(r'''async()=>{
 const {Renderer,sampleFrame}=await import('/renderer.js'),Old=await import('/__before_renderer.js'),{newCreation,sculpt,material,motionPreset}=await import('/creative-model.js');
 const r=new Renderer(document.createElement('canvas')),old=new Old.Renderer(document.createElement('canvas'));const metrics={hardware:r.hardwareInfo(),compatibility:[],quality:[],controls:[],loop:[],motion:[]},images=[];
 const draw=async(s,phase=0,opts={preview:true,quality:'fast'},size=96,renderer=r)=>{const t=performance.now();await renderer.prepareAsync(s,phase,opts);renderer.draw(s,phase,size,size,opts);await renderer.waitForGpu();if(renderer.gl.getError()||renderer.gl.isContextLost())throw Error('WebGL failure');return {pixels:renderer.pixels(),ms:performance.now()-t};};
 const image=name=>images.push({name,url:r.canvas.toDataURL()});
 const compare=(a,b)=>{let difference=0,max=0,union=0,intersection=0,litA=0,litB=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);difference+=d;max=Math.max(max,d);}for(let i=0;i<a.length;i+=4){const aa=a[i+3]>127,bb=b[i+3]>127;litA+=aa;litB+=bb;if(aa||bb)union++;if(aa&&bb)intersection++;}return {difference,mean:difference/a.length,max,iou:intersection/Math.max(1,union),litA,litB};};
 const states=await(await fetch('/__old_states.json')).json();
 for(const entry of states.filter((_,i)=>i<6||i===8||i===10)){
  const state=entry.state;for(const k of ['petalGrowth','petalWander','petalCoil','petalReentry','petalKnots','petalRidges','petalDisorder'])delete state[k];
  const options=state.renderVersion>=2?{quality:'full',normalDiagnostic:true}:{quality:'full'};
  const before=await draw(state,0,options,64,old),after=await draw(state,0,options,64);
  const row={name:entry.name,...compare(before.pixels,after.pixels)};metrics.compatibility.push(row);console.log('COMPAT '+JSON.stringify(row));
 }
 old.dispose();
 for(const [index,name] of [[4,'Radici'],[5,'Corde'],[6,'Rigonfiamenti'],[7,'Radici intrecciate']]){
  const state=sculpt(newCreation(),index);material(state,14);state.scale=.8;state.bgMode='transparent';
  const exact=await draw(state,0,{quality:'full',normalDiagnostic:true},128);image(name+' exact');
  const fast=await draw(state,0,{preview:true,quality:'fast',normalDiagnostic:true},128);image(name+' fast');
  const balanced=await draw(state,0,{preview:true,quality:'balanced',normalDiagnostic:true},128);image(name+' balanced');
  const row={name,fast:compare(exact.pixels,fast.pixels),balanced:compare(exact.pixels,balanced.pixels),exactMs:exact.ms,fastMs:fast.ms};metrics.quality.push(row);console.log('QUALITY '+JSON.stringify(row));
  state.bgMode='solid';state.background='#07100c';state.palette=['#dda069','#8ca685','#accaba'];state.metal=.05;state.roughness=.32;state.gloss=.65;state.transparency=0;state.subsurface=.2;
  await draw(state,0,{preview:true,quality:'balanced'},192);image(name+' material');
 }
 const root=sculpt(newCreation(),4);material(root,14);root.bgMode='transparent';
 for(const key of ['petalGrowth','petalWander','petalCoil','petalReentry','petalKnots','petalRidges','petalDisorder']){
  const a={...root,[key]:0},b={...root,[key]:1};
  const zero=await draw(a,0,{preview:true,quality:'balanced',normalDiagnostic:true},128);image(key+' 0');const one=await draw(b,0,{preview:true,quality:'balanced',normalDiagnostic:true},128);image(key+' 1');
  const row={key,...compare(zero.pixels,one.pixels)};metrics.controls.push(row);console.log('CONTROL '+JSON.stringify(row));
 }
 for(const [name,values] of [['Growth 0',{petalGrowth:0}],['Growth .3',{petalGrowth:.3}],['Growth 1',{petalGrowth:1}],['Twisted roots',{petalGrowth:1,twist:.8,petalCoil:.7}]]){const state={...root,...values,background:'#121a16',bgMode:'solid',palette:['#80a489','#daae7e','#dae9d6'],metal:.1,roughness:.3,gloss:.6};await draw(state,0,{preview:true,quality:'balanced'},192);image(name);}
 for(const key of ['emerge','wrap','roots']){
  const state=motionPreset(sculpt(newCreation(),4),key);material(state,14);state.bgMode='transparent';
  const a=await draw(state,0,{preview:true,quality:'fast',normalDiagnostic:true},96),b=await draw(state,Math.PI*2,{preview:true,quality:'fast',normalDiagnostic:true},96);metrics.loop.push({key,...compare(a.pixels,b.pixels)});
 }
 const all=motionPreset(sculpt(newCreation(),7),'roots');material(all,14);all.bgMode='transparent';for(const key of ['petalWander','petalKnots','petalDisorder'])Object.assign(all.motions[key],{enabled:true,amplitude:.3,phase:45,cycles:2});
 const g=r.gl;let allocations=0,createdTextures=0,pending=new Set(),maxPending=0;const tex=g.texImage2D.bind(g),storage=g.texStorage2D.bind(g),ct=g.createTexture.bind(g),fence=g.fenceSync.bind(g),del=g.deleteSync.bind(g);
 g.texImage2D=(...a)=>{allocations++;return tex(...a)};g.texStorage2D=(...a)=>{allocations++;return storage(...a)};g.createTexture=(...a)=>{createdTextures++;return ct(...a)};g.fenceSync=(...a)=>{const f=fence(...a);pending.add(f);maxPending=Math.max(maxPending,pending.size);return f};g.deleteSync=f=>{pending.delete(f);return del(f)};
 await draw(all);const before={allocations,createdTextures,programs:r.programs.size},times=[],bounds=JSON.stringify(r.fieldMin);
 for(let i=0;i<120;i++){const got=await draw(all,i/60*Math.PI*2);times.push(got.ms);if(JSON.stringify(r.fieldMin)!==bounds)throw Error('Grid moved during the loop');if(i%30===29)console.log('STRESS '+(i+1)+' frames');}
 const sorted=[...times].sort((a,b)=>a-b);metrics.motion.push({frames:120,median:sorted[60],p95:sorted[114],first30:times.slice(0,30).reduce((a,b)=>a+b)/30,last30:times.slice(-30).reduce((a,b)=>a+b)/30,allocations:allocations-before.allocations,createdTextures:createdTextures-before.createdTextures,programs:r.programs.size-before.programs,maxPending,fieldResolution:r.fieldResolution});
 // Pure rigid motion must not rebuild procedural geometry.
 const rigid=sculpt(newCreation(),7);material(rigid,14);for(const key of ['rotateX','rotateY','volume','scale','gradientOffset'])rigid.motions[key].enabled=true;rigid.environmentRotate=true;await draw(rigid);
 const cache={bakes:r.bakeUploads||0,growth:r.growthUploads||0,roots:r.rootUploads||0};for(let i=0;i<24;i++)await draw(rigid,i/24*Math.PI*2);
 metrics.rigid={bakes:(r.bakeUploads||0)-cache.bakes,growth:(r.growthUploads||0)-cache.growth,roots:(r.rootUploads||0)-cache.roots};
 r.dispose();return {metrics,images,offlineState:all};
 }''')
 (out/'roots-render-results.json').write_text(json.dumps(result['metrics'],indent=2));print(json.dumps(result['metrics'],indent=2),flush=True)
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13);pics=result['images'];sheet=Image.new('RGB',(3*240,((len(pics)+2)//3)*232),'#20232a');drawing=ImageDraw.Draw(sheet)
 for i,item in enumerate(pics):
  x=i%3*240;y=i//3*232;drawing.text((x+8,y+8),item['name'],font=font,fill='white');im=Image.open(io.BytesIO(base64.b64decode(item['url'].split(',')[1]))).convert('RGBA');bg=Image.new('RGBA',im.size,'#343740');bg.alpha_composite(im);sheet.paste(bg.convert('RGB'),(x+(240-im.width)//2,y+32))
 sheet.save(out/'roots-visual-comparison.png')
 # Wallpaper uses only renderer.js and creation JSON; deny all external requests.
 page.close();context=browser.new_context(offline=True,viewport={'width':192,'height':192});offline=context.new_page();offline.on('pageerror',lambda e:errors.append(str(e)));offline.route('**/*',lambda route:route.abort())
 html='<html><style>html,body{margin:0;width:100%;height:100%;background:black}canvas{width:100%;height:100%}</style><canvas id="art"></canvas><script type="module">'+dist.joinpath('renderer.js').read_text()+'\nwindow.wallpaper=startWallpaper(document.querySelector("canvas"),'+json.dumps(result['offlineState'])+');</script></html>'
 (out/'roots-wallpaper.html').write_text(html);offline.set_content(html)
 offline.wait_for_function('window.wallpaper?.getStats().completedFrames>=48',timeout=180000);result['metrics']['offline']=offline.evaluate('window.wallpaper.getStats()');offline.screenshot(path=str(out/'roots-offline.png'));offline.evaluate('window.wallpaper.stop()');browser.close()
 m=result['metrics'];m['errors']=errors;(out/'roots-render-results.json').write_text(json.dumps(m,indent=2))
 assert all(x['difference']==0 for x in m['compatibility']),m['compatibility']
 assert all(x['balanced']['iou']>.91 and x['fast']['iou']>.86 for x in m['quality']),m['quality']
 assert all(x['mean']>.015 for x in m['controls']),m['controls']
 assert all(x['mean']<.15 and x['max']<12 for x in m['loop']),m['loop']
 assert all(x['allocations']==0 and x['createdTextures']==0 and x['programs']==0 and x['maxPending']==1 for x in m['motion']),m['motion']
 assert all(v==0 for v in m['rigid'].values()),m['rigid']
 assert not m['offline']['paused'] and m['offline']['completedFrames']>=48,m['offline']
 assert not errors,errors
 print('ROOTS: DEFAULT PIXELS, QUALITY, CONTROLS, 120-FRAME MOTION, RIGID CACHE REUSE AND OFFLINE PASS',flush=True)
