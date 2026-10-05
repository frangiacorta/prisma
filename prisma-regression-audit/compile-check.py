import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.on('console',lambda m:print(m.text,flush=True));page.on('pageerror',lambda e:print('ERROR '+str(e),flush=True))
 page.route('**/__audit__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.goto('http://127.0.0.1:4183/__audit__')
 result=page.evaluate('''async()=>{
  const {Renderer}=await import('/renderer.js'),{newCreation,sculpt,material}=await import('/creative-model.js');
  const r=new Renderer(document.createElement('canvas')),out=[];console.log('GPU '+r.hardwareInfo().name);
  const cases=[['bubble',newCreation()]];
  for(const [name,index,mat] of [['organic matte',1,14],['organic glass',1,1],['organic sss',2,18],['flower',0,11],['mixed',3,5]]){const s=sculpt(newCreation(),index);material(s,mat);if(name==='mixed')s.petalCoverage=.5;cases.push([name,s]);}
  for(const [name,s] of cases){console.log('PREPARE '+name);const start=performance.now();await r.prepareAsync(s,0,{preview:true,quality:'fast'});console.log('READY '+name+' '+Math.round(performance.now()-start)+'ms');r.draw(s,0,64,64,{preview:true,quality:'fast'});const pixels=r.pixels();out.push({name,ms:performance.now()-start,visible:pixels.some(v=>v>10),error:r.gl.getError(),lost:r.gl.isContextLost()});console.log('DRAWN '+name+' '+Math.round(out.at(-1).ms)+'ms');}
  r.dispose();return out;
 }''')
 Path('/workspace/prisma-regression-audit/compile-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True);assert all(x['visible'] and x['error']==0 and not x['lost'] for x in result);b.close()
