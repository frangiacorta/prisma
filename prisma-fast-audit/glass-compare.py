import argparse,base64,io,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4185');args=parser.parse_args();out=Path('/workspace/prisma-fast-audit')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=b.new_page();page.on('console',lambda m:print(m.text,flush=True));errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/__audit__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.goto(args.url+'/__audit__')
 result=page.evaluate(r'''async()=>{
 const {Renderer}=await import('/renderer.js'),{newCreation,sculpt,material}=await import('/creative-model.js');
 const r=new Renderer(document.createElement('canvas')),metrics=[],images=[],s=sculpt(newCreation(),1);material(s,1);
 for(const insideLight of [false,true]){
  if(insideLight)s.lights.push({...s.lights[0],id:4,type:'orb',x:0,y:0,z:0,size:.12,power:2,color:'#ffcc99',visible:true});
  let reference;for(const quality of ['full','fast','balanced']){
   console.log('BEGIN glass '+quality+' internal='+insideLight);const opts=quality==='full'?{quality}:{preview:true,quality},start=performance.now();await r.prepareAsync(s,0,opts);r.draw(s,0,96,96,opts);await r.waitForGpu(opts);const coldMs=performance.now()-start;
   const warmStart=performance.now();r.draw(s,0,96,96,opts);await r.waitForGpu(opts);const warmMs=performance.now()-warmStart,pixels=r.pixels();if(r.gl.isContextLost()||r.gl.getError())throw Error('WebGL failure');
   if(quality==='full')reference=pixels;
   let brightPixels=0,visiblePixels=0,difference=0,alphaDiff=0;for(let i=0;i<pixels.length;i+=4){if(Math.min(pixels[i],pixels[i+1],pixels[i+2])>220)brightPixels++;if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>20)visiblePixels++;for(let c=0;c<3;c++)difference+=Math.abs(pixels[i+c]-reference[i+c]);alphaDiff+=Math.abs(pixels[i+3]-reference[i+3]);}
   const name='Riccio water '+(insideLight?'internal light':'no internal light')+' '+quality;images.push({name,url:r.canvas.toDataURL()});metrics.push({quality,insideLight,coldMs,warmMs,brightPixels,visiblePixels,meanChannelDifference:difference/(96*96*3),alphaDiff,fieldResolution:r.fieldResolution});console.log('GLASS '+JSON.stringify(metrics.at(-1)));
  }
 }
 r.dispose();return {metrics,images};
 }''')
 (out/'glass-results.json').write_text(json.dumps(result['metrics'],indent=2));font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13);sheet=Image.new('RGB',(900,650),'#181a20');d=ImageDraw.Draw(sheet)
 for n,im in enumerate(result['images']):
  img=Image.open(io.BytesIO(base64.b64decode(im['url'].split(',')[1]))).convert('RGB');img.save(out/('glass-'+str(n)+'.png'));x=n%3*300+8;y=n//3*325+8;d.text((x,y),im['name'],font=font,fill='white');sheet.paste(img.resize((280,280)),(x,y+28))
 sheet.save(out/'glass-quality-comparison.png');assert not errors,errors;b.close();print('GLASS REFERENCE COMPARISON DONE',flush=True)
