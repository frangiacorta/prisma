import json
from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.route('**/__audit__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.goto('http://127.0.0.1:4185/__audit__')
 result=page.evaluate(r'''async()=>{
 const {Renderer}=await import('/renderer.js'),{newCreation,sculpt,material}=await import('/creative-model.js');const r=new Renderer(document.createElement('canvas')),g=r.gl,u=g.uniform1f.bind(g);let force=false,rows=[];g.uniform1f=(l,v)=>u(l,force&&l===r.locations.uBakeRadius?10000:v);
 const draw=async s=>{const o={preview:true,quality:'fast'};r.fieldKey=null;await r.prepareAsync(s,0,o);r.draw(s,0,128,128,o);await r.waitForGpu();if(g.getError())throw Error('GL');return r.pixels();};
 for(const [name,change] of [['soft',{edge:1}],['halo',{glow:1}],['flat',{volume:.08,scale:.35,edge:.4}]]){
 const s=sculpt(newCreation(),1);material(s,14);Object.assign(s,change);force=false;const a=await draw(s);force=true;const b=await draw(s);let max=0;for(let i=0;i<a.length;i++)max=Math.max(max,Math.abs(a[i]-b[i]));rows.push({name,max});if(max)throw Error('Soft result changed '+name);}
 r.dispose();return rows;
 }''');Path('/workspace/prisma-motion-audit/soft-results.json').write_text(json.dumps(result,indent=2));b.close();print('Soft contours, glow and flat shapes preserve the uncropped field: '+json.dumps(result),flush=True)
