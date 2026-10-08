import {exportBitrate,makePreset} from './model.js';
import {runtimeConfig} from './runtime-config.js';

async function request(url,options){
 const response=await fetch(url,options);
 if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Salvataggio locale non disponibile. Riavvia PRISMA-CREATIVO.cmd.');}
 return response.json();
}

export async function createExportTarget(library,parameters,settings,signal,{mode=runtimeConfig.exportMode,storage=globalThis.navigator?.storage}={}){
 const {StreamTarget,BufferTarget}=library;
 if(mode==='local'){
  const {id}=await request('/api/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(makePreset(parameters,settings)),signal});
  const endpoint='/api/render/'+id;let sequence=0;
  return {
   target:new StreamTarget(new WritableStream({async write({data,position}){
    await request(endpoint,{method:'PUT',headers:{'Content-Type':'application/octet-stream','X-Prisma-Offset':String(position),'X-Prisma-Sequence':String(sequence)},body:data,signal});sequence++;
   }}),{chunked:true,chunkSize:1024*1024}),
   streamed:true,
   finish:report=>request(endpoint+'/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report),signal}),
   discard:()=>request(endpoint,{method:'DELETE'}).catch(()=>{}),
  };
 }
 if(mode!=='browser')throw new Error('Destinazione del video non valida.');
 const filename=`Prisma-Pathfinder-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID().slice(0,8)}.mp4`;
 const expected=exportBitrate(settings)*parameters.duration/8;
 const memoryLimit=96*1024*1024;
 let directory,handle,writer,target,videoUrl,metadataUrl,closed=false,discarded=false;
 const remove=async()=>{if(directory&&handle)await directory.removeEntry(filename).catch(()=>{});};
 const dispose=async()=>{
  if(discarded)return;discarded=true;
  if(videoUrl)URL.revokeObjectURL(videoUrl);
  if(metadataUrl)URL.revokeObjectURL(metadataUrl);
  if(writer&&!closed)await writer.abort().catch(()=>{});
  await remove();
 };
 try{
  if(storage?.getDirectory){
   try{
    const root=await storage.getDirectory();
    directory=await root.getDirectoryHandle('prisma-pathfinder-exports',{create:true});
    const estimate=await storage.estimate?.();
    if(estimate?.quota&&estimate.quota-(estimate.usage||0)<expected*1.5+16*1024*1024)
     throw new DOMException('Spazio insufficiente per questo video. Riduci durata, formato o qualità.','QuotaExceededError');
    handle=await directory.getFileHandle(filename,{create:true});
    if(!handle.createWritable)throw new Error('Scrittura progressiva non supportata');
    writer=await handle.createWritable();
   }catch(error){
    await remove();handle=null;writer=null;
    if(error.name==='QuotaExceededError')throw error;
    if(expected>memoryLimit)throw new Error('Questo browser non può salvare un video così lungo. Riduci durata, formato o qualità, oppure usa Prisma sul PC.');
   }
  }
  if(writer){
   target=new StreamTarget(new WritableStream({
    async write({data,position}){signal.throwIfAborted();await writer.write({type:'write',position,data});},
    async close(){await writer.close();closed=true;},
    async abort(){await writer.abort().catch(()=>{});closed=true;},
   }),{chunked:true,chunkSize:1024*1024});
  }else{
   if(expected>memoryLimit)throw new Error('Per questo browser scegli un video più breve, HD o qualità Standard.');
   target=new BufferTarget();
   target.on('write',({end})=>{if(end>memoryLimit)throw new Error('Video troppo grande per la memoria del browser. Riduci durata o qualità.');});
  }
  signal.throwIfAborted();
  return {
   target,streamed:!!writer,discard:dispose,
   async finish(report){
    signal.throwIfAborted();
    const file=handle?await handle.getFile():new Blob([target.buffer],{type:'video/mp4'});
    if(file.size<32)throw new Error('Il video esportato è vuoto.');
    videoUrl=URL.createObjectURL(file);
    metadataUrl=URL.createObjectURL(new Blob([JSON.stringify({preset:makePreset(parameters,settings),report},null,2)],{type:'application/json'}));
    return {filename,url:videoUrl,metadataUrl,dispose,browser:true};
   },
  };
 }catch(error){await dispose();throw error;}
}
