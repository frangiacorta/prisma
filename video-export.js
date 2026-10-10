// One in-flight raw frame, cancellable requests and temporary-file lifecycle.
export async function removeVideoTemporaryFile(name){
 if(!name||!navigator.storage?.getDirectory)return;
 for(const delay of [0,80,250,1000]){
  if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
  try{const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle('prisma-video-exports');await dir.removeEntry(name);return;}catch(e){if(e.name==='NotFoundError')return;}
 }
}
export class VideoExportSession{
 constructor(){
  this.worker=new Worker(new URL('./encoder-worker.js?v=170c6bdce53c',import.meta.url));this.pending=new Map();this.nextId=0;this.storageName=`video-${crypto.randomUUID()}.mp4`;this.finished=false;
  this.worker.onmessage=({data})=>{const entry=this.pending.get(data.id);if(!entry)return;clearTimeout(entry.timer);this.pending.delete(data.id);if(data.error)entry.reject(new Error(data.error));else entry.resolve(data);};
  this.worker.onerror=e=>this.fail(new Error(e.message||'La codifica del video si è interrotta.'));
  this.worker.onmessageerror=()=>this.fail(new Error('Il browser non riesce a trasferire il video.'));
 }
 request(message,transfer=[]){
  if(!this.worker)return Promise.reject(new DOMException('Esportazione interrotta','AbortError'));
  const id=++this.nextId;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>this.fail(new Error('La codifica non risponde. L’esportazione è stata interrotta; puoi riprovare.')),120000);this.pending.set(id,{resolve,reject,timer});try{this.worker.postMessage({...message,id},transfer)}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e)}});
 }
 async init(options){return this.request({type:'init',...options,protocol:2,storageName:this.storageName});}
 async frame(pixels){return this.request({type:'frame',pixels},[pixels.buffer]);}
 async finish(){const result=await this.request({type:'finish'});this.finished=true;const storageName=result.storageName;return {...result,release:()=>removeVideoTemporaryFile(storageName)};}
 fail(error){for(const entry of this.pending.values()){clearTimeout(entry.timer);entry.reject(error);}this.pending.clear();this.worker?.terminate();this.worker=null;if(!this.finished)void removeVideoTemporaryFile(this.storageName);}
 abort(){this.fail(new DOMException('Esportazione interrotta','AbortError'));}
 dispose(){this.fail(new DOMException('Esportazione terminata','AbortError'));}
}
