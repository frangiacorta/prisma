"""Export fidelity against v12; run only when the GPU test slot is available."""
import base64, io, json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-fast-audit')
errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page();page.set_default_timeout(180000);page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:print(m.text[:500],flush=True))
 page.route('**/__compat__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'))
 page.route('**/__v12_renderer.js',lambda r:r.fulfill(body=(out/'renderer-v12.js').read_text(),content_type='text/javascript'))
 page.goto('http://127.0.0.1:4185/__compat__')
 result=page.evaluate(r'''async()=>{
  const {Renderer}=await import('/renderer.js'),{preset,PRESETS}=await import('/model.js'),{newCreation,material}=await import('/creative-model.js');
  const Old=await import('/__v12_renderer.js'),r=new Renderer(document.createElement('canvas')),old=new Old.Renderer(document.createElement('canvas')),metrics={presets:[],tiling:[],previewAccumulation:[]},images=[];
  const render=async(s,renderer=r,size=96,phase=0,opts={})=>{await renderer.prepareAsync(s,phase,opts);if(renderer.draw(s,phase,size,size,opts)===false)throw Error('Full draw did not submit');await renderer.waitForGpu();const pixels=renderer.pixels();if(renderer.gl.getError()!==0||renderer.gl.isContextLost())throw Error('WebGL error');return pixels;};
  const diff=(a,b)=>a.reduce((n,v,i)=>n+Math.abs(v-b[i]),0);
  for(let i=0;i<6;i++){const s=preset(i),a=await render(s,old),before=old.canvas.toDataURL(),bb=await render(s),difference=diff(a,bb);metrics.presets.push({name:PRESETS[i].name,difference});images.push({name:PRESETS[i].name+' · v12',url:before},{name:PRESETS[i].name+' · attuale',url:r.canvas.toDataURL()});console.log('LEGACY PRESET '+i+' difference '+difference);}
  old.dispose();
  for(const mode of ['solid','transparent']){const s=newCreation();s.bgMode=mode;material(s,14);const single=await render(s);await r.drawAccumulated(s,0,96,96,{samples:1,tileSize:32});metrics.tiling.push({mode,difference:diff(single,r.pixels())});await r.drawAccumulated(s,0,96,96,{samples:4});const acc=r.pixels();await r.drawAccumulated(s,0,96,96,{samples:4,tileSize:32});metrics.tiling.push({mode,accumulated:true,difference:diff(acc,r.pixels())});console.log('TILED '+mode);}
  const preview=newCreation();preview.petalAmount=.45;material(preview,14);await r.drawAccumulated(preview,0,96,96,{preview:true,quality:'fast',samples:4});
  const gl=r.gl,pixels=r.pixels();let lit=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>15)lit++;
  metrics.previewAccumulation.push({lit,glError:gl.getError(),lost:gl.isContextLost(),drawFramebufferRestored:gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING)===null,readFramebufferRestored:gl.getParameter(gl.READ_FRAMEBUFFER_BINDING)===null,blendDisabled:!gl.isEnabled(gl.BLEND),scissorDisabled:!gl.isEnabled(gl.SCISSOR_TEST),bakes:r.bakeUploads});
  console.log('PREVIEW ACCUMULATION '+JSON.stringify(metrics.previewAccumulation));
  r.dispose();return {metrics,images};
 }''')
 (out/'compat-render-results.json').write_text(json.dumps(result['metrics'],indent=2));print(json.dumps(result['metrics']),flush=True)
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
 rows=(len(result['images'])+1)//2;sheet=Image.new('RGB',(440,rows*146+10),'#181a20');draw=ImageDraw.Draw(sheet)
 for j,item in enumerate(result['images']):
  x=12+(j%2)*216;y=10+(j//2)*146;draw.text((x,y),item['name'],font=font,fill='white');pic=Image.open(io.BytesIO(base64.b64decode(item['url'].split(',')[1]))).convert('RGB');sheet.paste(pic.resize((128,128)),(x,y+18))
 sheet.save(out/'compat-legacy-comparison.png')
 assert all(x['difference']==0 for x in result['metrics']['presets']),result['metrics']['presets'];assert all(x['difference']==0 for x in result['metrics']['tiling']),result['metrics']['tiling'];assert all(x['lit']>100 and x['glError']==0 and not x['lost'] and x['drawFramebufferRestored'] and x['readFramebufferRestored'] and x['blendDisabled'] and x['scissorDisabled'] and x['bakes']>0 for x in result['metrics']['previewAccumulation']),result['metrics']['previewAccumulation'];assert not errors,errors;b.close()
 print('ALL SIX LEGACY PRESETS AND EXACT TILED EXPORT PASS',flush=True)
