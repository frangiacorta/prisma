// Prisma Pathfinder — periodic particle paths, independently authored.
import {prismaDefaults,validatePrisma} from './prisma-controls.js';
export const FORMAT = 'prisma/pathfinder';
export const VERSION = 2;
export const limits = {
  density: [0.25, 1.5], compactness: [0, 1], opening: [0, 1],
  turbulence: [0, 1], vortex: [0, 1], trails: [0, 1], outerStrength:[0,1], outerReach:[0,1.5],
  rhythm: [0, 1], pause: [0, 0.4], duration: [4, 300], cycles: [1, 12],
  exposure: [0.25, 2], glow: [0, 1], grain: [0, 1],
  yaw: [-180, 180], pitch: [-80, 80], zoom: [0.6, 1.6],
};
export const defaults = Object.freeze({
  seed: 417, density: 1, compactness: 0.55, opening: 0.55,
  turbulence: 0.63, vortex: 0.66, trails: 0.65, outerStrength:1, outerReach:1,
  rhythm: 0.8, pause: 0.08, duration: 10, cycles: 1, direction: 1,
  exposure: 0.95, glow: 0.32, grain: 0.42,
  yaw: -18, pitch: 24, zoom: 1, palette: 'ice',
  prisma: prismaDefaults(),
});
export const palettes = {
  ice: {name: 'Ghiaccio', low: [0.035, 0.27, 0.38], high: [0.62, 0.98, 1]},
  pearl: {name: 'Perla', low: [0.24, 0.15, 0.4], high: [1, 0.85, 0.77]},
  ember: {name: 'Brace', low: [0.42, 0.04, 0.02], high: [1, 0.52, 0.15]},
};
export const studies = {
  nucleus: {...defaults},
  filaments: {...defaults, density: 0.7, compactness: 0.35, opening: 0.85, turbulence: 0.4, trails: 0.94, glow: 0.18, palette: 'pearl', yaw: 40},
  ember: {...defaults, compactness: 0.75, opening: 0.27, turbulence: 0.85, trails: 0.44, rhythm: 1, pause: 0.16, palette: 'ember'},
};
export const wrap = v => ((v % 1) + 1) % 1;
export const exportDefaults = Object.freeze({size:'1920x1080',fps:30,quality:'high'});
export const exportSizes=['1920x1080','1080x1080','1080x1920','1280x720'];
export function validateExportSettings(value=exportDefaults){
  if(!value||!exportSizes.includes(value.size)||![24,30,60].includes(value.fps)||!['standard','high','master'].includes(value.quality))
    throw new Error('Impostazioni di esportazione non valide.');
  return {size:value.size,fps:value.fps,quality:value.quality};
}
export function exportBitrate(options){
  const [width,height]=options.size.split('x').map(Number);
  return Math.round(width*height*options.fps*({standard:.14,high:.28,master:.5}[options.quality]));
}
export function motionTime(time,p){return time*(p.cycles??1)*(p.direction??1);}
export function clockPhase(time, p) {
  const u = wrap(motionTime(time,p) / p.duration);
  const q = Math.max(0, Math.min(1, (u - p.pause / 2) / (1 - p.pause)));
  // Integral of smoothstep velocity ramps; C2 at both ends and at the plateau.
  const r=0.14, ramp=x=>{const y=x/r;return r*y*y*y*(1-.5*y);};
  const area=q<r?ramp(q):q>1-r?1-r-ramp(1-q):q-r/2;
  const t = p.pause > 0 ? area/(1-r) : q;
  return Math.PI*2*t - 0.75*p.rhythm*Math.sin(Math.PI*2*t);
}
export function validatePreset(data) {
  if (!data || data.format !== FORMAT || ![1,VERSION].includes(data.version) || !data.parameters)
    throw new Error('Scegli un preset Pathfinder di Prisma (.json).');
  const p = {...data.parameters,cycles:data.parameters.cycles??1,direction:data.parameters.direction??1,outerStrength:data.parameters.outerStrength??1,outerReach:data.parameters.outerReach??1};
  const next = {};
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (!Number.isFinite(p[key]) || p[key] < min || p[key] > max)
      throw new Error('Valore non valido nel preset: ' + key);
    next[key] = p[key];
  }
  if (!Number.isInteger(p.seed) || p.seed < 0 || p.seed > 999999) throw new Error('Seed non valido.');
  if (!Number.isInteger(p.duration)) throw new Error('La durata deve essere un numero intero di secondi.');
  if (!Number.isInteger(p.cycles)) throw new Error('I cicli devono essere interi per chiudere il loop.');
  if(![1,-1].includes(p.direction))throw new Error('Direzione del movimento non valida.');
  if (!Object.hasOwn(palettes, p.palette)) throw new Error('Palette non valida.');
  return {...next, seed: p.seed, palette: p.palette, direction:p.direction,prisma:validatePrisma(p.prisma)};
}
export function makePreset(p,options=exportDefaults) {
  return {format: FORMAT, version: VERSION, title: 'Pathfinder', parameters: structuredClone(p),export:validateExportSettings(options)};
}
export function randomSequence(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let v = Math.imul(value ^ (value >>> 15), value | 1);
    v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}
