// Records analysed control signals, never a microphone waveform or audio file.
export const CLIP_CHANNELS=['all','low','mid','high','peak','onset','brightness','texture','beat'];
export const CLIP_RATE=30;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>x*x*(3-2*x);
const vector=bands=>CLIP_CHANNELS.map(k=>Number.isFinite(bands?.[k])?clamp(bands[k]):0);
const object=row=>Object.fromEntries(CLIP_CHANNELS.map((k,i)=>[k,row[i]]));
export const emptySignals=()=>object(CLIP_CHANNELS.map(()=>0));

export function normalizeAudioClip(raw){
  if(!raw||raw.version!==1||!Number.isInteger(raw.duration)||raw.duration<2||raw.duration>60||
    !Array.isArray(raw.frames)||raw.frames.length!==raw.duration*CLIP_RATE+1)return null;
  if(!raw.frames.every(row=>Array.isArray(row)&&row.length===CLIP_CHANNELS.length&&row.every(Number.isFinite)))return null;
  return {version:1,duration:raw.duration,frames:raw.frames.map(row=>row.map(v=>Math.round(clamp(v)*10000)/10000))};
}

export class SignalRecorder {
  constructor(now,duration,bands){
    this.start=now;this.duration=Math.max(2,Math.min(60,Math.round(duration)));
    this.frames=[vector(bands)];this.previous=this.frames[0];this.time=0;this.done=false;this.error='';
  }
  feed(now,bands){
    if(this.done||this.error)return null;
    const time=Math.max(0,(now-this.start)/1000),next=vector(bands);
    // A hidden/throttled tab cannot provide the missing measurements.
    if(time-this.time>.5){this.error='Registrazione interrotta: la scheda è rimasta inattiva. Riprova tenendo Prisma visibile.';return null;}
    while(this.frames.length<=this.duration*CLIP_RATE&&this.frames.length/CLIP_RATE<=time+1e-8){
      const at=this.frames.length/CLIP_RATE,weight=clamp((at-this.time)/Math.max(1e-9,time-this.time));
      this.frames.push(next.map((v,i)=>this.previous[i]+(v-this.previous[i])*weight));
    }
    this.previous=next;this.time=time;
    if(this.frames.length===this.duration*CLIP_RATE+1){this.done=true;return normalizeAudioClip({version:1,duration:this.duration,frames:this.frames});}
    return null;
  }
}

export function sampleAudioClip(clip,seconds,{loop=true,seam=12}={}){
  if(!clip)return emptySignals();
  const duration=clip.duration,t=loop?((seconds%duration)+duration)%duration:Math.max(0,Math.min(duration,seconds));
  const index=t*CLIP_RATE,left=Math.min(clip.frames.length-1,Math.floor(index)),right=Math.min(left+1,clip.frames.length-1),mix=index-left;
  const row=clip.frames[left].map((v,i)=>v+(clip.frames[right][i]-v)*mix);
  const width=loop?duration*Math.max(0,Math.min(25,seam))/100:0;
  if(width>0&&(t<width||t>duration-width)){
    // Same duration. Both endpoints meet at their mean with zero slope.
    // Only the selected boundary windows are altered, never the saved samples.
    const blend=smooth(t<width?1-t/width:(t-duration+width)/width);
    for(let i=0;i<row.length;i++)row[i]+=(.5*(clip.frames[0][i]+clip.frames.at(-1)[i])-row[i])*blend;
  }
  return object(row);
}
