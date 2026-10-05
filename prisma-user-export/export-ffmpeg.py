import asyncio,json,pathlib,time,subprocess,threading,http.server,urllib.parse,hashlib,os
from playwright.async_api import async_playwright
from PIL import Image
R=pathlib.Path('/workspace/prisma-user-export');P=json.loads(pathlib.Path('/workspace/attachments/4e93de70-cd4f-4a85-a8cb-2756bb8eb15a/Pasted text.txt').read_text());OUTPUT=R/'Palloncino-metallizzato-1080p-60fps.mp4';WIDTH=1920;HEIGHT=1080;COUNT=1440
log=open(R/'ffmpeg.log','w');command=['ffmpeg','-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgba','-video_size','1920x1080','-framerate','60','-i','pipe:0','-an','-vf','format=gbrp,zscale=primariesin=bt709:transferin=iec61966-2-1:matrixin=gbr:rangein=full:primaries=bt709:transfer=bt709:matrix=bt709:range=limited,format=yuv420p','-c:v','libx264','-preset','fast','-crf','18','-threads','2','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-movflags','+faststart',str(OUTPUT)]
proc=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log);hashes=[];failures=[]
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(R/'site'),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path=='/render-job':
   data=b'<html><style>body{margin:0;background:black}canvas{display:block}</style><canvas></canvas></html>';self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  else:super().do_GET()
 def do_POST(self):
  try:
   n=int(urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)['n'][0]);size=int(self.headers.get('Content-Length','0'))
   assert n==len(hashes) and n<COUNT and size==WIDTH*HEIGHT*4,(n,len(hashes),size)
   data=self.rfile.read(size);assert len(data)==size
   if n in [0,360,720,1080,1439]:Image.frombytes('RGBA',(WIDTH,HEIGHT),data).convert('RGB').save(R/f'source-frame-{n:04}.png')
   digest=hashlib.sha256(data).hexdigest();proc.stdin.write(data);proc.stdin.flush();hashes.append(digest)
   self.send_response(204);self.send_header('Content-Length','0');self.end_headers()
  except Exception as e:
   failures.append(str(e));self.send_response(500);self.end_headers();self.wfile.write(str(e).encode())
server=http.server.ThreadingHTTPServer(('127.0.0.1',4191),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
def report(x):print(json.dumps(x),flush=True);(R/'export-progress.json').write_text(json.dumps(x,indent=2))
async def main():
 try:
  async with async_playwright() as p:
   b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox']);page=await b.new_page(viewport={'width':1920,'height':1080});await page.goto('http://127.0.0.1:4191/render-job');await page.expose_function('report',report)
   result=await page.evaluate('''async p=>{
    const {CachedRenderer}=await import('/cached-export.js'),r=new CachedRenderer(document.querySelector('canvas')),width=1920,height=1080,totalFrames=1440;
    await report({stage:'preparing',gpu:r.hardwareInfo()});await r.bake(p.state,p.phase,width,height,2);
    const checks=[];for(const offset of [0,Math.PI/2,Math.PI,Math.PI*1.5]){r.mode='baseline';await r.drawAccumulated(p.state,p.phase+offset,width,height,{samples:2});const baseline=r.pixels();r.mode='cached';await r.drawAccumulated(p.state,p.phase+offset,width,height,{samples:2});const actual=r.pixels();let max=0,sum=0;for(let i=0;i<actual.length;i++){const d=Math.abs(actual[i]-baseline[i]);max=Math.max(max,d);sum+=d;}checks.push({phase:p.phase+offset,max,mean:sum/actual.length});if(max>0)throw Error('Cached frame differs from exact shader');}
    await report({stage:'verified',checks});const started=performance.now();let maxFrameMs=0;
    for(let n=0;n<totalFrames;n++){const t=performance.now(),phase=(p.phase+n/totalFrames*Math.PI*2)%(Math.PI*2);await r.drawAccumulated(p.state,phase,width,height,{samples:2});const pixels=r.pixels(),response=await fetch('/frame?n='+n,{method:'POST',body:pixels});if(!response.ok)throw Error(await response.text());maxFrameMs=Math.max(maxFrameMs,performance.now()-t);if(n%60===0||n===totalFrames-1)await report({stage:'rendering',frame:n+1,totalFrames,elapsedSec:(performance.now()-started)/1000,etaSec:(performance.now()-started)/(n+1)*(totalFrames-n-1)/1000});}
    r.dispose();return {checks,width,height,totalFrames,fps:60,duration:24,phase:p.phase,maxFrameMs,elapsedSec:(performance.now()-started)/1000};
   }''',P)
   await b.close()
  proc.stdin.close();code=proc.wait(timeout=120);assert code==0,(code,failures);assert len(hashes)==COUNT and len(set(hashes))==COUNT,(len(hashes),len(set(hashes)));(R/'frame-hashes.txt').write_text('\n'.join(hashes)+'\n')
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=codec_name,profile,width,height,r_frame_rate,avg_frame_rate,duration,nb_frames,nb_read_frames,pix_fmt,color_space,color_transfer,color_primaries,color_range','-show_entries','format=size,duration','-of','json',str(OUTPUT)]));result['probe']=probe;assert int(probe['streams'][0]['nb_read_frames'])==COUNT;assert float(probe['streams'][0]['duration'])==24
  result['sha256']=hashlib.sha256(OUTPUT.read_bytes()).hexdigest();result['uniqueSourceFrames']=len(set(hashes));result['ffmpegCommand']=command;result['file']=str(OUTPUT);(R/'export-result.json').write_text(json.dumps(result,indent=2));report({'stage':'complete','file':str(OUTPUT),'bytes':OUTPUT.stat().st_size,'result':result})
 finally:
  server.shutdown()
  if proc.poll() is None:proc.terminate()
asyncio.run(main())
