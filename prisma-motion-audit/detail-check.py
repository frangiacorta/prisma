import json,base64,io
from pathlib import Path
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-motion-audit')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:print(m.text,flush=True));page.route('**/__audit__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.goto('http://127.0.0.1:4185/__audit__')
 result=page.evaluate(r'''async()=>{
 const {Renderer,sampleFrame}=await import('/renderer.js'),{newCreation,material,sculpt,motionPreset,bloomExample}=await import('/creative-model.js');const r=new Renderer(document.createElement('canvas'));const metrics={reuse:[],quality:[],loop:[],stress:null},images=[];
 const draw=async(s,phase=0,opts={preview:true,quality:'fast'},size=128)=>{await r.prepareAsync(s,phase,opts);r.draw(s,phase,size,size,opts);await r.waitForGpu();if(r.gl.getError()||r.gl.isContextLost())throw Error('GL failure');return r.pixels();};
 const compare=(a,b)=>{let union=0,intersection=0,total=0,channels=0;for(let i=0;i<a.length;i+=4){const aa=a[i+3]>127,bb=b[i+3]>127;if(aa||bb)union++;if(aa&&bb){intersection++;for(let j=0;j<3;j++){total+=Math.abs(a[i+j]-b[i+j]);channels++;}}}return {iou:intersection/Math.max(1,union),mae:total/Math.max(1,channels)};};
 const image=name=>images.push({name,url:r.canvas.toDataURL()});
 for(const name of ['sphere-twist','crown-twist','crown-phase','transparency-zero']){
  const s=name==='sphere-twist'?newCreation():sculpt(newCreation(),1);material(s,name==='transparency-zero'?8:14);
  if(name.includes('twist'))Object.assign(s.motions.twist,{enabled:true,amplitude:.8});
  if(name==='crown-phase')Object.assign(s.motions.petalPhase,{enabled:true,mode:'cycle'});
  if(name==='transparency-zero'){s.transparency=.2;Object.assign(s.motions.transparency,{enabled:true,amplitude:.5});}
  await draw(s);const before={bakes:r.bakeUploads||0,growth:r.growthUploads||0,programs:r.programs.size,allocations:r.fieldAllocations||0};
  for(let i=0;i<96;i++)await draw(s,i/32*Math.PI*2);
  const row={name,bakes:(r.bakeUploads||0)-before.bakes,growth:(r.growthUploads||0)-before.growth,programs:r.programs.size-before.programs,allocations:(r.fieldAllocations||0)-before.allocations};metrics.reuse.push(row);console.log('REUSE '+JSON.stringify(row));
 }
 for(const name of ['twist-crown','phase-crown','phase-flower-stem','twist-cut']){
  const s=sculpt(newCreation(),name==='phase-flower-stem'?0:1);material(s,14);s.petalPhase=name.includes('phase')?41:0;s.twist=name.includes('twist')?.55:0;
  if(name==='phase-flower-stem')s.stemAmount=.45;
  if(name==='twist-cut'){s.cut=.45;s.cutX=.5;s.deform=.1;}
  const full=await draw(s,0,{quality:'full',normalDiagnostic:true});image(name+' exact');const preview=await draw(s,0,{preview:true,quality:'balanced',normalDiagnostic:true});image(name+' preview');const row={name,...compare(full,preview)};metrics.quality.push(row);console.log('QUALITY '+JSON.stringify(row));
 }
 const threshold=sculpt(newCreation(),1);material(threshold,14);threshold.petalSharp=.7;Object.assign(threshold.motions.petalSharp,{enabled:true,amplitude:.25});
 for(const phase of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const sampled=sampleFrame(threshold,phase);sampled.motions={};r.fieldKey=null;const ref=await draw(sampled,0,{preview:true,quality:'fast',normalDiagnostic:true});r.fieldKey=null;const got=await draw(threshold,phase,{preview:true,quality:'fast',normalDiagnostic:true});const row={name:'moving-threshold',phase,...compare(ref,got)};metrics.quality.push(row);console.log('QUALITY '+JSON.stringify(row));
 }
 const needle=sculpt(newCreation(),3);material(needle,14);motionPreset(needle,'bloom');motionPreset(needle,'wave');motionPreset(needle,'bloom');for(const k of ['petalSharp','petalInflate','petalRoot','petalBlend','petalRandom'])needle.motions[k].enabled=true;
 for(const phase of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
  const sampled=sampleFrame(needle,phase);sampled.motions={};const ref=await draw(sampled,0,{preview:true,quality:'fast',normalDiagnostic:true});image('Needles ref '+phase.toFixed(2));r.fieldKey=null;const got=await draw(needle,phase,{preview:true,quality:'fast',normalDiagnostic:true});image('Needles moving '+phase.toFixed(2));const row={name:'moving-needles',phase,...compare(ref,got)};metrics.quality.push(row);console.log('QUALITY '+JSON.stringify(row));
 }
 for(const [name,s] of [['bloom',bloomExample()],['needles',needle],['soap-film',motionPreset(newCreation(),'film')],['orbit',motionPreset(newCreation(),'orbit')]]){
  const a=await draw(s,0),b=await draw(s,Math.PI*2);let max=0,total=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);total+=d;}const row={name,max,mean:total/a.length};metrics.loop.push(row);console.log('LOOP '+JSON.stringify(row));
 }
 const stress=bloomExample();material(stress,18);await draw(stress);const before={programs:r.programs.size,allocations:r.fieldAllocations||0},grid=JSON.stringify(r.fieldMin);const times=[];
 for(let i=0;i<240;i++){const t=performance.now();await draw(stress,i/60*Math.PI*2);times.push(performance.now()-t);if(JSON.stringify(r.fieldMin)!==grid)throw Error('Moving grid');}
 metrics.stress={frames:240,programs:r.programs.size-before.programs,allocations:(r.fieldAllocations||0)-before.allocations,first60:times.slice(0,60).reduce((a,b)=>a+b)/60,last60:times.slice(-60).reduce((a,b)=>a+b)/60};console.log('STRESS '+JSON.stringify(metrics.stress));r.dispose();return {metrics,images};
 }''')
 (out/'motion-detail.json').write_text(json.dumps(result['metrics'],indent=2))
 pics=result['images'];sheet=Image.new('RGB',(2*300,((len(pics)+1)//2)*180),'#20232a');d=ImageDraw.Draw(sheet)
 for i,item in enumerate(pics):
  x=i%2*300;y=i//2*180;d.text((x+8,y+8),item['name'],fill='white');im=Image.open(io.BytesIO(base64.b64decode(item['url'].split(',')[1]))).convert('RGBA');bg=Image.new('RGBA',im.size,'#343740');bg.alpha_composite(im);sheet.paste(bg.convert('RGB'),(x+70,y+32))
 sheet.save(out/'motion-geometry.png');m=result['metrics'];assert all(x['bakes']==0 and x['growth']==0 and x['programs']==0 and x['allocations']==0 for x in m['reuse']),m['reuse'];assert all(x['iou']>.92 and x['mae']<16 for x in m['quality']),m['quality'];assert all(x['mean']<.1 and x['max']<5 for x in m['loop']),m['loop'];assert m['stress']['allocations']==0 and m['stress']['programs']==0;assert not errors,errors;b.close();print('MOTION REUSE, GEOMETRY, LOOP AND STRESS PASS',flush=True)
