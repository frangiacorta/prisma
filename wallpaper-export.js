// Keep native module scopes and collect every local dependency, including particles.
const moduleRoot=new URL('./',import.meta.url);
const entries=['renderer.js?v=1882d3ed81c1','solid-renderer.js?v=1882d3ed81c1'].map(path=>new URL(path,moduleRoot).href);
const imports=/^([ \t]*(?:import\s+(?:[\w$*,{}\s]+?\s+from\s+)?|export\s+(?:\*|\{[^}]*\})(?:\s+as\s+\w+)?\s+from\s+))(['"])([^'"\r\n]+)\2/gm;
const safeJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

async function collectModules(){
 const modules={},queued=new Set(entries);let pending=[...entries];
 while(pending.length){
  const batch=await Promise.all(pending.map(async url=>{
   const response=await fetch(url,{redirect:'error'});if(!response.ok)throw Error('Impossibile preparare tutti i moduli dello sfondo.');
   const source=await response.text(),dependencies=[];
   // Runtime URLs cannot be made offline merely by copying a static module.
   if(/\bimport\s*\(|\bimport\s*\.\s*meta\b|\b(?:fetch|XMLHttpRequest|importScripts)\s*\(|\bnew\s+URL\s*\(/.test(source))throw Error('Lo sfondo contiene una dipendenza dinamica non inclusa.');
   const localBlobs=new Set(Array.from(source.matchAll(/\b([\w$]+)\s*(?:\?\?=|=)\s*URL\.createObjectURL\(\s*new\s+Blob\s*\(/g),match=>match[1]));
   for(const worker of source.matchAll(/\b(?:Worker|SharedWorker)\s*\(\s*([^,)]+)/g))if(!localBlobs.has(worker[1].trim()))throw Error('Lo sfondo contiene un worker esterno non incluso.');
   const rewritten=source.replace(imports,(match,prefix,quote,specifier)=>{
    if(!/^\.\.?\//.test(specifier)||/[\\%#]/.test(specifier))throw Error('Lo sfondo richiede un modulo esterno non incluso.');
    const resolved=new URL(specifier,url);
    if(resolved.origin!==moduleRoot.origin||resolved.protocol!==moduleRoot.protocol||!resolved.pathname.startsWith(moduleRoot.pathname)||!resolved.pathname.endsWith('.js')||(resolved.search&&!/^\?v=[a-z0-9-]+$/i.test(resolved.search)))throw Error('Dipendenza dello sfondo fuori dalla cartella dei moduli.');
    dependencies.push(resolved.href);return prefix+quote+resolved.href+quote;
   });
   // Fail closed if a future static declaration uses syntax this collector cannot resolve.
   const remainder=source.replace(imports,'');
   if(/^\s*import\b|^\s*export\s+(?:\*|\{[^}]*\})\s*(?:as\s+\w+\s*)?from\b/m.test(remainder))throw Error('Una dipendenza dello sfondo non è risolvibile.');
   return {url,source:rewritten,dependencies};
  }));
  pending=[];
  for(const entry of batch){modules[entry.url]=entry.source;for(const dependency of entry.dependencies)if(!queued.has(dependency)){queued.add(dependency);pending.push(dependency);}}
 }
 return modules;
}

export async function createWallpaper(snapshot){
 const modules=await collectModules();
 const scene={...snapshot,finishCompare:false,bgMode:snapshot.bgMode==='transparent'?'solid':snapshot.bgMode};
 const background=/^#[0-9a-f]{6}$/i.test(scene.background)?scene.background:'#000000';
 const html=`<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prisma Wallpaper</title>
 <style>html,body{margin:0;overflow:hidden;background:${background};width:100%;height:100%}canvas{width:100%;height:100%;display:block}#error{position:fixed;inset:1rem;color:white;font:16px system-ui}</style>
 <canvas id="art"></canvas><div id="error" hidden role="alert"></div><script>
 const modules=${safeJSON(modules)},imports={},urls=[];
 for(const [name,source]of Object.entries(modules)){const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));imports[name]=url;urls.push(url);}
 const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);
 Promise.all([import(${safeJSON(entries[0])}),import(${safeJSON(entries[1])})]).then(([{Renderer},{startWallpaper}])=>startWallpaper(document.getElementById('art'),${safeJSON(scene)},Renderer)).catch(error=>{const node=document.getElementById('error');node.hidden=false;node.textContent='Impossibile avviare lo sfondo: '+error.message;});
 addEventListener('pagehide',()=>{for(const url of urls)URL.revokeObjectURL(url);});
 <\/script></html>`;
 return new Blob([html],{type:'text/html'});
}
