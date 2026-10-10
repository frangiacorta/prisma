/* Streaming MP4 export. Raw frames never accumulate; encoded media is written
 * to OPFS when available. The software fallback restarts every second so its
 * WASM filesystem never contains the entire movie. */
importScripts('./vendor/mp4-muxer.js?v=170c6bdce53c');
const BLOCK=1024*1024, MEMORY_LIMIT=512*1024*1024;
let encoder=null,muxer=null,sink=null,config=null,frameNumber=0,segmentFrames=0,segmentStart=0,encoderError=null,nativePending=0;
let stats={};
class OutputSink{
 async open(name,memoryOnly){
  this.name=name;this.length=0;this.blocks=[];
  if(!memoryOnly&&navigator.storage?.getDirectory){
   try{this.directory=await (await navigator.storage.getDirectory()).getDirectoryHandle('prisma-video-exports',{create:true});
    // Recover disk space after a tab/browser was closed before download cleanup.
    for await(const [oldName,handle] of this.directory.entries()){if(handle.kind==='file'&&/^video-.*\.mp4$/.test(oldName)){try{const old=await handle.getFile();if(Date.now()-old.lastModified>24*60*60*1000)await this.directory.removeEntry(oldName);}catch{}}}
    this.file=await this.directory.getFileHandle(name,{create:true});this.access=await this.file.createSyncAccessHandle();this.access.truncate(0);}
   catch(e){try{this.access?.close();await this.directory?.removeEntry(name)}catch{}this.access=null;this.file=null;}
  }
  return this;
 }
 write(data,position){
  if(this.access){let written=0;while(written<data.length){const n=this.access.write(data.subarray(written),{at:position+written});if(!n)throw new Error('Spazio insufficiente per completare il video.');written+=n;}}
  else{if(position+data.length>MEMORY_LIMIT)throw new Error('Il browser non rende disponibile lo spazio temporaneo su disco. Per questo video lungo usa Chrome fuori dalla modalità privata, oppure riduci risoluzione o durata.');let offset=0;while(offset<data.length){const index=Math.floor((position+offset)/BLOCK),within=(position+offset)%BLOCK,n=Math.min(BLOCK-within,data.length-offset);const block=this.blocks[index]||(this.blocks[index]=new Uint8Array(BLOCK));block.set(data.subarray(offset,offset+n),within);offset+=n;}}
  this.length=Math.max(this.length,position+data.length);
 }
 async finish(){
  if(this.access){this.access.truncate(this.length);this.access.flush();this.access.close();this.access=null;return this.file.getFile();}
  const parts=[];for(let i=0;i<Math.ceil(this.length/BLOCK);i++)parts.push((this.blocks[i]||new Uint8Array(BLOCK)).subarray(0,Math.min(BLOCK,this.length-i*BLOCK)));
  const blob=new Blob(parts,{type:'video/mp4'});this.blocks=[];return blob;
 }
 async discard(){try{this.access?.close()}catch{}this.access=null;this.blocks=[];try{await this.directory?.removeEntry(this.name)}catch{}}
}
function closeEncoder(){if(!encoder)return;if(stats.backend==='native'){try{encoder.close()}catch{}}else{const fs=encoder.FS,name=encoder.outputFilename;try{encoder.delete()}catch{}try{fs.unlink(name)}catch{}}encoder=null;}
function check(){if(encoderError)throw encoderError;}
async function softwareEncoder(){
 if(!self.HME)importScripts('./vendor/h264-mp4-encoder.web.js?v=170c6bdce53c');
 encoder=await HME.createH264MP4Encoder();encoder.width=config.width;encoder.height=config.height;encoder.frameRate=config.fps;encoder.speed=8;encoder.quantizationParameter=20;encoder.groupOfPictures=config.fps;encoder.initialize();segmentFrames=0;segmentStart=frameNumber;
}
async function nativeEncoder(){
 if(typeof VideoEncoder==='undefined'||typeof VideoFrame==='undefined'||config.forceSoftware)return false;
 const pixels=config.width*config.height,mb=Math.ceil(config.width/16)*Math.ceil(config.height/16),rate=mb*config.fps;
 const level=mb>36864||rate>2073600?'3e':mb>8704||rate>522240?'34':mb>8192||rate>245760?'2a':'28';
 const candidate={codec:`avc1.4200${level}`,width:config.width,height:config.height,framerate:config.fps,bitrate:Math.round(Math.max(2e6,Math.min(90e6,pixels*config.fps*.14))),latencyMode:'realtime',avc:{format:'avc'}};
 try{const supported=await VideoEncoder.isConfigSupported(candidate);if(!supported.supported)return false;encoder=new VideoEncoder({output:(chunk,meta)=>{try{muxer.addVideoChunk(chunk,meta);stats.encodedFrames++;nativePending=Math.max(0,nativePending-1);}catch(e){encoderError=e;}},error:e=>{encoderError=e;}});encoder.configure(supported.config);return true;}
 catch{try{encoder?.close()}catch{}encoder=null;return false;}
}
function remuxSegment(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u32=p=>view.getUint32(p),type=p=>String.fromCharCode(...bytes.subarray(p,p+4));
 function boxes(start,end){const out=[];for(let p=start;p+8<=end;){let size=u32(p),header=8;if(size===1){size=Number(view.getBigUint64(p+8));header=16;}if(!size)size=end-p;if(size<header||p+size>end)throw new Error('Segmento MP4 incompleto.');out.push({type:type(p+4),start:p,data:p+header,end:p+size});p+=size;}return out;}
 const child=(box,name)=>{const b=boxes(box.data,box.end).find(x=>x.type===name);if(!b)throw new Error(`Tabella MP4 mancante: ${name}`);return b;};
 const moov=boxes(0,bytes.length).find(b=>b.type==='moov');if(!moov)throw new Error('Segmento MP4 non valido.');
 let stbl;for(const trak of boxes(moov.data,moov.end).filter(b=>b.type==='trak')){const mdia=child(trak,'mdia'),hdlr=child(mdia,'hdlr');if(type(hdlr.data+8)==='vide')stbl=child(child(mdia,'minf'),'stbl');}if(!stbl)throw new Error('Traccia video assente.');
 const stsd=child(stbl,'stsd'),entry=boxes(stsd.data+8,stsd.end)[0];if(entry?.type!=='avc1')throw new Error('Codec video software non supportato.');
 const avcC=boxes(entry.data+78,entry.end).find(b=>b.type==='avcC');if(!avcC)throw new Error('Configurazione AVC assente.');
 const description=bytes.slice(avcC.data,avcC.end),codec=`avc1.${Array.from(description.subarray(1,4),n=>n.toString(16).padStart(2,'0')).join('')}`;
 const stsz=child(stbl,'stsz'),fixed=u32(stsz.data+4),count=u32(stsz.data+8),stsc=child(stbl,'stsc');if(count!==segmentFrames)throw new Error(`Fotogrammi mancanti nel segmento (${count}/${segmentFrames}).`);
 const tables=boxes(stbl.data,stbl.end),offsets=tables.find(b=>b.type==='stco'||b.type==='co64'),sync=tables.find(b=>b.type==='stss');if(!offsets)throw new Error('Posizioni dei campioni MP4 mancanti.');
 const keys=new Set();if(sync)for(let i=0;i<u32(sync.data+4);i++)keys.add(u32(sync.data+8+i*4));
 const runs=[];for(let i=0;i<u32(stsc.data+4);i++){const p=stsc.data+8+i*12;runs.push({first:u32(p),samples:u32(p+4)});}
 let sample=0,run=0;for(let chunk=1;chunk<=u32(offsets.data+4);chunk++){
  while(run+1<runs.length&&runs[run+1].first<=chunk)run++;
  let pos=offsets.type==='co64'?Number(view.getBigUint64(offsets.data+8+(chunk-1)*8)):u32(offsets.data+8+(chunk-1)*4);
  for(let n=0;n<runs[run].samples;n++){
   const size=fixed||u32(stsz.data+12+sample*4),index=segmentStart+sample,timestamp=Math.round(index*1e6/config.fps),duration=Math.round((index+1)*1e6/config.fps)-timestamp;
   if(pos+size>bytes.length||sample>=count)throw new Error('Campione MP4 fuori dai limiti.');
   muxer.addVideoChunkRaw(bytes.subarray(pos,pos+size),!sync||keys.has(sample+1)?'key':'delta',timestamp,duration,sample===0?{decoderConfig:{codec,codedWidth:config.width,codedHeight:config.height,description}}:undefined);
   stats.encodedFrames++;sample++;pos+=size;
  }
 }
 if(sample!==count)throw new Error('Conteggio MP4 incompleto.');
}
async function finishSegment(restart){
 if(!segmentFrames)return;
 encoder.finalize();const fs=encoder.FS,name=encoder.outputFilename,bytes=fs.readFile(name);stats.largestSoftwareSegment=Math.max(stats.largestSoftwareSegment,bytes.length);remuxSegment(bytes);closeEncoder();stats.softwareSegments++;if(restart)await softwareEncoder();
}
async function initialize(data){
 closeEncoder();await sink?.discard();frameNumber=0;segmentFrames=0;encoderError=null;nativePending=0;
 if(!Number.isInteger(data.width)||!Number.isInteger(data.height)||data.width<64||data.height<64||data.width>4096||data.height>4096||data.width%2||data.height%2||![30,60].includes(data.fps))throw new Error('Dimensioni o frequenza video non valide.');
 // A tab opened before streaming export was deployed sends no frame count and
 // expects `buffer` at finish. Keep that wire protocol working across deploys.
 // Explicitly invalid counts must never be mistaken for this legacy protocol.
 const hasFrameCount=Object.prototype.hasOwnProperty.call(data,'totalFrames');
 if(!hasFrameCount&&data.protocol===2)throw new Error('Manca il numero di fotogrammi del video. Ricarica la pagina e riprova.');
 if(hasFrameCount&&(!Number.isFinite(data.totalFrames)||!Number.isInteger(data.totalFrames)))throw new Error('Il numero di fotogrammi del video non è valido. Ricarica la pagina e riprova.');
 if(hasFrameCount&&data.totalFrames<1)throw new Error('Il video deve contenere almeno un fotogramma.');
 const maxFrames=data.fps*3600;
 if(hasFrameCount&&data.totalFrames>maxFrames)throw new Error('Il video supera un’ora. Riduci la durata del loop o aumenta la velocità.');
 config={...data,totalFrames:hasFrameCount?data.totalFrames:null,maxFrames,legacy:!hasFrameCount};
 const name=/^[a-zA-Z0-9_-]+\.mp4$/.test(data.storageName||'')?data.storageName:`video-${crypto.randomUUID()}.mp4`;
 sink=await new OutputSink().open(name,data.memoryOnly);stats={backend:'software',storage:sink.access?'disk':'memory',frames:0,encodedFrames:0,maxPendingFrames:0,softwareSegments:0,largestSoftwareSegment:0};
 muxer=new Mp4Muxer.Muxer({target:new Mp4Muxer.StreamTarget({onData:(bytes,position)=>sink.write(bytes,position),chunked:true,chunkSize:BLOCK}),video:{codec:'avc',width:data.width,height:data.height,frameRate:data.fps},fastStart:hasFrameCount?{expectedVideoChunks:data.totalFrames}:false});
 if(await nativeEncoder())stats.backend='native';else await softwareEncoder();
 return {ready:true,storageName:sink.access?name:null,stats:{...stats}};
}
async function addFrame(data){
 check();if(!encoder)throw new Error('La codifica del video non è attiva.');
 if(frameNumber>=(config.totalFrames??config.maxFrames))throw new Error(config.legacy?'Il video supera un’ora. Riduci la durata del loop o aumenta la velocità.':'Sono arrivati più fotogrammi del previsto.');
 const pixels=data.pixels;if(!(pixels instanceof Uint8Array)||pixels.length!==config.width*config.height*4)throw new Error('Fotogramma video non valido.');
 if(stats.backend==='native'){
  const timestamp=Math.round(frameNumber*1e6/config.fps),duration=Math.round((frameNumber+1)*1e6/config.fps)-timestamp,frame=new VideoFrame(pixels,{format:'RGBA',codedWidth:config.width,codedHeight:config.height,timestamp,duration});
  try{encoder.encode(frame,{keyFrame:frameNumber%(config.fps*2)===0});nativePending++;stats.maxPendingFrames=Math.max(stats.maxPendingFrames,nativePending);}finally{frame.close();}
  const queueLimit=Math.max(1,Math.min(8,Math.floor(64*1024*1024/(config.width*config.height*4))));
  if(nativePending>=queueLimit){await encoder.flush();check();}
  frameNumber++;
 }else{encoder.addFrameRgba(pixels);segmentFrames++;frameNumber++;stats.maxPendingFrames=Math.max(stats.maxPendingFrames,segmentFrames);if(segmentFrames>=config.fps)await finishSegment(config.totalFrames===null||frameNumber<config.totalFrames);}
 stats.frames=frameNumber;check();return {frame:true,frames:frameNumber};
}
async function finish(){
 check();if(!frameNumber)throw new Error('Il video non contiene fotogrammi.');
 if(config.totalFrames!==null&&frameNumber!==config.totalFrames)throw new Error(`Il video è incompleto: ${frameNumber} di ${config.totalFrames} fotogrammi.`);
 if(stats.backend==='native'){await encoder.flush();check();closeEncoder();}else{if(segmentFrames&&encoder)await finishSegment(false);closeEncoder();}
 if(stats.encodedFrames!==frameNumber)throw new Error('La codifica non ha restituito tutti i fotogrammi.');
 muxer.finalize();const storageName=sink.file?sink.name:null,blob=await sink.finish();stats.bytes=blob.size;muxer=null;
 // Blob is a BlobPart, so the old client's new Blob([result.buffer]) remains
 // compatible without copying a potentially large file into an ArrayBuffer.
 return {blob,...(config.legacy?{buffer:blob}:{}),storageName,stats:{...stats}};
}
let pending=Promise.resolve();
self.onmessage=({data})=>{pending=pending.then(async()=>{try{let result;if(data.type==='init')result=await initialize(data);else if(data.type==='frame')result=await addFrame(data);else if(data.type==='finish')result=await finish();else if(data.type==='abort'){closeEncoder();await sink?.discard();result={aborted:true};}else throw new Error('Comando di esportazione sconosciuto.');self.postMessage({id:data.id,...result});}catch(e){closeEncoder();await sink?.discard();self.postMessage({id:data.id,error:e.name==='QuotaExceededError'?'Spazio temporaneo su disco insufficiente. Libera spazio e riprova.':e.message||String(e)});}});};
