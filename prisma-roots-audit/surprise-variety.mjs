import assert from 'node:assert/strict';
import {surprise,normalizeCreation,newCreation,motionPreset} from '/workspace/prisma-studio/dist/creative-model.js';
import {META,random} from '/workspace/prisma-studio/dist/model.js';
import {MATERIAL_STYLES} from '/workspace/prisma-studio/dist/studio-model.js';
const materials=new Set(),environments=new Set(),palettes=new Set(),shapes=new Set(),types=new Set(),families=new Map(),colorCounts=new Set();
let roots=0,maxRootCount=0;
for(let seed=0;seed<4096;seed++){
 const s=surprise(seed),before=JSON.stringify(s),family=Math.floor(random(seed)()*14);
 families.set(family,(families.get(family)||0)+1);
 assert.equal(JSON.stringify(surprise(seed)),before,`seed ${seed} reproducibility`);
 for(const [key,[label,min,max]] of Object.entries(META))if(typeof s[key]==='number')assert(Number.isFinite(s[key])&&s[key]>=min&&s[key]<=max,`${seed} ${key}: ${s[key]} not ${min}..${max}`);
 assert.equal(s.background,'#000000');assert.equal(s.bgMode,'solid');assert.equal(s.glow,0);assert.equal(s.grounding,0);
 assert.equal(s.seed,seed);assert(s.lights.length>=2&&s.lights.length<=4);assert(s.palette.length>=2&&s.palette.length<=6);assert(s.palette.every(c=>/^#[0-9a-f]{6}$/.test(c)));
 for(const l of s.lights){assert(!l.visible);assert(l.power>0&&l.power<=6);assert(['x','y','z'].every(k=>Number.isFinite(l[k])&&Math.abs(l[k])<=5));types.add(l.type);}
 assert(Object.values(s.motions).every(t=>!t.enabled));
 if(family>=10){roots++;maxRootCount=Math.max(maxRootCount,s.petalRows*s.petalCount);assert(s.petalRows*s.petalCount<=27);assert(s.petalWidth>=.09);assert.equal(s.petalCoverage,1);}
 const normalized=normalizeCreation(s);assert.equal(JSON.stringify(s),before,'Normalize must not mutate source');assert.equal(normalized.petalGrowth,s.petalGrowth);assert.equal(normalized.petalWander,s.petalWander);
 materials.add(s.materialName);environments.add(s.environment);palettes.add(JSON.stringify(s.palette));colorCounts.add(s.palette.length);
 shapes.add(JSON.stringify(['volume','stretchX','stretchY','deform','roundness','hole','cut','petalAmount','petalLength','petalWidth','petalCoil'].map(k=>s[k])));
}
assert.equal(materials.size,MATERIAL_STYLES.length);assert.equal(environments.size,7);assert.equal(families.size,14);assert.equal(colorCounts.size,5);assert(palettes.size>4000);assert(shapes.size>4000);assert(types.size>=6);
// Imported old creations retain perfect-loop semantics, free cycles round-trip only on explicit opt-out.
const state=newCreation();state.motions.petalGrowth.cycles=1.4;state.environmentCycles=1.7;state.filmCycles=2.6;state.lights[0].orbit.cycles=2.4;
delete state.perfectLoop;let restored=normalizeCreation(state);assert.equal(restored.perfectLoop,true);assert.equal(restored.motions.petalGrowth.cycles,1);assert.equal(restored.environmentCycles,2);assert.equal(restored.filmCycles,3);assert.equal(restored.lights[0].orbit.cycles,2);
state.perfectLoop=false;restored=normalizeCreation(state);assert.equal(restored.perfectLoop,false);assert.equal(restored.motions.petalGrowth.cycles,1.4);assert.equal(restored.environmentCycles,1.7);assert.equal(restored.filmCycles,2.6);assert.equal(restored.lights[0].orbit.cycles,2.4);
console.log(JSON.stringify({seeds:4096,materials:materials.size,environments:environments.size,palettes:palettes.size,shapes:shapes.size,colorCounts:[...colorCounts],families:[...families],lightTypes:[...types],roots,maxRootCount,perfectLoopRoundTrip:'pass'},null,2));

for(const name of ['emerge','wrap','roots','breathe','reflect','film','orbit','wave','bloom','chromatic']){const s=newCreation();Object.assign(s,{duration:122,speed:.5,motion:.3});motionPreset(s,name);assert.equal(s.duration,122,name+' duration');assert.equal(s.speed,.5,name+' speed');assert.equal(s.motion,.3,name+' intensity');}
const missingTiming=newCreation();delete missingTiming.duration;missingTiming.speed=NaN;missingTiming.motion=Infinity;motionPreset(missingTiming,'emerge');assert.equal(missingTiming.duration,12);assert.equal(missingTiming.speed,1);assert.equal(missingTiming.motion,.3);console.log('Motion presets preserve duration, speed and intensity; missing timing uses safe defaults.');
