import {Renderer} from './renderer.js?v=f6d2e36bd5d0';
import {FlowDirector} from './playground-flow.js?v=f6d2e36bd5d0';
import {PlaygroundMixer} from './playground-mixer.js?v=f6d2e36bd5d0';
import {normalizeCreation} from './creative-model.js?v=f6d2e36bd5d0';
import {sceneOnly,parameterCatalog,readParameter,writeParameter,parameterFromUnit,colorMix,clamp,transitionSeconds,transitionValue} from './playground-model.js?v=f6d2e36bd5d0';

export class PlaygroundEngine{
 constructor(canvas,config,notify=()=>{}){
  this.config=config;this.notify=notify;this.mixer=new PlaygroundMixer(canvas);this.decks={A:null,B:null};this.generation={A:0,B:0};this.pending={A:false,B:false};this.closed=false;this.clock=0;this.job=null;this.ratio=config.ratio||16/9;this.height=config.resolution;this.scale=1;this.workload=1;this.last=0;this.lastAdapt=0;this.stats={frames:0,fps:0,ms:0};this.flow=new FlowDirector(this);this.tick=this.tick.bind(this);this.raf=requestAnimationFrame(this.tick);
 }
 async load(id,definition){
  if(this.closed)return false;const token=++this.generation[id];this.pending[id]=true;this.notify('loading',id);
  const cancelled=()=>this.closed||token!==this.generation[id];let r;
  const options={preview:true,quality:'fast',liveDynamics:true,geometryBudget:this.workload,cancelled};
  try{
   const canvas=document.createElement('canvas'),state=normalizeCreation(sceneOnly(definition.state)),phase=definition.phase||0;r=new Renderer(canvas);
   if(!await r.prepareAsync(state,phase,options)||cancelled())return false;
   const ratio=definition.ratio||this.ratio,h=Math.min(Math.round(this.height*this.scale),Math.floor(2048/Math.max(1,ratio))),w=Math.round(h*ratio);
   if(!r.draw(state,phase,w,h,options)||!await r.waitForGpu(options)||cancelled())return false;
   const d={state,phase,ratio,name:definition.name||'Scena',playing:definition.playing!==false,renderer:r,canvas,catalog:parameterCatalog(state),frames:1,dirty:false,submitted:false,lastTime:this.clock,revision:0,drawRevision:0};
   this.mixer.aspects[id==='A'?0:1]=ratio/this.ratio;this.mixer.upload(id==='A'?0:1,canvas);const old=this.decks[id];this.decks[id]=d;this.config.decks[id]={state,name:d.name,phase,ratio:d.ratio,playing:d.playing};old?.renderer.dispose();this.pending[id]=false;this.notify('ready',id);return true;
  }catch(e){if(!cancelled()){this.pending[id]=false;this.notify('error',id,e.message);}return false;}
  finally{if(!cancelled())this.pending[id]=false;if(r&&this.decks[id]?.renderer!==r)r.dispose();}
 }
 refresh(id){const d=this.decks[id];if(!d)return;d.dirty=true;d.revision++;this.notify('change',id);}
 setParameter(id,path,value){const d=this.decks[id];if(!d)return false;const entry=d.catalog.find(x=>x.path===path);if(!writeParameter(d.state,entry,value))return false;if(path==='pLiving')d.catalog=parameterCatalog(d.state);this.refresh(id);return true;}
 macro(index,value){const m=this.config.macros[index];if(!m)return;m.value=clamp(value);for(const route of m.routes){const d=this.decks[route.deck],e=d?.catalog.find(x=>x.path===route.path);if(!e)continue;const v=e.kind==='color'?colorMix(route.from,route.to,m.value):e.kind==='boolean'?m.value>0:e.kind==='enum'?parameterFromUnit(e,m.value):route.min+(route.max-route.min)*m.value;this.setParameter(route.deck,route.path,v);}this.notify('macro',index);}
 take(target){
  const needed=target===1?'B':'A';if(!this.decks[needed]||this.pending[needed]){this.notify('notice',needed,'Attendi che la scena '+needed+' sia pronta.');return false;}
  let start=this.clock;if(this.config.quantize){const beat=60/this.config.bpm;start=Math.ceil((start+1e-7)/beat)*beat;}
  this.job={from:this.config.mix,to:target,start,seconds:transitionSeconds(this.config),curve:this.config.curve};this.notify('transition');return true;
 }
 mix(value){if(value>0&&!this.decks.B||value<1&&!this.decks.A){this.notify('notice','','Attendi che entrambe le scene siano pronte.');return;}this.job=null;this.config.mix=clamp(value);this.notify('mix');}
 toggle(id){const d=this.decks[id];if(d){d.playing=!d.playing;d.lastTime=this.clock;this.config.decks[id].playing=d.playing;this.notify('change',id);}}
 snapshot(){for(const id of ['A','B']){const d=this.decks[id];if(d)this.config.decks[id]={name:d.name,state:sceneOnly(d.state),phase:d.phase,ratio:d.ratio,playing:d.playing};}return structuredClone(this.config);}
 tick(time){
  if(this.closed)return;this.raf=requestAnimationFrame(this.tick);if(!this.last)this.last=time;const dt=Math.max(0,(time-this.last)/1000);this.last=time;
  if(document.hidden){for(const d of Object.values(this.decks))if(d)d.lastTime=this.clock;return;}
  this.clock+=Math.min(dt,.25);const start=performance.now();
  this.flow.tick(Math.min(dt,.25));
  if(this.job){this.config.mix=transitionValue(this.job,this.clock);if(this.clock>=this.job.start+this.job.seconds){this.config.mix=this.job.to;this.job=null;this.notify('transition-end');}}
  let completed=0;
  try{
   for(const id of ['A','B']){
    const d=this.decks[id];if(!d)continue;const r=d.renderer;r.pollGpuTime();r.pollCompletion();
    if(r.gl.isContextLost())throw Error('Contesto grafico '+id+' interrotto. Le scene restano salvate.');
    if(d.submitted&&!r.completionSync){this.mixer.upload(id==='A'?0:1,d.canvas);d.submitted=false;d.frames++;completed++;this.notify('frame',id);}
    const delta=this.clock-d.lastTime;d.lastTime=this.clock;
    if(d.playing){d.phase+=Math.min(delta,d.state.dynAmount>0?.1:.25)*(d.state.speed||1)/Math.max(.001,d.state.duration||12)*Math.PI*2;d.dirty=true;}
    if(r.completionSync||!d.dirty)continue;
    const h=Math.min(Math.max(144,Math.round(this.config.resolution*this.scale)),Math.floor(2048/Math.max(1,d.ratio))),w=Math.round(h*d.ratio),opts={preview:true,quality:'fast',liveDynamics:true,geometryBudget:this.workload};
    if(!r.prepare(d.state,d.phase,opts))continue;
    if(r.draw(d.state,d.phase,w,h,opts)){d.submitted=true;d.dirty=false;d.drawRevision=d.revision;}
   }
   const h=Math.round(this.config.resolution*this.scale);this.mixer.draw(this.config,Math.round(h*this.ratio),h);this.stats.frames++;
   this.stats.ms=this.stats.ms*.95+(performance.now()-start)*.05;this.stats.fps=this.stats.fps*.95+(dt>0?Math.min(240,1/dt):60)*.05;
   if(time-this.lastAdapt>1800){
    const times=Object.values(this.decks).filter(Boolean).map(d=>d.renderer.gpuMilliseconds||d.renderer.frameGpuMs||0),cost=Math.max(this.stats.ms,times.reduce((a,b)=>a+b,0));
    if(this.config.autoQuality&&cost>28){this.scale=Math.max(.3,this.scale*.82);if(this.scale<.5)this.workload=Math.max(.35,this.workload*.85);for(const d of Object.values(this.decks))if(d)d.dirty=true;}
    else if(!this.config.autoQuality&&(this.scale!==1||this.workload!==1)){this.scale=this.workload=1;for(const d of Object.values(this.decks))if(d)d.dirty=true;}
    this.lastAdapt=time;this.notify('stats');
   }
  }catch(e){this.notify('error','',e.message);for(const d of Object.values(this.decks))if(d)d.playing=false;cancelAnimationFrame(this.raf);}
 }
 dispose(){this.closed=true;cancelAnimationFrame(this.raf);for(const id of ['A','B']){this.generation[id]++;this.decks[id]?.renderer.dispose();}this.mixer.dispose();}
}
