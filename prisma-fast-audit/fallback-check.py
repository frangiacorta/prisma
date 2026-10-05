"""Real preview with and without EXT_color_buffer_float; no renderer stubs."""
import argparse,json,base64
from pathlib import Path
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4185');args=parser.parse_args()
out=Path('/workspace/prisma-fast-audit')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.on('console',lambda m:print(m.text,flush=True));errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/__audit__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.goto(args.url+'/__audit__')
 result=page.evaluate(r'''async()=>{
 const {Renderer}=await import('/renderer.js'),{newCreation,sculpt}=await import('/creative-model.js');
 const metrics={runs:[],comparisons:[]},images=[],saved={};
 for(const mode of ['float','packed']){
  const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'}),original=gl.getExtension.bind(gl),available=!!original('EXT_color_buffer_float');
  if(mode==='packed')gl.getExtension=name=>name==='EXT_color_buffer_float'?null:original(name);
  const r=new Renderer(canvas),scene=newCreation();const states=[['petals .05',{...structuredClone(scene),petalAmount:.05}],['petals .35',{...structuredClone(scene),petalAmount:.35}],['petals .7',{...structuredClone(scene),petalAmount:.7}],['organic needles',sculpt(structuredClone(scene),3)]];
  for(const [name,s] of states){
   for(const diagnostic of [true,false]){
    const opts={preview:true,quality:'fast',normalDiagnostic:diagnostic},begin=performance.now();await r.prepareAsync(s,0,opts);r.draw(s,0,256,256,opts);await r.waitForGpu(opts);const pixels=r.pixels();if(gl.isContextLost()||gl.getError())throw Error('WebGL failure '+mode+' '+name);
    const key=name+' '+diagnostic,ms=performance.now()-begin;metrics.runs.push({mode,name,diagnostic,ms,extensionActuallyAvailable:available,bakeUploads:r.bakeUploads,fieldResolution:r.fieldResolution});images.push({name:`fallback-${mode}-${name.replaceAll(' ','-')}-${diagnostic?'normals':'material'}`,url:canvas.toDataURL()});
    if(mode==='float')saved[key]=pixels;else{const ref=saved[key];let differences=0,maxDifference=0,intersection=0,union=0,channels=0;for(let i=0;i<pixels.length;i+=4){const a=ref[i+3]>127,c=pixels[i+3]>127;if(a||c)union++;if(a&&c)intersection++;if(!diagnostic||a&&c)for(let j=0;j<3;j++){const d=Math.abs(ref[i+j]-pixels[i+j]);differences+=d;maxDifference=Math.max(maxDifference,d);channels++;}}metrics.comparisons.push({name,diagnostic,iou:intersection/Math.max(1,union),meanChannelDifference:differences/Math.max(1,channels),maxDifference});}
    console.log('FALLBACK '+mode+' '+name+' '+diagnostic+' '+ms.toFixed(1)+'ms');
   }
  }r.dispose();
 }
 return {metrics,images};
 }''')
 for i in result['images']:(out/(i['name']+'.png')).write_bytes(base64.b64decode(i['url'].split(',')[1]))
 (out/'fallback-results.json').write_text(json.dumps(result['metrics'],indent=2));assert not errors,errors
 assert all(c['iou']>.98 and c['meanChannelDifference']<5 for c in result['metrics']['comparisons'] if c['diagnostic']),result['metrics']['comparisons']
 b.close();print('FLOAT AND PACKED FIELD FALLBACK PASS',flush=True)
