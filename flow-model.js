export const FLOW_MOODS=[['calm','Calmo'],['organic','Organico'],['electric','Elettrico']];
export const FLOW_COLORS=[['current','Palette iniziale'],['custom','Personalizzata'],['pearl','Perla'],['ocean','Oceano'],['warm','Caldi'],['neon','Neon'],['mono','Bianco e nero']];
export const FLOW_PALETTES={pearl:['#ddd9ff','#b4e8ed','#f4bdd7'],ocean:['#204cad','#18bbbf','#a7f3db'],warm:['#ac3854','#f78d50','#ffe5aa'],neon:['#8c47ff','#ff36a5','#32e5dd'],mono:['#707985','#d5dbe2','#ffffff']};
const colors=value=>Array.isArray(value)&&value.length&&value.every(c=>/^#[a-f\d]{6}$/i.test(c))?value.slice(0,12):[];
export const flowPalette=f=>FLOW_PALETTES[f.colors]||(f.colors==='current'&&f.sourcePalette?.length?f.sourcePalette:f.palette);
const n=(v,f,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
export function normalizeFlow(raw={}){raw=raw&&typeof raw==='object'?raw:{};return {enabled:raw.enabled===true,paused:raw.paused===true,mood:FLOW_MOODS.some(([k])=>k===raw.mood)?raw.mood:'organic',colors:FLOW_COLORS.some(([k])=>k===raw.colors)?raw.colors:'current',engines:['both','solid','particles'].includes(raw.engines)?raw.engines:'both',speed:n(raw.speed,1,.25,3),intensity:n(raw.intensity,.55,0,1),variety:n(raw.variety,.65,0,1),seed:Math.floor(n(raw.seed,417,0,4294967295)),step:Math.floor(n(raw.step,0,0,1e9)),sourcePalette:colors(raw.sourcePalette),palette:colors(raw.palette)};}
export function flowTiming(flow){return {hold:(flow.mood==='calm'?20:flow.mood==='electric'?9:14)/flow.speed,transition:(flow.mood==='calm'?8:flow.mood==='electric'?3:5)/flow.speed};}
export const FLOW_FAMILIES=['volume','ring','layers','fibres','branches'];
export function flowChoice(flow){
 // Cycle through a seed-dependent permutation; never repeat the preceding family.
 const step=flow.step,limit=flow.variety<.2?2:flow.variety<.55?3:5;
 return {family:FLOW_FAMILIES[(step*(limit===5?2:1)+flow.seed%limit)%limit],engine:flow.engines==='both'?(step%2?'particles':'solid'):flow.engines};
}
