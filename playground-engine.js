import {Renderer} from './renderer.js?v=2ed2af454163';
import {FlowDirector} from './playground-flow.js?v=2ed2af454163';
import {PlaygroundMixer} from './playground-mixer.js?v=2ed2af454163';
import {normalizeCreation} from './creative-model.js?v=2ed2af454163';
import {sceneOnly,parameterCatalog,readParameter,writeParameter,parameterFromUnit,colorMix,clamp,transitionSeconds,transitionValue} from './playground-model.js?v=2ed2af454163';
import {filterOverlay,mutationBetween} from './playground-performance.js?v=2ed2af454163';

export class PlaygroundEngine{
 constructor(canvas,config,notify=()=>{}){
  this.config=config;this.notify=notify;this.mixer=new PlaygroundMixer(canvas);this.decks={A:null,B:null};this.generation={A:0,B:0};this.pending={A:false,B:false};this.closed=false;this.clock=0;this.beats=0;this.job=null;this.ratio=config.ratio||16/9;this.height=config.resolution;this.scale=1;this.workload=1;this.last=0;this.lastAdapt=0;this.stats={frames:0,fps:0,ms:0};this.flow=new FlowDirector(this);this.frame=()=>this.tick(performance.now());this.animationWindow=window;this.raf=this.animationWindow.requestAnimationFrame(this.frame);
  this.heldFx={A:{},B:{},output:{}};
  this.listeners=new AbortController();
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.notify('notice','','Ripristino dell’uscita in corso…');},{signal:this.listeners.signal});
  canvas.addEventListener('webglcontextrestored',()=>{
   if(this.closed)return;
   this.mixer=new PlaygroundMixer(canvas);
   for(const [i,id] of ['A','B'].entries()){
    const d=this.decks[id];if(!d)continue;
    this.mixer.aspects[i]=d.ratio/this.ratio;this.mixer.upload(i,d.canvas);
    if(d.mutation?.fallback){d.mutation.fallback=false;d.mutation.start=Infinity;d.mutation.position=1;}
   }
   this.notify('notice','','Uscita ripristinata');
  },{signal:this.listeners.signal});
 }
 deckSnapshot(id){const d=this.decks[id];return d?{name:d.name,state:sceneOnly(d.state),phase:d.phase,ratio:d.ratio,playing:d.playing}:structuredClone(this.config.decks[id]);}
 captureManual(){
  if(this.manual)return;
  const keys=['mix','transition','direction','duration','unit','curve','quantize'];
  this.manual={decks:{A:this.deckSnapshot('A'),B:this.deckSnapshot('B')},settings:Object.fromEntries(keys.map(key=>[key,this.config[key]]))};
 }
 restoreManual(){
  const manual=this.manual;
  if(!manual||this.closed)return;
  this.manual=null;this.restoring=manual;this.job=null;
  Object.assign(this.config,manual.settings,{decks:structuredClone(manual.decks)});
  void Promise.allSettled(['A','B'].map(id=>this.load(id,manual.decks[id]))).then(()=>{
   if(this.restoring!==manual||this.closed)return;
   this.restoring=null;this.notify('flow');
  });
 }
 setHeldFx(bus,key,level){this.heldFx[bus][key]=level;if(bus!=='output')this.refresh(bus);}
 overlays(bus,modulations){
  const levels={...this.config.liveFx?.[bus]};
  if(modulations)for(const [key,offset] of Object.entries(modulations))if(key.startsWith('fx.'+bus+'.')){
   const id=key.split('.').at(-1);levels[id]=clamp((levels[id]||0)+offset);
  }
  return filterOverlay(levels,this.heldFx[bus]);
 }
 nextBeat(){return this.clock+(1-this.beats%1)*60/this.config.bpm;}
 async startAudio(file,host){
  const token=this.audioRevision=(this.audioRevision||0)+1;
  const {OrbAudioInput}=await import('./vendor/orb/orb-audio.js?v=2ed2af454163');
  if(this.closed||token!==this.audioRevision)return false;
  this.audio??=new OrbAudioInput();
  this.audio.attack=.055;this.audio.release=.2;
  try{return file?await this.audio.file(file,host):await this.audio.microphone(()=>this.notify('notice','','Ingresso audio scollegato.'));}
  catch(error){if(this.audioRevision===token)this.stopAudio();throw error;}
 }
 stopAudio(){this.audioRevision=(this.audioRevision||0)+1;this.audio?.stop();this.audioLevels=null;}
 modulations(){
  if(this.config.flow.enabled)return {};
  const values={};
  for(const m of this.config.modulations||[]){
   if(m.source==='off'||m.depth<=0)continue;
   const phase=(m.source==='beat'?this.beats:this.clock*m.rate)%1, audio=m.source==='low'||m.source==='high';
   const wave=audio?this.audioLevels?.[m.source]||0:m.source==='x'?this.config.macros[this.config.xyX].value:m.source==='y'?this.config.macros[this.config.xyY].value:m.source==='beat'?Math.exp(-phase*10):m.source==='triangle'?1-2*Math.abs(phase-.5):.5+.5*Math.sin(phase*Math.PI*2);
   const amount=m.depth*(wave-(audio?0:.5));
   if(amount)values[m.target]=(values[m.target]||0)+amount;
  }
  const seq=this.config.sequence;
  if(seq?.enabled){
   const position=this.beats*seq.division;
   this.step=Math.floor(position)%16;
   if(seq.steps[this.step])values[seq.target]=(values[seq.target]||0)+seq.depth*Math.exp(-(position%1)*5);
  }else this.step=-1;
  return values;
 }
 modulatedDeck(id,deck,values){
  let state=deck.state;
  for(const [name,amount] of Object.entries(values)){
   if(!name.startsWith('macro:'))continue;
   const macro=this.config.macros[+name.slice(6)],v=clamp(macro.value+amount);
   for(const route of macro.routes.filter(r=>r.deck===id)){
    const entry=deck.catalog.find(x=>x.path===route.path);if(!entry)continue;
    if(state===deck.state)state=structuredClone(state);
    this.applyRoute(state,entry,route,v);
   }
  }
  const variation=values['variant.'+id],job=deck.mutation;
  if(job&&variation&&!job.fallback){
   if(state===deck.state)state={...state};
   const t=clamp(job.position+variation);
   for(const [key,a,b] of job.numbers)state[key]=a+(b-a)*t;
   if(job.palette){const [a,b]=job.palette;state.palette=a.map((c,i)=>colorMix(c,b[i%b.length],t));}
  }
  return state;
 }
 applyRoute(s,e,r,t){
  const v=e.kind==='color'?colorMix(r.from,r.to,t):e.kind==='boolean'?t>0:e.kind==='enum'?parameterFromUnit(e,t):r.min+(r.max-r.min)*t;
  return writeParameter(s,e,v);
 }
 mutate(id,kind){
  const d=this.decks[id];
  if(!d||this.pending[id]||this.config.flow.enabled)return false;
  if(d.mutation?.fallback)this.mixer.variantMix[id==='A'?0:1]=1;
  const seed=globalThis.crypto.getRandomValues(new Uint32Array(1))[0],values=mutationBetween(d.state,seed,kind);
  if(!values.numbers.length&&!values.palette)return false;
  const target={...d.state,...Object.fromEntries(values.numbers.map(([key,,end])=>[key,end]))};
  const middle=values.numbers.some(([key])=>key==='sceneGrains')?{...target,sceneGrains:.5}:null;
  d.mutation={...values,start:Infinity,waiting:middle?[middle,target]:[target],seconds:transitionSeconds(this.config),position:0,requested:this.clock};
  this.notify('change',id);return true;
 }
 mutationPosition(id,value,manual=true){if(manual)this.decks[id]?.renderer.cancelCooperative();
  const d=this.decks[id],job=d?.mutation;if(!job)return false;
  const t=clamp(value);job.position=t;
  if(manual){job.start=Infinity;job.waiting=[];job.fallback=false;this.mixer.variantMix[id==='A'?0:1]=1;}
  for(const [k,a,b] of job.numbers)d.state[k]=a+(b-a)*t;
  if(job.palette){const [a,b]=job.palette;d.state.palette=a.map((c,i)=>colorMix(c,b[i%b.length],t));}
  d.dirty=true;d.revision++;return true;
 }
 async load(id,definition){
  if(this.closed)return false;const token=++this.generation[id];this.pending[id]=true;this.notify('loading',id);
  const cancelled=()=>this.closed||token!==this.generation[id];let r;
  const options={preview:true,quality:'fast',liveDynamics:true,geometryBudget:this.workload,cancelled};
  try{
   const canvas=document.createElement('canvas'),state=normalizeCreation(sceneOnly(definition.state)),phase=definition.phase||0;r=new Renderer(canvas);
   if(!await r.prepareAsync(state,phase,options)||cancelled())return false;
   const ratio=definition.ratio||this.ratio,h=Math.min(540,Math.round(this.config.resolution*this.scale),Math.floor(960/Math.max(1,ratio))),w=Math.round(h*ratio);
   if(!r.draw(state,phase,w,h,options)||!await r.waitForGpu(options)||cancelled())return false;
   const d={state,phase,ratio,name:definition.name||'Scena',playing:definition.playing!==false,renderer:r,canvas,catalog:parameterCatalog(state),frames:1,dirty:false,submitted:false,lastTime:this.clock,revision:0,drawRevision:0};
   const index=id==='A'?0:1;
   this.mixer.variantMix[index]=1;this.mixer.aspects[index]=ratio/this.ratio;this.mixer.upload(index,canvas);
   const old=this.decks[id];this.decks[id]=d;this.config.decks[id]={state,name:d.name,phase,ratio:d.ratio,playing:d.playing};old?.renderer.dispose();this.pending[id]=false;this.notify('ready',id);return true;
  }catch(e){if(!cancelled()){this.pending[id]=false;this.notify('error',id,e.message);}return false;}
  finally{if(!cancelled())this.pending[id]=false;if(r&&this.decks[id]?.renderer!==r)r.dispose();}
 }
 refresh(id){const d=this.decks[id];if(!d)return;d.renderer.cancelCooperative();d.dirty=true;d.revision++;this.notify('change',id);}
 setParameter(id,path,value){const d=this.decks[id];if(!d)return false;const entry=d.catalog.find(x=>x.path===path);if(!writeParameter(d.state,entry,value))return false;if(path==='pLiving')d.catalog=parameterCatalog(d.state);this.refresh(id);return true;}
 macro(index,value){
  const m=this.config.macros[index];if(!m)return;m.value=clamp(value);
  for(const route of m.routes){const d=this.decks[route.deck],e=d?.catalog.find(x=>x.path===route.path);if(e&&this.applyRoute(d.state,e,route,m.value))this.refresh(route.deck);}
  this.notify('macro',index);
 }
 take(target){
  const needed=target>this.config.mix?'B':'A',deck=this.decks[needed];
  if(!deck||this.pending[needed]){this.notify('notice',needed,'Attendi che la scena '+needed+' sia pronta.');return false;}
  const warming=deck.playing&&!this.config.freeze&&(this.clock-(deck.lastDraw??-Infinity)>.15);
  this.job={from:this.config.mix,to:target,start:this.config.quantize?this.nextBeat():this.clock,seconds:transitionSeconds(this.config),curve:this.config.curve,ready:warming?{id:needed,after:deck.frames,until:this.clock+2}:null};
  this.notify('transition');return true;
 }
 mix(value){if(value>0&&!this.decks.B||value<1&&!this.decks.A){this.notify('notice','','Attendi che entrambe le scene siano pronte.');return;}this.job=null;this.config.mix=clamp(value);this.notify('mix');}
 toggle(id){const d=this.decks[id];if(d){d.playing=!d.playing;d.lastTime=this.clock;this.config.decks[id].playing=d.playing;this.notify('change',id);}}
 snapshot(){
  const saved=this.manual||this.restoring;
  if(saved)return structuredClone({...this.config,...saved.settings,decks:saved.decks});
  return structuredClone({...this.config,decks:{A:this.deckSnapshot('A'),B:this.deckSnapshot('B')}});
 }
 useOutputWindow(output){
  if(this.closed)return;
  const next=output&&!output.closed?output:window;
  if(next===this.animationWindow)return;
  this.animationWindow.cancelAnimationFrame(this.raf);
  this.animationWindow=next;
  this.raf=next.requestAnimationFrame(this.frame);
 }
 tick(time){
  if(this.closed)return;
  if(this.animationWindow.closed)this.animationWindow=window;
  this.raf=this.animationWindow.requestAnimationFrame(this.frame);
  if(!this.last)this.last=time;const dt=Math.max(0,(time-this.last)/1000);this.last=time;
  if(document.hidden&&this.animationWindow===window){for(const d of Object.values(this.decks))if(d)d.lastTime=this.clock;return;}
  const deltaTime=Math.min(dt,.25);this.clock+=deltaTime;this.beats+=deltaTime*this.config.bpm/60;const start=performance.now();
  if(this.restoring||this.mixer.gl.isContextLost())return;
  this.flow.tick(Math.min(dt,.25));
  if(this.job?.ready){
   const {id,after,until}=this.job.ready;
   if(this.decks[id]?.frames>after||this.clock>=until){this.job.ready=null;this.job.start=this.config.quantize?this.nextBeat():this.clock;}
  }
  if(this.job&&!this.job.ready){this.config.mix=transitionValue(this.job,this.clock);if(this.clock>=this.job.start+this.job.seconds){this.config.mix=this.job.to;this.job=null;this.notify('transition-end');}}
  this.audioLevels=this.audio?.read(deltaTime)||null;
  const mods=this.modulations(),mix=clamp(this.config.mix+(mods.mix||0)),master=clamp(this.config.master+(mods.master||0));
  const onAir=id=>!!this.job||(id==='A'?mix<.999:mix>.001);
  let completed=0;
  try{
   for(const id of ['A','B']){
    const d=this.decks[id];if(!d)continue;const r=d.renderer;
    if(r.gl.isContextLost()){
     if(!this.pending[id]&&this.clock>(d.recoverAt||0)){
      d.recoverAt=this.clock+3;this.notify('notice',id,'Ripristino scena '+id+'…');void this.load(id,this.deckSnapshot(id));
     }
     continue;
    }
    r.pollGpuTime();r.pollCompletion();
    if(d.submitted&&!r.completionSync){this.mixer.upload(id==='A'?0:1,d.canvas);d.submitted=false;d.frames++;completed++;this.notify('frame',id);}
    const delta=this.clock-d.lastTime;d.lastTime=this.clock;
    if(d.playing&&!this.config.freeze){d.phase+=Math.min(delta,d.state.dynAmount>0?.1:.25)*(d.state.speed||1)/Math.max(.001,d.state.duration||12)*Math.PI*2;d.dirty=true;}
    const job=d.mutation,index=id==='A'?0:1;
    if(job?.waiting?.length&&!r.completionSync){
     if(this.clock-job.requested>110){d.mutation=null;this.notify('notice',id,'Variante non pronta. La scena corrente è ancora disponibile.');}
     else if(r.prepare(job.waiting[0],d.phase,{preview:true,quality:'fast',dynamicsFrame:r.dynamicsFrame})){
      job.waiting.shift();
      if(!job.waiting.length){
       const delayed=this.clock-job.requested>.35&&onAir(id)&&!job.numbers.some(([k])=>k==='sceneGrains');
       if(delayed){
        // Keep the last finished frame on air until the new variant is ready.
        this.mixer.upload(index+2,d.canvas);this.mixer.variantMix[index]=0;
        this.mutationPosition(id,1,false);job.position=0;job.fallback=true;job.after=d.frames;
       }else job.start=this.config.quantize?this.nextBeat():this.clock;
      }
     }
    }
    if(job?.fallback&&d.frames>job.after&&job.start===Infinity)job.start=this.config.quantize?this.nextBeat():this.clock;
    if(job&&Number.isFinite(job.start)&&this.clock>=job.start){
     const x=clamp((this.clock-job.start)/job.seconds),t=x*x*(3-2*x);
     if(job.fallback){job.position=t;this.mixer.variantMix[index]=clamp(t+(mods['variant.'+id]||0));}
     else this.mutationPosition(id,t,false);
     if(x>=1){job.start=Infinity;job.fallback=false;this.mixer.variantMix[index]=1;}
    }
    if(r.completionSync)continue;
    const modulated=this.modulatedDeck(id,d,mods),isModulated=modulated!==d.state||Object.keys(mods).some(key=>key.startsWith('fx.'+id+'.'));
    if(isModulated||d.wasModulated)d.dirty=true;d.wasModulated=isModulated;
    const visible=onAir(id);
    if(!visible&&d.revision===d.drawRevision)continue;
    const h=Math.min(Math.max(144,Math.round(this.config.resolution*this.scale)),Math.floor(2048/Math.max(1,d.ratio))),w=Math.round(h*d.ratio);
    if(!d.dirty&&d.canvas.width===w&&d.canvas.height===h)continue;
    const opts={preview:true,quality:'fast',liveDynamics:true,frameInterval:Math.min(deltaTime,.067),geometryBudget:this.workload};
    const renderState={...modulated,...this.overlays(id,mods)};
    if(!r.prepare(renderState,d.phase,opts))continue;
    if(r.draw(renderState,d.phase,w,h,opts)){d.lastDraw=this.clock;d.submitted=true;d.dirty=false;d.drawRevision=d.revision;}
   }
   const h=Math.round(this.config.resolution*this.scale);
   this.mixer.draw({...this.config,mix,master,blackout:this.config.blackout||this.config.strobe&&this.clock%.5>=.25,impact:Math.max(0,(this.impactUntil-this.clock||0)*3)*.29,flash:Math.max(0,(this.flashUntil-this.clock||0)*3)*.65},Math.round(h*this.ratio),h,this.overlays('output',mods),this.clock,dt);this.stats.frames++;
   this.stats.ms=this.stats.ms*.95+(performance.now()-start)*.05;this.stats.fps=this.stats.fps*.95+(dt>0?Math.min(240,1/dt):60)*.05;
   if(time-this.lastAdapt>1800){
    const times=Object.entries(this.decks).filter(([id,d])=>d&&onAir(id)&&this.clock-(d.lastDraw||0)<2).map(([,d])=>d.renderer.gpuMilliseconds||0),cost=Math.max(this.stats.ms,times.reduce((a,b)=>a+b,0));
    if(this.config.autoQuality&&cost>28){this.scale=Math.max(.3,this.scale*.82);if(this.scale<.5)this.workload=Math.max(.35,this.workload*.85);for(const d of Object.values(this.decks))if(d)d.dirty=true;}
    else if(this.config.autoQuality&&cost<16&&(this.scale<1||this.workload<1)){this.scale=Math.min(1,this.scale*1.12);this.workload=Math.min(1,this.workload*1.1);for(const d of Object.values(this.decks))if(d)d.dirty=true;}
    else if(!this.config.autoQuality&&(this.scale!==1||this.workload!==1)){this.scale=this.workload=1;for(const d of Object.values(this.decks))if(d)d.dirty=true;}
    this.lastAdapt=time;this.notify('stats');
   }
  }catch(e){
   const message=e.message||'Rendering momentaneamente sospeso.';
   if(this.lastRenderError!==message){this.lastRenderError=message;this.notify('error','',message);}
  }
 }
 dispose(){this.closed=true;this.stopAudio();this.listeners.abort();this.animationWindow.cancelAnimationFrame(this.raf);for(const id of ['A','B']){this.generation[id]++;this.decks[id]?.renderer.dispose();}this.mixer.dispose();}
}
