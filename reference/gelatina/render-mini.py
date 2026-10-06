import json,base64,time,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parent;P=json.loads((R/'preset-mini-loop.json').read_text());WIDTH=480;HEIGHT=270;FPS=24;COUNT=192
frames=R/'frames';frames.mkdir(exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=browser.new_page(viewport={'width':WIDTH,'height':HEIGHT});page.route('**/gelatina-mini',lambda route:route.fulfill(content_type='text/html',body='<html><body style="margin:0;background:black"><canvas></canvas></body></html>'));page.goto('http://127.0.0.1:8083/gelatina-mini')
 print(page.evaluate('''async p=>{const{Renderer}=await import('/renderer.js');window.r=new Renderer(document.querySelector('canvas'));window.p=p;return r.hardwareInfo()}''',P),flush=True)
 loop=page.evaluate('''async()=>{const o={samples:1,preview:true,quality:'fast'};await r.drawAccumulated(p.state,0,480,270,o);const a=r.pixels();await r.drawAccumulated(p.state,2*Math.PI,480,270,o);const b=r.pixels();let max=0,sum=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);sum+=d;}return{max,mean:sum/a.length};}''');assert loop['mean']<.02,loop
 started=time.monotonic();timings=[]
 for n in range(COUNT):
  result=page.evaluate('''async n=>{const t=performance.now(),ok=await r.drawAccumulated(p.state,n/192*Math.PI*2,480,270,{samples:1,preview:true,quality:'fast'});if(!ok||r.gl.isContextLost())throw Error('Rendering failed');return{url:r.canvas.toDataURL('image/png'),ms:performance.now()-t}}''',n)
  (frames/f'{n:04}.png').write_bytes(base64.b64decode(result.pop('url').split(',')[1]));timings.append(result['ms'])
  if n%24==0 or n==COUNT-1:print(json.dumps({'frame':n+1,'total':COUNT,'elapsed':time.monotonic()-started}),flush=True)
 page.evaluate('r.dispose()');browser.close()
output=R/'Gelatina-mini-loop-8s.mp4'
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-framerate',str(FPS),'-i',str(frames/'%04d.png'),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(output)],check=True)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=width,height,avg_frame_rate,duration,nb_read_frames','-of','json',str(output)]));v=probe['streams'][0];assert v['width']==WIDTH and v['height']==HEIGHT and v['avg_frame_rate']=='24/1' and int(v['nb_read_frames'])==COUNT and float(v['duration'])==8
subprocess.run(['ffmpeg','-v','error','-i',str(output),'-f','null','-'],check=True)
(R/'render-result.json').write_text(json.dumps({'loop':loop,'probe':probe,'meanFrameMs':sum(timings)/len(timings),'file':str(output)},indent=2));print('COMPLETE',output,flush=True)
