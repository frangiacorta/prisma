import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-motion-audit')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:print(m.text,flush=True))
 page.route('**/__audit__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.goto('http://127.0.0.1:4185/__audit__')
 result=page.evaluate(r'''async()=>{
 const {Renderer,sampleFrame}=await import('/renderer.js'),{newCreation,material,sculpt,motionPreset,bloomExample}=await import('/creative-model.js');
 const r=new Renderer(document.createElement('canvas')),g=r.gl,metrics={hardware:r.hardwareInfo(),runs:[]};let allocations=0;const tex=g.texImage2D.bind(g);g.texImage2D=(...a)=>{allocations++;return tex(...a);};
 const draw=async(s,phase)=>{const opts={preview:true,quality:'fast'},t=performance.now();await r.prepareAsync(s,phase,opts);r.draw(s,phase,96,96,opts);await r.waitForGpu();if(g.getError()||g.isContextLost())throw Error('WebGL failure');return performance.now()-t;};
 await draw(newCreation(),0);
 for(const name of ['uniform-motion','threshold','bloom','needles-all']){
  const s=name==='bloom'?bloomExample():sculpt(newCreation(),name==='needles-all'?3:1);material(s,name==='bloom'?18:1);
  if(name==='uniform-motion'){for(const k of ['rotateY','volume','scale','gradientOffset'])s.motions[k].enabled=true;s.environmentRotate=true;for(const l of s.lights){l.orbit.enabled=true;l.pulse.enabled=true;}}
  if(name==='threshold'){s.petalSharp=.7;s.motions.petalSharp.enabled=true;s.motions.petalSharp.amplitude=.25;}
  if(name==='needles-all'){motionPreset(s,'bloom');motionPreset(s,'wave');motionPreset(s,'bloom');for(const k of ['petalSharp','petalInflate','petalRoot','petalBlend','petalRandom'])s.motions[k].enabled=true;s.motions.rotateY.enabled=true;}
  await draw(s,0);const start={bakes:r.bakeUploads||0,growth:r.growthUploads||0,allocations,programs:r.programs.size};const times=[],sizes=[];
  for(let i=0;i<64;i++){times.push(await draw(s,i/32*Math.PI*2));sizes.push(r.fieldResolution);}
  const sorted=[...times].sort((a,b)=>a-b),row={name,frames:64,median:sorted[32],p95:sorted[60],max:Math.max(...times),bakes:(r.bakeUploads||0)-start.bakes,growth:(r.growthUploads||0)-start.growth,allocations:allocations-start.allocations,programs:r.programs.size-start.programs,sizes:[...new Set(sizes)]};metrics.runs.push(row);console.log(JSON.stringify(row));
 }
 r.dispose();return metrics;
 }''')
 (out/(sys.argv[1] if len(sys.argv)>1 else 'motion-baseline.json')).write_text(json.dumps(result,indent=2));assert not errors,errors;b.close()
