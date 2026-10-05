import json,base64,io
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-regression-audit')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.on('console',lambda m:print(m.text[:500],flush=True));page.route('**/__audit__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.goto('http://127.0.0.1:4183/__audit__')
 result=page.evaluate(r'''async oldSource=>{
  const {Renderer,fieldAt,growthTable}=await import('/renderer.js'),{preset,PRESETS}=await import('/model.js'),{newCreation,sculpt,material,bloomExample}=await import('/creative-model.js');
  const Old=await import(URL.createObjectURL(new Blob([oldSource],{type:'text/javascript'}))),r=new Renderer(document.createElement('canvas')),old=new Old.Renderer(document.createElement('canvas')),metrics={presets:[],fields:[],benchmarks:[],tiling:[],loops:[],cache:[]},images=[];
  const render=async(s,renderer=r,size=96,phase=0,opts={})=>{await renderer.prepareAsync?.(s,phase,opts);renderer.draw(s,phase,size,size,opts);await renderer.waitForGpu?.();const pixels=renderer.pixels();if(renderer.gl.getError()!==0)throw Error('WebGL error');return pixels;};
  const diff=(a,b)=>a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0);
  for(let i=0;i<6;i++){const s=preset(i),a=await render(s,old),before=old.canvas.toDataURL(),bb=await render(s),difference=diff(a,bb);metrics.presets.push({name:PRESETS[i].name,difference});images.push({name:PRESETS[i].name+' · prima',url:before},{name:PRESETS[i].name+' · dopo',url:r.canvas.toDataURL()});console.log('PRESET '+i+' difference '+difference);}
  // Run the real GPU field and compare signs with the independent CPU SDF.
  let source=await(await fetch('/renderer.js')).text();source=source.replace('const RESOLVE=',`MODERN_FRAG=shaderFunction(MODERN_FRAG,'main','void main(){vec2 uv=(gl_FragCoord.xy-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4;fragColor=vec4(vec3(field(vec3(uv,uRuntime.z))<0.?1.:0.),1.);}');\nconst RESOLVE=`).replace('options.normalDiagnostic?2:+!!options.diagnostic','options.fieldPlane||0');
  const D=await import(URL.createObjectURL(new Blob([source],{type:'text/javascript'}))),d=new D.Renderer(document.createElement('canvas'));
  for(let i=0;i<7;i++){const s=sculpt(newCreation(),i%3+1);if(i===3)Object.assign(s,{petalCoverage:.42,petalAmount:.65});if(i===4)Object.assign(s,{petalBlend:.001,petalRoot:0,petalRandom:0});if(i===5)Object.assign(s,{petalBlend:0,petalRoot:0,petalRandom:0});if(i===6)Object.assign(s,{petalRows:8,petalCount:24,petalRandom:1,petalCurl:.7,rotateY:17});
   for(const plane of [0,.23]){const pixels=await render(s,d,64,0,{fieldPlane:plane});let mismatch=0,boundary=0;for(let y=0;y<64;y++)for(let x=0;x<64;x++){const v=fieldAt(s,[(x+.5-32)/64*3.4,(32-y-.5)/64*3.4,plane]),inside=pixels[(y*64+x)*4]>127;if(inside!==(v<0)){mismatch++;if(Math.abs(v)<.0005)boundary++;}}metrics.fields.push({i,plane,mismatch,boundary});}console.log('FIELD '+i);}
  d.dispose();old.dispose();
  // Full-quality large-render tiles must preserve every pixel, including alpha.
  for(const mode of ['solid','transparent']){const s=newCreation();s.bgMode=mode;material(s,14);const single=await render(s,r,96);await r.drawAccumulated(s,0,96,96,{samples:1,tileSize:32});metrics.tiling.push({mode,difference:diff(single,r.pixels())});await r.drawAccumulated(s,0,96,96,{samples:4});const acc=r.pixels();await r.drawAccumulated(s,0,96,96,{samples:4,tileSize:32});metrics.tiling.push({mode,accumulated:true,difference:diff(acc,r.pixels())});}
  // Warm real render timings, separate from compilation and first-use JIT.
  for(const [name,mat] of [['Riccio opaco',14],['Riccio vetro',1],['Riccio SSS',18]]){const s=sculpt(newCreation(),1);material(s,mat);s.lights.push({...s.lights[0],id:3,type:'orb',x:0,y:0,z:0,power:2,visible:true,size:.12});const opts={preview:true,quality:'fast'};console.log('WARM '+name);await render(s,r,64,0,opts);const times=[];for(let i=0;i<4;i++){const start=performance.now();await render(s,r,128,i*.2,opts);times.push(performance.now()-start);}metrics.benchmarks.push({name,times});images.push({name:name+' · anteprima',url:r.canvas.toDataURL()});const a=await render(s,r,64,0,opts),end=await render(s,r,64,Math.PI*2,opts);metrics.loops.push({name,difference:diff(a,end)});console.log('BENCH '+name+' '+JSON.stringify(times));}
  const s=sculpt(newCreation(),1);material(s,14);await render(s,r,64,0,{preview:true});const first=r.growthUploads;for(let i=1;i<4;i++){s.rotateY+=20;await render(s,r,64,0,{preview:true});}metrics.cache.push({unchangedGrowth:r.growthUploads===first});s.petalCurl+=.1;await render(s,r,64,0,{preview:true});metrics.cache.push({changedGrowth:r.growthUploads===first+1});r.dispose();return {metrics,images};
 }''',(out/'renderer-original.js').read_text())
 (out/'render-results.json').write_text(json.dumps(result['metrics'],indent=2));print(json.dumps(result['metrics']),flush=True)
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
 rows=(len(result['images'])+1)//2;sheet=Image.new('RGB',(440,rows*146+10),'#181a20');draw=ImageDraw.Draw(sheet)
 for j,item in enumerate(result['images']):x=12+(j%2)*216;y=10+(j//2)*146;draw.text((x,y),item['name'],font=font,fill='white');pic=Image.open(io.BytesIO(base64.b64decode(item['url'].split(',')[1]))).convert('RGB');pic=pic.resize((128,128));sheet.paste(pic,(x,y+18))
 sheet.save(out/'confronto-renderer.png')
 m=result['metrics'];assert all(x['difference']==0 for x in m['presets']),m['presets'];assert all(x['mismatch']<=x['boundary']+2 for x in m['fields']),m['fields'];assert all(x['difference']==0 for x in m['tiling']),m['tiling'];assert all(x['difference']==0 for x in m['loops']),m['loops'];assert all(list(x.values())[0] for x in m['cache']),m['cache'];b.close();print('RENDER COMPATIBILITY, GPU/CPU GEOMETRY, TILES, LOOPS AND CACHED GROWTH PASS',flush=True)
