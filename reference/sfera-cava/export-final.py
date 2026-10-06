import asyncio,json,pathlib,time,subprocess,threading,http.server,urllib.parse,hashlib,os
from playwright.async_api import async_playwright
from PIL import Image
R=pathlib.Path(__file__).resolve().parent
P=json.loads((R/'preset-finale.json').read_text());WIDTH=2560;HEIGHT=1440;FPS=60;COUNT=1920;CHUNK=60;SAMPLES=2
OUTPUT=R/'Sfera-cava-loop-1440p-60fps.mp4'
PARTS=R/'parts';PARTS.mkdir(exist_ok=True)
proc=None;log=None;hashes=[];timings=[];failures=[];expected=0
for part in range(COUNT//CHUNK):
 file=PARTS/f'part-{part:03}.mp4';info=PARTS/f'part-{part:03}.json'
 if not file.exists() or not info.exists():break
 metrics=json.loads(info.read_text());assert len(metrics['hashes'])==CHUNK
 hashes.extend(metrics['hashes']);timings.extend(metrics['timings']);expected+=CHUNK
START=expected
COLOR=['-vf','format=gbrp,zscale=primariesin=bt709:transferin=iec61966-2-1:matrixin=gbr:rangein=full:primaries=bt709:transfer=bt709:matrix=bt709:range=limited,format=yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv']
def begin(part):
 global proc,log
 log=open(PARTS/f'part-{part:03}.log','w')
 proc=subprocess.Popen(['ffmpeg','-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgba','-video_size',f'{WIDTH}x{HEIGHT}','-framerate',str(FPS),'-i','pipe:0','-an',*COLOR,'-c:v','libx264','-preset','fast','-crf','16','-threads','1','-g','60','-keyint_min','60',str(PARTS/f'part-{part:03}.mp4')],stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log)
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(R/'site'),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path=='/render-job':
   data=b'<html><style>body{margin:0;background:black}</style><canvas></canvas></html>';self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  else:super().do_GET()
 def do_POST(self):
  global expected,proc
  try:
   q=urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query);n=int(q['n'][0]);size=int(self.headers.get('Content-Length','0'))
   assert n==expected and n<COUNT and size==WIDTH*HEIGHT*4,(n,expected,size)
   data=self.rfile.read(size);assert len(data)==size
   if n%CHUNK==0:begin(n//CHUNK)
   if n in [0,1,480,960,1440,1919]:Image.frombytes('RGBA',(WIDTH,HEIGHT),data).convert('RGB').save(R/f'source-frame-{n:04}.png')
   proc.stdin.write(data);proc.stdin.flush();hashes.append(hashlib.sha256(data).hexdigest());timings.append(float(q['ms'][0]));expected+=1
   if expected%CHUNK==0:
    proc.stdin.close();code=proc.wait(timeout=120);log.close();assert code==0,(code,n);proc=None
    (PARTS/f'part-{n//CHUNK:03}.json').write_text(json.dumps({'hashes':hashes[-CHUNK:],'timings':timings[-CHUNK:]}))
   self.send_response(204);self.send_header('Content-Length','0');self.end_headers()
  except Exception as e:
   failures.append(str(e));self.send_response(500);self.end_headers();self.wfile.write(str(e).encode())
server=http.server.ThreadingHTTPServer(('127.0.0.1',4194),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
def report(x):
 print(json.dumps(x),flush=True);(R/'export-progress.json').write_text(json.dumps(x,indent=2))
async def main():
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=await b.new_page(viewport={'width':WIDTH,'height':HEIGHT});await page.goto('http://127.0.0.1:4194/render-job');await page.expose_function('report',report)
   result=await page.evaluate('''async config=>{
    const {Renderer}=await import('/renderer.js'),r=new Renderer(document.querySelector('canvas')),{p,width,height,count,fps,start,samples}=config;
    await report({stage:'preparing',gpu:r.hardwareInfo(),width,height,fps,count,start,samples});
    const options={samples,preview:true,quality:'high'};
    // Compare both ends after complete native-resolution rendering.
    await r.drawAccumulated(p.state,0,width,height,options);const first=r.pixels();
    await r.drawAccumulated(p.state,Math.PI*2,width,height,options);const last=r.pixels();let max=0,sum=0,changed=0;
    for(let i=0;i<first.length;i++){const d=Math.abs(first[i]-last[i]);max=Math.max(max,d);sum+=d;if(d)changed++;}
    const loop={max,mean:sum/first.length,changed};if(loop.mean>.02)throw Error('Rendered loop endpoint discrepancy '+JSON.stringify(loop));
    await report({stage:'loop-verified',loop});const started=performance.now();
    for(let n=start;n<count;n++){
     const t=performance.now(),phase=n/count*Math.PI*2;
     const ok=await r.drawAccumulated(p.state,phase,width,height,options);if(!ok||r.gl.isContextLost())throw Error('Rendering failed at '+n);
     const ms=performance.now()-t,response=await fetch('/frame?n='+n+'&ms='+ms,{method:'POST',body:r.pixels()});if(!response.ok)throw Error(await response.text());
     if(n%10===0||n===count-1)await report({stage:'rendering',frame:n+1,totalFrames:count,percent:100*(n+1)/count,elapsedSec:(performance.now()-started)/1000,etaSec:(performance.now()-started)/(n-start+1)*(count-n-1)/1000,frameMs:ms});
    }
    r.dispose();return{loop,width,height,count,fps,duration:count/fps,samples,quality:'high',nativeRenderedFrames:true,elapsedSec:(performance.now()-started)/1000};
   }''',{'p':P,'width':WIDTH,'height':HEIGHT,'count':COUNT,'fps':FPS,'start':START,'samples':SAMPLES})
   await b.close()
  assert expected==COUNT and not failures,(expected,failures)
  manifest=PARTS/'concat.txt';manifest.write_text(''.join(f"file 'part-{i:03}.mp4'\n" for i in range(COUNT//CHUNK)))
  subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',str(manifest),'-c','copy','-movflags','+faststart',str(OUTPUT)],check=True)
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=codec_name,width,height,r_frame_rate,avg_frame_rate,duration,nb_frames,nb_read_frames,pix_fmt,color_space,color_transfer,color_primaries','-show_entries','format=size,duration','-of','json',str(OUTPUT)]));v=probe['streams'][0];assert v['width']==WIDTH and v['height']==HEIGHT and v['avg_frame_rate']=='60/1' and int(v['nb_read_frames'])==COUNT and float(v['duration'])==32
  subprocess.run(['ffmpeg','-v','error','-i',str(OUTPUT),'-f','null','-'],check=True)
  assert len(set(hashes))==COUNT,'Duplicate rendered frames'
  result.update({'probe':probe,'uniqueFrames':len(set(hashes)),'file':str(OUTPUT),'sha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),'meanFrameMs':sum(timings)/len(timings)})
  (R/'frame-hashes.txt').write_text('\n'.join(hashes)+'\n');(R/'export-result.json').write_text(json.dumps(result,indent=2));report({'stage':'complete','file':str(OUTPUT),'bytes':OUTPUT.stat().st_size,'result':result})
 finally:
  server.shutdown()
  if proc and proc.poll() is None:proc.terminate()
asyncio.run(main())
