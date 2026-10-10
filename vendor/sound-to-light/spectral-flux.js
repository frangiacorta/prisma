// Adapted from scheb/sound-to-light-osc, MIT. See LICENSE.txt and NOTICE.txt.
// Port of SpectralFluxBeatDetector: positive spectral difference, median
// threshold and refractory interval. Browser magnitudes are linear 0..1.
export class SpectralFluxDetector {
  previous=null; history=[]; last=-Infinity; clock=0; wasAbove=false;
  reset(){this.previous=null;this.history=[];this.last=-Infinity;this.clock=0;this.wasAbove=false;}
  update(spectrum,binHz,dt,{audible=true,sensitivity=1.5,hold=.18}={}) {
    this.clock+=dt;
    const count=Math.min(spectrum.length,Math.ceil(1000/binHz)+1);
    if(!this.previous||this.previous.length!==count)this.previous=new Float32Array(count);
    let flux=0;for(let i=0;i<count;i++){flux+=Math.max(0,spectrum[i]-this.previous[i]);this.previous[i]=spectrum[i];}
    this.history=this.history.filter(row=>this.clock-row.t<3);
    const sorted=this.history.map(row=>row.value).sort((a,b)=>a-b),median=sorted.length?sorted[Math.floor(sorted.length/2)]:0;
    const threshold=median*1.5+(.003/Math.max(.5,sensitivity));
    const above=audible&&flux>threshold;
    const trigger=above&&!this.wasAbove&&this.clock-this.last>=hold;
    if(trigger)this.last=this.clock;
    this.wasAbove=above;
    if(audible)this.history.push({t:this.clock,value:flux});
    return trigger?1:0;
  }
}
