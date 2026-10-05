import base64,json,time
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('/workspace/prisma-root-export-fix')
fixture=json.loads((out/'user-preset.json').read_text())
events=[]
def event(item):
    events.append(item)
    print(json.dumps(item),flush=True)
    (out/'baseline-events.json').write_text(json.dumps(events,indent=2))
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
    page=b.new_page()
    page.route('**/__root_export__',lambda r:r.fulfill(body='<html></html>',content_type='text/html'))
    page.route('**/renderer-before.js',lambda r:r.fulfill(body=(out/'renderer-before.js').read_text(),content_type='application/javascript'))
    page.on('pageerror',lambda e:event({'error':str(e)}))
    page.expose_function('qaEvent',event)
    page.goto('http://127.0.0.1:4186/__root_export__')
    result=page.evaluate('''async fixture=>{
      const {Renderer,rootGeometry}=await import('/renderer-before.js');
      const {readPreset}=await import('/preset-files.js');
      const project=readPreset(JSON.stringify(fixture)),s=project.state,r=new Renderer(document.createElement('canvas')),before=JSON.stringify(s),geometry=rootGeometry(s);
      await qaEvent({stage:'context',hardware:r.hardwareInfo(),roots:geometry.roots,segments:geometry.count,nodes:geometry.nodeCount,unchangedNormalized:JSON.stringify(s)===JSON.stringify(fixture.state)});
      const results=[];
      for(const [label,width,height,options] of [['preview64',64,36,{preview:true,quality:'fast'}],['full64-cold',64,36,{}],['full64-warm',64,36,{}],['full128',128,72,{}]]){
       await qaEvent({stage:'prepare-start',label});let now=performance.now();
       let ok=await r.prepareAsync(s,project.phase,options),prepareMs=performance.now()-now;
       await qaEvent({stage:'prepare-done',label,prepareMs,programs:[...r.programs.keys()]});
       now=performance.now();await qaEvent({stage:'draw-start',label});
       const started=Date.now();ok=await r.drawTiled(s,project.phase,width,height,{...options,cancelled:()=>Date.now()-started>45000});
       const drawMs=performance.now()-now,item={label,width,height,prepareMs,drawMs,ok,lost:r.gl.isContextLost(),error:r.gl.getError(),bakes:r.bakeUploads||0,fieldResolution:r.fieldResolution||0};
       if(ok){const pixels=r.pixels();item.lit=pixels.filter((v,i)=>i%4!==3&&v>40).length;item.png=r.canvas.toDataURL();}
       results.push(item);await qaEvent({...item,png:undefined,stage:'draw-done'});
       if(!ok||item.lost||label==='full64-warm'&&drawMs>15000)break;
      }
      const result={results,unchangedSource:JSON.stringify(s)===before};r.dispose();return result;
    }''',fixture)
    b.close()
    for item in result['results']:
        if 'png' in item:(out/(item['label']+'.png')).write_bytes(base64.b64decode(item.pop('png').split(',')[1]))
    (out/'baseline-results.json').write_text(json.dumps(result,indent=2))
    print('BASELINE COMPLETE',flush=True)
