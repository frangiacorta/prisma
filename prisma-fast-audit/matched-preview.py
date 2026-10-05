import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4185');args=parser.parse_args();out=Path('/workspace/prisma-fast-audit')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=b.new_page();page.on('console',lambda m:print(m.text,flush=True));page.route('**/__audit__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.route('**/__baseline_renderer.js',lambda r:r.fulfill(body=(out/'renderer-v12.js').read_text(),content_type='text/javascript'));page.goto(args.url+'/__audit__')
 result=page.evaluate(r'''async()=>{
 const {newCreation,sculpt,material}=await import('/creative-model.js');const s=sculpt(newCreation(),1);material(s,1);s.lights.push({...s.lights[0],id:4,type:'orb',x:0,y:0,z:0,size:.12,power:2,color:'#ffcc99',visible:true});const output={state:s,results:[],images:[]};
 for(const [label,url] of [['before','/__baseline_renderer.js'],['after','/renderer.js']]){const {Renderer}=await import(url),r=new Renderer(document.createElement('canvas')),opts={preview:true,quality:'fast'};const measurements=[];
 for(let n=0;n<4;n++){console.log('MATCHED '+label+' draw'+n);const start=performance.now();await r.prepareAsync(s,0,opts);r.draw(s,0,96,96,opts);await r.waitForGpu(opts);measurements.push(performance.now()-start);if(r.gl.isContextLost()||r.gl.getError())throw Error('GPU failure');}
 output.results.push({label,size:96,quality:'fast',coldMs:measurements[0],warmMs:measurements.slice(1),fieldResolution:r.fieldResolution,bakeUploads:r.bakeUploads});output.images.push({name:label,url:r.canvas.toDataURL()});console.log('MATCHEDRESULT '+JSON.stringify(output.results.at(-1)));r.dispose();}return output;
 }''')
 for im in result.pop('images'):(out/('matched-preview-'+im['name']+'.png')).write_bytes(base64.b64decode(im['url'].split(',')[1]))
 (out/'matched-preview-results.json').write_text(json.dumps(result,indent=2));b.close();print('MATCHED BEFORE/AFTER PREVIEW DONE',flush=True)
