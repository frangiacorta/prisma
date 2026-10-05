export const PREVIEW_MODES={
 auto:{moving:480,max:720,initial:440,min:160,budget:25,samples:2,still:800},
 fluid:{moving:300,max:420,initial:300,min:144,budget:17,samples:2,still:640},
 detail:{moving:800,max:1120,initial:800,min:224,budget:33,samples:4,still:1120}
};
const fit=(width,height,dpr,cap)=>{const scale=Math.min(Math.max(1,dpr||1),2,cap/Math.max(1,width,height));return [Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale))];};
// Only interactive draws use the frame-rate budget. A paused image gets one
// separate, cancellable tiled pass: slow animation must not leave it at 144 px.
export class PreviewQuality{
 constructor(mode='auto'){this.setMode(mode);}
 setMode(mode){this.mode=Object.hasOwn(PREVIEW_MODES,mode)?mode:'auto';this.profile=PREVIEW_MODES[this.mode];this.limit=this.profile.initial;this.resetMeasurements();}
 resetMeasurements(){this.slow=0;this.fast=0;this.severe=0;this.lastCost=0;this.lastCpuCost=0;this.lastGpuCost=0;this.gpuKnown=false;this.gpuWarmed=false;this.lastChange=0;}
 size(width,height,dpr=1,interactive=false){return fit(width,height,dpr,Math.min(this.limit,interactive?this.profile.moving:this.profile.max));}
 idlePlan(width,height,dpr=1){const [w,h]=fit(width,height,dpr,this.profile.still);return {width:w,height:h,samples:this.profile.samples,quality:'balanced',forceTiled:true,tileSize:64,trackTiming:false};}
 observe(ms,time=0,{gpu=false,interactive=true,settled=false,warmup=false,preparing=false,refining=false}={}){
  // Shader compilation, an initial field bake and idle tiles are not recurring
  // per-frame costs. Never feed them back into the live resolution controller.
  if(!interactive||settled||warmup||preparing||refining||!Number.isFinite(ms)||ms<=0)return false;
  ms=Math.min(ms,30000);
  if(gpu){if(!this.gpuWarmed){this.gpuWarmed=true;return false;}this.gpuKnown=true;this.lastGpuCost=ms;}
  else{this.lastCpuCost=ms;if(this.gpuKnown)return false;}
  const target=this.profile.budget,previous=this.limit;
  // One isolated driver/JIT/OS stall is not evidence that all later frames are
  // expensive. Repeated slow frames still reduce the next submitted workload.
  if(ms>target*3){if(++this.severe<2)return false;this.severe=0;this.lastCost=ms;this.limit=Math.max(this.profile.min,this.limit*Math.max(.4,Math.min(.75,Math.sqrt(target/ms))));this.slow=0;this.fast=0;this.lastChange=time;return this.limit!==previous;}
  this.severe=0;
  if(this.lastCost>target*3&&ms<this.lastCost*.25)this.lastCost=ms;
  this.lastCost=this.lastCost?this.lastCost*.65+ms*.35:ms;
  if(this.lastCost>target*1.2){this.slow++;this.fast=0;}else if(this.lastCost<target*.75){this.fast++;this.slow=0;}else{this.slow=0;this.fast=0;}
  if(time-this.lastChange<180)return false;
  if(this.slow>=3){this.limit=Math.max(this.profile.min,this.limit*Math.max(.68,Math.min(.92,Math.sqrt(target/this.lastCost))));this.slow=0;this.lastChange=time;}
  else if(this.fast>=14){this.limit=Math.min(this.profile.max,this.limit*1.07);this.fast=0;this.lastChange=time;}
  return this.limit!==previous;
 }
 refinementSamples(){return this.profile.samples;}
 recover(){this.limit=Math.min(this.limit,192);this.resetMeasurements();}
}
