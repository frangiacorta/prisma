import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-roots-audit')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.on('console',lambda m:print(m.text,flush=True));page.route('**/__final_roots__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.goto('http://127.0.0.1:4186/__final_roots__')
 result=page.evaluate(r'''async()=>{
 const {Renderer,sampleFrame}=await import('/renderer.js'),{newCreation,sculpt,material,motionPreset}=await import('/creative-model.js');const r=new Renderer(document.createElement('canvas')),rows=[];
 const draw=async(s,p,options)=>{const t=performance.now();await r.prepareAsync(s,p,options);r.draw(s,p,128,128,options);await r.waitForGpu();if(r.gl.getError()||r.gl.isContextLost())throw Error('GL failure');return {pixels:r.pixels(),ms:performance.now()-t};};
 const full={quality:'full',normalDiagnostic:true},fast={preview:true,quality:'fast',normalDiagnostic:true};
 const staticState=sculpt(newCreation(),4);material(staticState,14);const repeat=[];for(let i=0;i<4;i++)repeat.push((await draw(staticState,0,full)).ms);
 const s=motionPreset(sculpt(newCreation(),7),'roots');material(s,14);Object.assign(s.motions.petalDisorder,{enabled:true,amplitude:.3,phase:90});
 for(let i=0;i<8;i++){const phase=i/8*Math.PI*2,a=await draw(s,phase,full),bb=await draw(s,phase,fast);let union=0,intersection=0;for(let j=0;j<a.pixels.length;j+=4){const aa=a.pixels[j+3]>127,b=bb.pixels[j+3]>127;if(aa||b)union++;if(aa&&b)intersection++;}const row={phase,growth:sampleFrame(s,phase).petalGrowth,iou:intersection/Math.max(1,union),exactMs:a.ms,previewMs:bb.ms,resolution:r.fieldResolution};rows.push(row);console.log(JSON.stringify(row));}
 const times=[];await draw(s,0,fast);const resources={allocations:r.fieldAllocations||0,programs:r.programs.size,builds:r.rootStorage.builds};for(let i=0;i<60;i++)times.push((await draw(s,i/60*Math.PI*2,fast)).ms);times.sort((a,b)=>a-b);const stress={frames:60,median:times[30],p95:times[57],allocations:(r.fieldAllocations||0)-resources.allocations,programs:r.programs.size-resources.programs,builds:r.rootStorage.builds-resources.builds,resolution:r.fieldResolution};console.log('FINAL MOTION '+JSON.stringify(stress));
 // Stored fractionalcycles are deliberately free only with perfectLoop disabled.
 const fractional=motionPreset(sculpt(newCreation(),4),'wrap');fractional.motions.petalCoil.cycles=1.25;const closed0=sampleFrame(fractional,0),closed1=sampleFrame(fractional,Math.PI*2);fractional.perfectLoop=false;const free=sampleFrame(fractional,Math.PI*2);const loop={closedDifference:Math.abs(closed0.petalCoil-closed1.petalCoil),freeDifference:Math.abs(closed0.petalCoil-free.petalCoil)};
 r.dispose();return {repeatExactMs:repeat,quality:rows,loop,stress};}''')
 (out/'roots-motion-final.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));assert all(r['iou']>.9 for r in result['quality']),result;assert result['loop']['closedDifference']<1e-12 and result['loop']['freeDifference']>.01,result['loop'];b.close()
