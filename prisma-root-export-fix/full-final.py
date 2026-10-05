import base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/workspace/prisma-root-export-fix');fixture=json.loads((out/'user-preset.json').read_text());events=[]
def event(item):
 events.append(item);print(json.dumps(item),flush=True);(out/'full-final-events.json').write_text(json.dumps(events,indent=2))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=b.new_page();page.route('**/__full_final__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'));page.expose_function('qaEvent',event);page.goto('http://127.0.0.1:4186/__full_final__')
 result=page.evaluate('''async f=>{const {Renderer}=await import('/renderer.js'),{readPreset}=await import('/preset-files.js');const {state:s,phase}=readPreset(JSON.stringify(f)),r=new Renderer(document.createElement('canvas')),result=[];let start=performance.now();await qaEvent({stage:'prepare'});await r.prepareAsync(s,phase);await qaEvent({stage:'prepared',ms:performance.now()-start});
 for(const [name,w,h,tile] of [['full64-cold',64,36,0],['full64-warm',64,36,0],['full128',128,72,0],['center32',2048,1152,32],['center64',2048,1152,64],['center128',2048,1152,128]]){
  await qaEvent({stage:'draw',name});let now=Date.now(),ok=true;const opts={cancelled:()=>Date.now()-now>45000};
  if(tile){r.canvas.width=w;r.canvas.height=h;r.gl.viewport(0,0,w,h);r.gl.disable(r.gl.SCISSOR_TEST);r.gl.clearColor(0,0,0,0);r.gl.clear(r.gl.COLOR_BUFFER_BIT);r.gl.enable(r.gl.SCISSOR_TEST);r.gl.scissor((w-tile)/2,(h-tile)/2,tile,tile);r.draw(s,phase,w,h,opts);ok=await r.waitForGpu(opts);r.gl.disable(r.gl.SCISSOR_TEST);}
  else ok=await r.drawTiled(s,phase,w,h,opts);
  const item={name,ms:Date.now()-now,ok,lost:r.gl.isContextLost(),glError:r.gl.getError()};if(ok&&!tile)item.png=r.canvas.toDataURL();result.push(item);await qaEvent({...item,png:undefined,stage:'done'});if(!ok)break;
 }r.dispose();return result;}''',fixture)
 b.close()
 for item in result:
  if 'png' in item:(out/('final-'+item['name']+'.png')).write_bytes(base64.b64decode(item.pop('png').split(',')[1]))
 (out/'full-final-results.json').write_text(json.dumps(result,indent=2))
