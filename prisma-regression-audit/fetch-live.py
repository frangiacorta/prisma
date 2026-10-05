import urllib.request,urllib.error,hashlib,json,concurrent.futures,getpass
from pathlib import Path
root=Path('/workspace/prisma-studio/dist');base='https://prisma-forme-studio.francesco-gioia.chatgpt.site/'
files=['index.html','app.js','renderer.js','studio-model.js','model.js','panels.js','creative-model.js','description.js','preview-quality.js','style.css']
token=getpass.getpass('Site service token: ')
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs): return None
opener=urllib.request.build_opener(NoRedirect())
def read(f):
 try:
  req=urllib.request.Request(base+('' if f=='index.html' else f),headers={'OAI-Sites-Authorization':'Bearer '+token})
  r=opener.open(req,timeout=20);raw=r.read();local=(root/f).read_bytes();return {'file':f,'status':r.status,'type':r.headers.get('Content-Type'),'bytes':len(raw),'matchesCheckout':raw==local,'cache':r.headers.get('Cache-Control'),'sha256':hashlib.sha256(raw).hexdigest()}
 except urllib.error.HTTPError as e: return {'file':f,'status':e.code,'body':e.read(100).decode(errors='replace')}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as p: result=list(p.map(read,files))
Path('/workspace/prisma-regression-audit/live-assets.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
