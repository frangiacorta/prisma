// Standalone local companion for a downloaded GitHub Pages checkout.
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createCreativeAssistant} from './creative-assistant.mjs';
import {createCreativeDirector} from './creative-director.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function startRegiaServer(port=8242,root=path.resolve(here,'..')){
 const assistant=createCreativeAssistant(),director=createCreativeDirector(),json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const server=http.createServer(async(req,res)=>{
  const host=req.headers.host,allowed=[`127.0.0.1:${server.address().port}`,`localhost:${server.address().port}`];
  if(!allowed.includes(host)||req.headers.origin&&req.headers.origin!==`http://${host}`)return json(res,403,{error:'Accesso locale richiesto.'});
  try{
   const name=decodeURIComponent(new URL(req.url,`http://${host}`).pathname);
   if(name==='/health'&&req.method==='GET')return json(res,200,{app:'prisma-regia',director:true,version:1});
   if(name==='/api/assistant/status'&&req.method==='GET')return json(res,200,{...await assistant.status(),director:true});
   if(['/api/director','/api/assistant'].includes(name)&&req.method==='POST'){
    if(!assistant.authorized(req.headers['x-prisma-assistant'])||req.headers['sec-fetch-site']==='cross-site'||!req.headers['content-type']?.startsWith('application/json'))return json(res,403,{error:'Collegamento non valido.'});
    const chunks=[];let length=0;for await(const c of req){length+=c.length;if(length>3200000)throw Error('Richiesta troppo grande');chunks.push(c);}
    const controller=new AbortController();res.once('close',()=>{if(!res.writableEnded)controller.abort();});
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8')),result=await (name==='/api/director'?director.decide(body,{signal:controller.signal}):assistant.interpret(body,{signal:controller.signal}));
    if(!res.destroyed)json(res,200,result);return;
   }
   if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Metodo non disponibile.'});
   const target=path.resolve(root,'.'+(name.endsWith('/')?name+'index.html':name)),relative=path.relative(root,target),parts=relative.split(path.sep);
   if(relative.startsWith('..')||path.isAbsolute(relative)||parts.some(p=>p.startsWith('.')||['local','exports','node_modules'].includes(p)))return json(res,403,{error:'Percorso non disponibile.'});
   const info=await stat(target);if(!info.isFile())throw Error('File non disponibile');
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.txt':'text/plain; charset=utf-8'};
   const headers={'Content-Type':types[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Accept-Ranges':'bytes'};
   const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);let start=0,end=info.size-1,status=200;
   if(range){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;if(start>end||start>=info.size)return json(res,416,{error:'Intervallo non valido'});status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;}
   res.writeHead(status,{...headers,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else createReadStream(target,{start,end}).on('error',()=>res.destroy()).pipe(res);
  }catch(error){if(!res.headersSent)json(res,error.code==='ENOENT'?404:400,{error:error.message});else res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});server.once('close',()=>{assistant.close();director.close();});return {server,url:`http://127.0.0.1:${server.address().port}/`};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log((await startRegiaServer()).url);
