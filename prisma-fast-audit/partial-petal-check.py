"""Real GPU regression: default soap bubble -> partial petals, then animation.
Run sequentially with other GPU work. Examples:
  python partial-petal-check.py --label before --renderer baseline --sizes 96
  python partial-petal-check.py --label after --renderer current --sizes 96,256 --ui
No rendering is stubbed. Mesa timings do not represent the user's RTX 5090.
"""
import argparse, base64, json, statistics, time
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4183')
parser.add_argument('--label', default='after')
parser.add_argument('--renderer', choices=['baseline','current'], default='current')
parser.add_argument('--sizes', default='96,256')
parser.add_argument('--ui', action='store_true')
parser.add_argument('--ui-only', action='store_true')
args=parser.parse_args()
out=Path('/workspace/prisma-fast-audit'); out.mkdir(exist_ok=True)
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=browser.new_page(viewport={'width':1280,'height':900});page.set_default_timeout(150000)
 page.on('console',lambda m:print(m.text[:700],flush=True))
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/__audit__',lambda r:r.fulfill(body='<html><style>body{background:#181a20;color:white;font:16px sans-serif}canvas{image-rendering:auto;width:384px;height:384px}</style><h1>Partial petal regression</h1></html>',content_type='text/html'))
 page.route('**/__baseline_renderer.js',lambda r:r.fulfill(body=(out/'renderer-v12.js').read_text(),content_type='text/javascript'))
 page.goto(args.url+'/__audit__')
 result={}
 if not args.ui_only:
  result=page.evaluate(r'''async ({baseline,sizes,label})=>{
   const {Renderer}=await import(baseline?'/__baseline_renderer.js':'/renderer.js');
   const {newCreation}=await import('/creative-model.js');
   const canvas=document.createElement('canvas');document.body.append(canvas);const renderer=new Renderer(canvas);
   const output={label,renderer:baseline?'v12':'current',hardware:renderer.hardwareInfo(),cases:[],animation:[],loops:[],images:[],pageErrors:[]};
   const options={preview:true,quality:'fast'};
   let beat=performance.now(),gaps=[];const heartbeat=setInterval(()=>{const n=performance.now();gaps.push(n-beat);beat=n;},8);
   const tick=()=>new Promise(r=>setTimeout(r,20));
   const check=()=>{const error=renderer.gl.getError(),lost=renderer.gl.isContextLost();if(error||lost)throw Error(`GPU error ${error}; context lost ${lost}`);};
   const render=async(s,size,phase=0)=>{
    await tick();gaps=[];const begin=performance.now();await renderer.prepareAsync(s,phase,options);const prepared=performance.now();
    let attempts=0;while(renderer.draw(s,phase,size,size,options)===false){if(++attempts>10000)throw Error('No completed draw');await tick();}
    const submitted=performance.now();await renderer.waitForGpu(options);const completed=performance.now();await tick();check();
    return {prepareMs:prepared-begin,submitMs:submitted-prepared,gpuWaitMs:completed-submitted,totalMs:completed-begin,maxHeartbeatGapMs:Math.max(0,...gaps),heartbeatTicks:gaps.length,programs:renderer.programs?.size,growthUploads:renderer.growthUploads,fieldUploads:renderer.fieldUploads??renderer.bakeUploads,fieldResolution:renderer.fieldResolution};
   };
   const countPixel=(pixels)=>{let visible=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>15&&pixels[i+3]>0)visible++;return visible;};
   const scene=newCreation();console.log('HARDWARE '+JSON.stringify(output.hardware));
   for(const size of sizes){
    for(const amount of [0,.05,.15,.35,.7,1]){
     scene.petalAmount=amount;console.log(`BEGIN ${label} ${size}px petalAmount=${amount}`);
     const first=await render(scene,size),warm=[];for(let k=0;k<3;k++)warm.push(await render(scene,size));
     const item={size,amount,first,warm,visiblePixels:countPixel(renderer.pixels())};output.cases.push(item);
     output.images.push({name:`${label}-${size}-petals-${amount}`,url:canvas.toDataURL()});
     console.log('CASE '+JSON.stringify(item));
    }
   }
   scene.petalAmount=.35;scene.motions.petalOpen={...scene.motions.petalOpen,enabled:true,amplitude:.2,phase:0,cycles:1,curve:'sine'};scene.motions.rotateY={...scene.motions.rotateY,enabled:true,amplitude:360,mode:'cycle',cycles:1,phase:0};
   for(let i=0;i<12;i++){const phase=i/12*Math.PI*2,measurement=await render(scene,sizes[0],phase);output.animation.push({phase,...measurement});console.log(`ANIMATION ${i} ${measurement.totalMs.toFixed(1)}ms`);}
   await render(scene,sizes[0],0);const a=renderer.pixels();await render(scene,sizes[0],Math.PI*2);const b=renderer.pixels();let difference=0,maxDifference=0,changedChannels=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);difference+=d;maxDifference=Math.max(maxDifference,d);if(d)changedChannels++;}output.loops.push({difference,maxDifference,changedChannels,meanDifference:difference/a.length});
   clearInterval(heartbeat);renderer.dispose();return output;
  }''',{'baseline':args.renderer=='baseline','sizes':[int(s) for s in args.sizes.split(',')],'label':args.label})
  for img in result.pop('images'):
   (out/(img['name']+'.png')).write_bytes(base64.b64decode(img['url'].split(',')[1]))
  (out/(args.label+'-render-results.json')).write_text(json.dumps(result,indent=2))
  assert all(c['visiblePixels']>0 for c in result['cases']), 'Blank render'
  assert all(c['meanDifference']<.02 and c['maxDifference']<=4 for c in result['loops']), result['loops']
 if args.ui or args.ui_only:
  page.close();page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(150000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script(r'''(()=>{
   localStorage.setItem('prisma-preview-quality','fluid');
   window.auditUI={draws:0,completed:0,maxHeartbeat:0,contexts:[],submissions:[]};
   let at=performance.now();setInterval(()=>{const next=performance.now();window.auditUI.maxHeartbeat=Math.max(window.auditUI.maxHeartbeat,next-at);at=next;},8);
   const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const gl=get.apply(this,args);if(args[0]==='webgl2'&&this.id==='art'&&!window.auditUI.contexts.includes(gl)){
    window.auditUI.contexts.push(gl);for(const method of ['drawArrays','drawElements']){const orig=gl[method];gl[method]=function(...a){const start=performance.now(),v=orig.apply(this,a);window.auditUI.draws++;window.auditUI.submissions.push({at:start,ms:performance.now()-start,width:this.canvas.width,height:this.canvas.height});return v;};}
    const wait=gl.clientWaitSync;gl.clientWaitSync=function(...a){const v=wait.apply(this,a);if(v===this.ALREADY_SIGNALED||v===this.CONDITION_SATISFIED)window.auditUI.completed++;return v;};
   }return gl;};
  })();''')
  started=time.perf_counter();page.goto(args.url+'/',wait_until='domcontentloaded');page.wait_for_function('window.prismaReady===true')
  page.wait_for_function('window.auditUI.completed>0 && document.querySelector("#render-error").hidden')
  ui={'firstFrameSeconds':time.perf_counter()-started,'sliders':[]}
  page.locator('[data-tab="shape"]').click()
  for amount in [.05,.15,.35,.7,1]:
   before=page.evaluate('window.auditUI.completed');page.evaluate('window.auditUI.maxHeartbeat=0')
   started=time.perf_counter()
   page.locator('[data-param="petalAmount"]').evaluate('(el,value)=>{el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));}',str(amount))
   # A real click must update the UI even while the new geometry is being rendered.
   click_started=time.perf_counter();page.locator('[data-tab="color"]').click();page.locator('#add-color').wait_for();click_seconds=time.perf_counter()-click_started
   page.wait_for_function('(before)=>window.auditUI.completed>before && document.querySelector("#render-error").hidden',arg=before)
   item={'amount':amount,'frameSeconds':time.perf_counter()-started,'tabSwitchSeconds':click_seconds,**page.evaluate('({maxHeartbeatMs:window.auditUI.maxHeartbeat,draws:window.auditUI.draws,completed:window.auditUI.completed,width:document.querySelector("#art").width,height:document.querySelector("#art").height,lost:window.auditUI.contexts.some(g=>g.isContextLost())})')}
   ui['sliders'].append(item);print('UI '+json.dumps(item),flush=True)
   page.screenshot(path=str(out/f'{args.label}-ui-petals-{amount}.png'));page.locator('[data-tab="shape"]').click()
  # Actual deformation control and transport, not merely re-drawing a static state.
  page.locator('[data-tab="motion"]').click();before=page.evaluate('window.auditUI.completed')
  page.get_by_text('Comandi rapidi',exact=True).click();page.locator('[data-check="animateShape"]').check()
  page.wait_for_function('(before)=>window.auditUI.completed>=before+8',arg=before)
  ui['movement']=page.evaluate('({completed:window.auditUI.completed,phase:document.querySelector("#timeline").value,lost:window.auditUI.contexts.some(g=>g.isContextLost()),maxHeartbeatMs:window.auditUI.maxHeartbeat})')
  page.locator('#play').click();page.screenshot(path=str(out/f'{args.label}-ui-animation.png'))
  ui['pageErrors']=errors;(out/(args.label+'-ui-results.json')).write_text(json.dumps(ui,indent=2))
  assert not errors,errors;assert all(not q['lost'] for q in ui['sliders']);assert not ui['movement']['lost']
  print('UI PASS '+json.dumps(ui),flush=True)
 assert not errors,errors
 browser.close()
 print('PARTIAL PETAL REGRESSION PASS',flush=True)
