import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const app=fs.readFileSync('/workspace/prisma-studio/dist/app.js','utf8');
const downloadSource=app.slice(app.indexOf('async function download(){'),app.indexOf("}$('#download').onclick=download;")+1);
const thumbnailSource=app.slice(app.indexOf('function thumbnail('),app.indexOf('async function showVariants()'));
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
function setup() {
 const log=[],elements=new Map();
 for(const [id,value] of [['#export-width','1024'],['#export-height','768'],['#file-format','png']])elements.set(id,{value});
 let context,created=0;
 const canvas=()=>({width:1,height:1,toBlob(callback,mime){log.push('blob');context.onBlob?.();queueMicrotask(()=>callback({type:mime}));},toDataURL:()=> 'data:image/webp;base64,AA=='});
 class MockRenderer {
  constructor(output){this.canvas=output;this.maxSize=4096;this.gl={isContextLost:()=>!!this.lost};created++;log.push('renderer created');}
  async drawAccumulated(source,phase,width,height,options){log.push('draw');this.last={source,phase,width,height,options};this.canvas.width=width;this.canvas.height=height;context.onDraw?.(this,options);if(context.drawError)throw Error('draw failed');return !options.cancelled?.();}
  async waitForGpu(options){log.push(options?'cancelable drain':'unconditional drain');context.onDrain?.(this,options);if(options?.cancelled?.())return false;this.inFlight=false;return true;}
  releaseSurface(){check(!this.inFlight,'surface is never released while GPU work remains');log.push('release');this.canvas.width=this.canvas.height=1;return !this.lost;}
  dispose(){log.push('dispose');this.disposed=true;}
  async prepareAsync(){log.push('prepare');return true;}
  draw(){log.push('thumbnail draw');this.inFlight=true;}
 }
 context=vm.createContext({console:{error:()=>{}},structuredClone,performance,Blob,setTimeout,clearTimeout,queueMicrotask,Renderer:MockRenderer,
  $:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);},state:{seed:37,renderVersion:2,bgMode:'transparent',background:'#000000',duration:1,speed:1},phase:.3,playing:false,previewRevision:0,dirty:false,refined:false,ratio:1,
  busy:false,cancelled:false,videoSession:null,exportRenderer:null,exportType:'image',exportFps:30,exportWidth:1024,exportHeight:768,renderer:null,thumbnailRenderer:null,thumbnailWork:0,thumbnailQueue:Promise.resolve(),
  setPlaying:value=>{context.playing=value;log.push('play '+value);},busyUI:value=>{context.busy=value;log.push('busy '+value);},progress:()=>{},updateExportSize:()=>{},awaitIdleStop:async()=>{log.push('idle drain');context.onIdle?.();},waitPaint:async()=>{log.push('paint');},save:()=>log.push('save'),uniqueDownloadName:()=> 'test',toast:()=>{},hasMotion:()=>true,
  document:{createElement:canvas},fetch:async()=>({ok:true,text:async()=>{context.onFetch?.();return 'shader';}}),
  getCreated:()=>created,log,elements
 });
 vm.runInContext(downloadSource+'\n'+thumbnailSource,context);
 return context;
}
{
 const c=setup();await c.download();const first=c.exportRenderer;
 check(c.log.indexOf('idle drain')<c.log.indexOf('draw'),'idle work drains before rendering');
 check(c.log.indexOf('blob')<c.log.indexOf('release'),'surface release follows blob generation');
 check(first.last.width===1024&&first.last.height===768&&first.last.options.samples===16,'image settings retain requested pixels and 16 samples');
 check(first.last.phase===.3,'exact captured phase preserved');
 check(first.canvas.width===1&&first.canvas.height===1,'large surface is released after download');
 await c.download();check(c.exportRenderer===first&&c.getCreated()===1,'second successful download reuses renderer');
 check(c.log.filter(x=>x==='save').length===2,'both successful images save');
}
{
 const c=setup();c.onBlob=()=>{c.cancelled=true;};await c.download();
 check(!c.log.includes('save'),'cancellation during toBlob prevents download');
 check(c.exportRenderer&&!c.busy,'blob cancellation retains reusable renderer and releases busy state');
}
{
 const c=setup();c.onDraw=(r)=>{r.inFlight=true;c.cancelled=true;};await c.download();
 check(!c.log.includes('save'),'cancellation during rendering prevents download');
 check(c.log.indexOf('unconditional drain')<c.log.indexOf('release'),'cancellation drains pending GPU work before release');
 check(c.log.indexOf('release')<c.log.indexOf('busy false'),'GPU slot remains busy through drain and release');
}
{
 const c=setup();c.onIdle=()=>{c.cancelled=true;};await c.download();check(c.getCreated()===0&&!c.busy,'cancellation while draining idle creates no export renderer');
}
{
 const c=setup();c.drawError=true;await c.download();check(c.exportRenderer===null&&c.log.includes('dispose'),'failed rendering discards renderer');
 c.drawError=false;await c.download();check(c.getCreated()===2&&c.log.includes('save'),'next download creates a fresh renderer after failure');
}
{
 const c=setup();c.exportType='wallpaper';c.onFetch=()=>{c.cancelled=true;};await c.download();check(!c.log.includes('save')&&c.getCreated()===0,'wallpaper fetch cancellation prevents file creation');
}
{
 const c=setup();let resolveQueue;c.thumbnailQueue=new Promise(r=>{resolveQueue=r;});const pending=c.download();await Promise.resolve();await Promise.resolve();
 check(!c.log.includes('draw'),'export waits for existing thumbnail queue');resolveQueue();await pending;check(c.log.includes('draw'),'export resumes after thumbnail queue drains');
}
{
 const c=setup();let isCancelled=false,observedDrain=false;
 c.onDrain=(r,options)=>{if(options){isCancelled=true;}else{observedDrain=true;check(c.thumbnailWork===1,'thumbnail retains GPU slot while unconditional drain runs');}};
 const result=await c.thumbnail(c.state,0,1,()=>isCancelled);
 check(result===null&&observedDrain&&c.thumbnailWork===0,'cancelled thumbnail drains before releasing slot');
 c.busy=true;const before=c.getCreated();await c.thumbnail(c.state);check(c.getCreated()===before,'thumbnail queued during export does not create renderer');
}
// Invoke actual Renderer accumulation with a CPU-only WebGL stub.
const rendererSource=fs.readFileSync('/workspace/prisma-studio/dist/renderer.js','utf8');
const {Renderer}=await import('data:text/javascript;base64,'+Buffer.from(rendererSource).toString('base64'));
for(const complete of [true,false]){
 const events=[],noop=()=>{};
 const functions={getExtension:()=>({}),createTexture:()=>({}),createFramebuffer:()=>({}),checkFramebufferStatus:()=>complete?1:0,drawArrays:()=>events.push('resolve'),isContextLost:()=>false,fenceSync:()=>{events.push('fence');return {};},flush:()=>events.push('flush'),clientWaitSync:()=>2,deleteSync:()=>events.push('fence completed')};
 const gl=new Proxy({FRAMEBUFFER_COMPLETE:1,ALREADY_SIGNALED:2,CONDITION_SATISFIED:3},{get:(target,k)=>k in target?target[k]:functions[k]||noop});
 const instance=Object.create(Renderer.prototype);Object.assign(instance,{gl,canvas:{width:1000,height:1000},completedFrames:0,resolveProgram:{},prepareAsync:async()=>true,drawTiled:async()=>{events.push('tiles');return true;},draw:()=>{throw Error('Unexpected unbounded fallback');}});
 check(await instance.drawAccumulated({renderVersion:2,seed:1},0,1000,1000,{samples:2}),'accumulation returns success');
 if(complete){check(events.join(',')==='tiles,tiles,resolve,fence,flush,fence completed','resolve receives fence, flush and completion wait');}
 else check(events.join(',')==='tiles','incomplete accumulation buffer falls back to bounded tiles');
 check(!instance.completionSync&&!instance.accumulation,'accumulation leaves no pending fence/resources after success');
}
console.log(`PASS ${checks} lifecycle assertions; no GPU used.`);
