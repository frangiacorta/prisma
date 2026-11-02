export const FLOW_MOODS=[['calm','Calmo'],['organic','Organico'],['electric','Elettrico']];
export const FLOW_COLORS=[['auto','Colori in evoluzione'],['current','Palette iniziale'],['custom','Personalizzata'],['pearl','Perla'],['ocean','Oceano'],['warm','Caldi'],['neon','Neon'],['mono','Bianco e nero']];
export const FLOW_PALETTES={pearl:['#ddd9ff','#b4e8ed','#f4bdd7'],ocean:['#204cad','#18bbbf','#a7f3db'],warm:['#ac3854','#f78d50','#ffe5aa'],neon:['#8c47ff','#ff36a5','#32e5dd'],mono:['#707985','#d5dbe2','#ffffff']};
const colors=value=>Array.isArray(value)&&value.length&&value.every(c=>/^#[a-f\d]{6}$/i.test(c))?value.slice(0,12):[];
export const flowRandom=(seed,offset=0)=>{const x=Math.sin((seed+offset*131)*12.9898)*43758.5453;return x-Math.floor(x);};
const atlas=[FLOW_PALETTES.pearl,FLOW_PALETTES.ocean,FLOW_PALETTES.warm,FLOW_PALETTES.neon,['#16342c','#71a66e','#ede4ab'],['#311b45','#b24d85','#ffc0a5'],['#351510','#c16c32','#fff0cf'],['#152840','#84b3cf','#f8f4e9'],['#392e68','#9a8bdb','#d9f7bd'],['#312620','#a6a297','#f3e4c3'],['#092c45','#24a696','#d6ed82'],['#402036','#da6571','#ffe9b4']];
export const flowColorMix=(a,b,t)=>'#'+[1,3,5].map(k=>Math.round(parseInt(a.slice(k,k+2),16)*(1-t)+parseInt(b.slice(k,k+2),16)*t).toString(16).padStart(2,'0')).join('');
export function flowPalette(f,seed=f.seed+f.step*113){
 if(f.colors!=='auto')return FLOW_PALETTES[f.colors]||(f.colors==='current'&&f.sourcePalette?.length?f.sourcePalette:f.palette);
 const step=Math.max(0,Math.round((seed-f.seed)/113)),chapter=Math.floor(step/4),a=atlas[(f.seed*7+chapter*5)%atlas.length],b=atlas[(f.seed*7+(chapter+1)*5)%atlas.length];
 // Carry a color relationship across four scenes, then resolve into the next palette.
 const t=(step%4)/4;return a.map((c,i)=>flowColorMix(c,b[i],t));
}
export function flowProfile(seed,mood='organic',variety=.65){
 const r=k=>flowRandom(seed,k),limit=variety<.2?3:variety<.55?6:10;
 return {motion:Math.floor(r(11)*limit),material:Math.floor(r(12)*(variety<.2?3:variety<.55?6:9)),pace:.45+r(13)*1.2,rhythm:(mood==='calm'?.16:mood==='electric'?.8:.48)*(.3+r(14)*.7),cycles:1+Math.floor(r(15)*(mood==='electric'?4:3)),phase:r(16)*360,direction:r(17)<.5?-1:1};
}
const n=(v,f,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
export function normalizeFlow(raw={}){raw=raw&&typeof raw==='object'?raw:{};return {enabled:raw.enabled===true,paused:raw.paused===true,mood:FLOW_MOODS.some(([k])=>k===raw.mood)?raw.mood:'organic',colors:FLOW_COLORS.some(([k])=>k===raw.colors)?raw.colors:'auto',engines:['both','solid','particles'].includes(raw.engines)?raw.engines:'both',speed:n(raw.speed,1,.25,3),intensity:n(raw.intensity,.55,0,1),variety:n(raw.variety,.65,0,1),seed:Math.floor(n(raw.seed,417,0,4294967295)),step:Math.floor(n(raw.step,0,0,1e9)),sourcePalette:colors(raw.sourcePalette),palette:colors(raw.palette)};}
export function flowTiming(flow){const r=flowRandom(flow.seed+flow.step*113,23),spread=flow.variety;return {hold:(.85+r*.3*spread)*(flow.mood==='calm'?20:flow.mood==='electric'?9:14)/flow.speed,transition:(.8+flowRandom(flow.seed+flow.step*113,24)*.4)*(flow.mood==='calm'?8:flow.mood==='electric'?3:5)/flow.speed};}
export const FLOW_FAMILIES=['volume','ring','layers','fibres','branches','disc','polyhedron','ribbon','cells','shell'];
export function flowChoice(flow){
 // Cycle through a seed-dependent permutation; never repeat the preceding family.
 const step=flow.step,limit=flow.variety<.2?3:flow.variety<.55?6:10;
 return {family:FLOW_FAMILIES[(step*(limit===10?3:1)+flow.seed%limit)%limit],engine:flow.engines==='both'?([0,0,1,1,1,0,1,0][(step+flow.seed%8)%8]?'particles':'solid'):flow.engines};
}
export function flowTransition(f){
 const family=flowChoice(f).family,r=flowRandom(f.seed+f.step*113,78),styles=f.mood==='calm'?['fade','iris','zoom']:['fade','iris','swirl','zoom','luma','wipe','add'];
 const preferred=['ring','ribbon'].includes(family)?'swirl':['layers','shell','disc'].includes(family)?'iris':family==='polyhedron'?'wipe':null;
 return {transition:r<.6&&preferred?preferred:styles[Math.floor(flowRandom(f.seed+f.step*113,79)*styles.length)],direction:(Math.floor(f.step/4)+f.seed)%4,curve:f.mood==='calm'?'smooth':['smooth','in','out'][Math.floor(flowRandom(f.seed+f.step*113,80)*3)]};
}
