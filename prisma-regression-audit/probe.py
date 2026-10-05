import json,time,threading,sys,subprocess
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT=Path('/workspace/prisma-studio')
version=sys.argv[1] if len(sys.argv)>1 else 'live'
old=subprocess.check_output(['git','show','0481199:dist/renderer.js'],cwd=ROOT)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path=='/__audit__/before.js':body=old;mime='text/javascript'
  elif self.path=='/__audit__/probe.html':body=b'<html><body>Renderer diagnostic</body></html>';mime='text/html'
  else:return super().do_GET()
  self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(body)
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
start=time.monotonic();events=[]
def log(kind,value):
 row={'seconds':round(time.monotonic()-start,3),'case':version,'event':kind,'value':value};events.append(row);print(json.dumps(row),flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'])
 page=b.new_page(viewport={'width':1280,'height':800});page.set_default_timeout(10000)
 page.on('console',lambda msg:log('console',msg.text[:500]))
 page.on('pageerror',lambda err:log('error',str(err)))
 page.on('crash',lambda:log('crash',True))
 page.add_init_script('''(()=>{
 const proto=WebGL2RenderingContext.prototype;
 for(const name of ['compileShader','getShaderParameter','linkProgram','getProgramParameter','drawArrays']){
  const original=proto[name];proto[name]=function(...args){const start=performance.now();console.log('begin '+name+' '+args[1]);const value=original.apply(this,args);console.log('end '+name+' '+Math.round(performance.now()-start)+'ms');return value;};
 }
 document.addEventListener('webglcontextlost',e=>console.log('CONTEXT_LOST'),true);
 })();''')
 url='http://127.0.0.1:'+str(server.server_port)
 if version=='startup':
  log('navigation','current default app');page.goto(url,wait_until='domcontentloaded',timeout=15000)
  page.wait_for_timeout(15000)
  log('dom',page.evaluate('({canvas:[...document.querySelectorAll("canvas")].map(c=>[c.width,c.height]),text:document.body.innerText.slice(0,250)})'))
 else:
  page.goto(url+'/__audit__/probe.html')
  log('test','starting real renderer, 96x96, single identical crown fixture')
  result=page.evaluate('''async version=>{
    const {Renderer}=await import(version==='before'?'/__audit__/before.js':'/renderer.js');
    const {newCreation,sculpt}=await import('/creative-model.js');
    const {MATERIAL_STYLES}=await import('/studio-model.js');
    const r=new Renderer(document.createElement('canvas'));
    const dbg=r.gl.getExtension('WEBGL_debug_renderer_info');console.log('GPU '+r.gl.getParameter(dbg?dbg.UNMASKED_RENDERER_WEBGL:r.gl.RENDERER));
    const s=sculpt(newCreation(),1);Object.assign(s,MATERIAL_STYLES.find(m=>m.name==='Opaco').values,{scale:.7,petalBlend:0,petalRoot:0,petalRandom:0,dispersion:0,subsurface:0,scattering:0,translucency:0});
    const times=[];for(let i=0;i<3;i++){const start=performance.now();r.draw(s,0,96,96,{preview:true});r.pixels();times.push(performance.now()-start);console.log('frame '+i+' '+Math.round(times[i])+'ms');}
    const out={times,error:r.gl.getError(),lost:r.gl.isContextLost()};r.dispose();return out;
  }''',version)
  log('result',result)
 b.close()
Path('/workspace/prisma-regression-audit/probe-'+version+'.json').write_text(json.dumps(events,indent=2))
server.shutdown()
