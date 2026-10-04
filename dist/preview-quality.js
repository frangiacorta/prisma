export const PREVIEW_MODES={
 auto:{moving:480,max:720,initial:440,min:160,budget:25,samples:2},
 fluid:{moving:300,max:420,initial:300,min:144,budget:17,samples:1},
 detail:{moving:800,max:1120,initial:800,min:224,budget:33,samples:4}
};
// Preview-only pixel budgets. Never alter the creation or exported resolution.
export class PreviewQuality{
 constructor(mode='auto'){this.setMode(mode);}
 setMode(mode){this.mode=Object.hasOwn(PREVIEW_MODES,mode)?mode:'auto';this.profile=PREVIEW_MODES[this.mode];this.limit=this.profile.initial;this.slow=0;this.fast=0;this.lastCost=0;this.lastGpuCost=0;this.gpuKnown=false;this.lastChange=0;}
 size(width,height,dpr=1,interactive=false){const cap=Math.min(this.limit,interactive?this.profile.moving:this.profile.max),scale=Math.min(Math.max(1,dpr),2,cap/Math.max(1,width,height));return [Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale))];}
 observe(ms,time=0,{gpu=false,settled=false}={}){if(!Number.isFinite(ms)||ms<=0)return false;ms=Math.min(ms,30000);const target=this.profile.budget;if(gpu){if(this.lastGpuCost>target*3&&ms<this.lastGpuCost*.15)this.lastCost=ms;this.gpuKnown=true;this.lastGpuCost=ms;}const previous=this.limit;this.lastCost=this.lastCost?this.lastCost*.65+ms*.35:ms;if(this.lastCost>target*1.2){this.slow++;this.fast=0;}else if(this.lastCost<target*.75){this.fast++;this.slow=0;}else{this.slow=0;this.fast=0;}
  // A single severe stall must lower the next draw, including static scenes.
  if(ms>target*3){this.limit=Math.max(this.profile.min,this.limit*Math.max(.4,Math.min(.75,Math.sqrt(target/ms))));this.slow=0;this.fast=0;this.lastChange=time;return this.limit!==previous;}
  if(time-this.lastChange<180)return false;
  if(this.slow>=3){this.limit=Math.max(this.profile.min,this.limit*Math.max(.68,Math.min(.92,Math.sqrt(target/this.lastCost))));this.slow=0;this.lastChange=time;}
  else if(this.fast>=(settled?3:14)){this.limit=Math.min(this.profile.max,this.limit*(settled?1.15:1.07));this.fast=0;this.lastChange=time;}
  return this.limit!==previous;
 }
 refinementSamples(){return !this.gpuKnown||this.lastGpuCost>this.profile.budget*.9||this.lastCost>45?1:this.profile.samples;}
 recover(){this.limit=Math.min(this.limit,192);this.slow=0;this.fast=0;this.lastCost=0;this.lastGpuCost=0;this.gpuKnown=false;}
}
