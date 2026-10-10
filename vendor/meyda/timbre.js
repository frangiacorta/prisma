// Adapted from Meyda (MIT), copyright 2014 Hugh A. Rawlinson, Nevo Segal,
// Jakub Fiala. Version, original sources and modifications: NOTICE.txt.
export function spectralCentroid(ampSpectrum) {
  let numerator=0,denominator=0;
  for(let k=0;k<ampSpectrum.length;k++){
    numerator+=k*Math.abs(ampSpectrum[k]);denominator+=ampSpectrum[k];
  }
  return denominator>0?numerator/denominator:0;
}
export function spectralFlatness(ampSpectrum) {
  let numerator=0,denominator=0;
  for(let i=0;i<ampSpectrum.length;i++){
    if(ampSpectrum[i]<=0)return 0;
    numerator+=Math.log(ampSpectrum[i]);denominator+=ampSpectrum[i];
  }
  return denominator>0?Math.max(0,Math.min(1,Math.exp(numerator/ampSpectrum.length)*ampSpectrum.length/denominator)):0;
}

// The spectrum already exists in Orb's native Web Audio analyser. No second
// FFT or audio callback is created. The zero-frequency/DC bin is excluded.
export function timbreFeatures(magnitudes,binHz) {
  if(!(binHz>0))return {brightness:0,texture:0,centroidHz:0};
  const start=Math.max(1,Math.ceil(30/binHz)),end=Math.min(magnitudes.length,Math.ceil(16000/binHz));
  const spectrum=magnitudes.subarray(start,end);
  if(!spectrum.some(v=>v>0))return {brightness:0,texture:0,centroidHz:0};
  const centroidHz=(spectralCentroid(spectrum)+start)*binHz;
  return {centroidHz,brightness:Math.max(0,Math.min(1,Math.log(Math.max(80,centroidHz)/80)/Math.log(100))),texture:spectralFlatness(spectrum)};
}
