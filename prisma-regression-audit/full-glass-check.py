import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.on('console',lambda m:print(m.text,flush=True));page.route('**/__audit__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.goto('http://127.0.0.1:4183/__audit__')
 result=page.evaluate('''async()=>{const {Renderer}=await import('/renderer.js'),{newCreation,sculpt,material}=await import('/creative-model.js');const s=sculpt(newCreation(),2);material(s,10);s.dispersion=.08;s.lights.push({...s.lights[0],id:3,type:'orb',x:0,y:0,z:0,size:.12,power:2,visible:true});const r=new Renderer(document.createElement('canvas')),start=performance.now();console.log('PREPARING FULL ORGANIC GLASS + SSS + DISPERSION + INTERNAL LIGHT');await r.drawAccumulated(s,0,32,32,{samples:2});const pixels=r.pixels(),out={ms:performance.now()-start,error:r.gl.getError(),lost:r.gl.isContextLost(),visible:pixels.some(v=>v>30)};console.log(JSON.stringify(out));r.dispose();return out;}''')
 assert result['error']==0 and not result['lost'] and result['visible'],result
 Path('/workspace/prisma-regression-audit/full-glass-results.json').write_text(json.dumps(result,indent=2));b.close()
