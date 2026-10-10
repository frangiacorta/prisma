// Prisma transport for manual tempo. Reuses the audio mapping layer; no audio
// device, extra FFT or inferred beat detector. Time is monotonic milliseconds.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export function rhythmPulse(beats,c) {
  const phase=((beats/c.rhythmEvery+c.rhythmPhase)%1+1)%1;
  const width=c.rhythmWidth/100;
  if(phase>=width)return 0;
  const u=phase/width,edge=.001+c.rhythmSoftness*.499;
  return smooth(u/edge)*smooth((1-u)/edge);
}
export class RhythmClock {
  running=false;value=0;beats=0;last=null;bpm=90;
  start(now,c){this.running=true;this.beats=0;this.last=now;this.bpm=c.bpm;this.value=0;}
  align(now,c){this.beats=0;this.last=now;this.bpm=c.bpm;}
  stop(release=true){this.running=false;if(!release)this.value=0;}
  tick(now,c){
    const elapsed=this.last===null?0:Math.max(0,(now-this.last)/1000);this.last=now;
    if(this.running){
      this.beats+=elapsed*this.bpm/60;this.bpm=c.bpm;
      this.value=rhythmPulse(this.beats,c);
    }else{
      this.value*=Math.exp(-elapsed/Math.max(.02,c.release));
      if(this.value<.0001)this.value=0;
    }
    return this.value;
  }
}
export class TapTempo {
  taps=[];
  tap(now){
    const gap=this.taps.length?now-this.taps.at(-1):Infinity;
    if(gap<250)return null;
    if(gap>2000)this.taps=[];
    this.taps.push(now);this.taps=this.taps.slice(-7);
    if(this.taps.length<2)return null;
    const intervals=this.taps.slice(1).map((t,i)=>t-this.taps[i]).sort((a,b)=>a-b);
    const middle=Math.floor(intervals.length/2);
    const median=intervals.length%2?intervals[middle]:(intervals[middle-1]+intervals[middle])/2;
    return Math.round(clamp(60000/median,30,240)*10)/10;
  }
}
