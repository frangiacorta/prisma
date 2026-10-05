import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fieldAt} from '/workspace/prisma-studio/dist/renderer.js';
import {fieldAt as oldFieldAt} from './renderer-before.js';
import {preset,PRESETS,META,GROUPS} from '/workspace/prisma-studio/dist/model.js';
import {normalizeCreation,newCreation,sculpt,textureStyle} from '/workspace/prisma-studio/dist/creative-model.js';
import {EXTRA_BASE,TEXTURE_STYLES} from '/workspace/prisma-studio/dist/studio-model.js';
import {presetDocument,readPreset} from '/workspace/prisma-studio/dist/preset-files.js';
const audit='/workspace/prisma-texture-audit/';
const oldSource=fs.readFileSync(audit+'model-before.js','utf8').replace("'./studio-model.js'","'file:///workspace/prisma-studio/dist/studio-model.js'");
const Old=await import('data:text/javascript;base64,'+Buffer.from(oldSource).toString('base64'));
const keys=['textureDepth','textureScale','textureOrganic','textureAngle','textureWrinkles','textureFolds','textureWear','textureRipples','surfaceTexture'];
const newDefaults={textureDepth:.35,textureScale:1,textureOrganic:.65,textureAngle:0,textureWrinkles:0,textureFolds:0,textureWear:0,textureRipples:0};
const results={preserved:[],styles:[],presets:[],roundTrip:true,geometryPoints:0};
for(let i=0;i<3;i++){assert.deepEqual(PRESETS[i],Old.PRESETS[i]);assert.deepEqual(preset(i),Old.preset(i));results.preserved.push(PRESETS[i].name);}
const missing=normalizeCreation({volume:1,scale:1,renderVersion:2});for(const [key,value] of Object.entries(newDefaults))assert.equal(missing[key],value,'old save defaults '+key);
for(const key of keys){assert(META[key],key+' metadata');assert(GROUPS.material.includes(key),key+' material grouping');}
for(let i=0;i<TEXTURE_STYLES.length;i++){
 const state=sculpt(newCreation(),4),shape=GROUPS.shape.map(k=>state[k]);textureStyle(state,i);assert.deepEqual(GROUPS.shape.map(k=>state[k]),shape,'Style only changes material');
 const saved=presetDocument({name:'Texture '+i,state,ratio:16/9,phase:1.25});const restored=readPreset(JSON.stringify(saved));assert.equal(restored.name,saved.name);assert.equal(restored.ratio,saved.ratio);assert.equal(restored.phase,saved.phase);for(const key of keys)assert.equal(restored.state[key],state[key],key+' roundtrip');
 assert(keys.every(k=>Number.isFinite(state[k])&&state[k]>=META[k][1]&&state[k]<=META[k][2]));results.styles.push(TEXTURE_STYLES[i].name);
}
let seed=2025;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const {state} of JSON.parse(fs.readFileSync(audit+'old-states.json'))){
 for(const key of keys)state[key]=META[key][1]+random()*(META[key][2]-META[key][1]);
 for(let i=0;i<300;i++){const p=Array.from({length:3},()=>random()*5-2.5);assert.equal(fieldAt(state,p),oldFieldAt(state,p),'Texture must not alter geometric SDF');results.geometryPoints++;}
}
for(let i=0;i<PRESETS.length;i++){
 const state=preset(i),before=JSON.stringify(state);for(const [key,meta] of Object.entries(META)){assert(Number.isFinite(state[key]),PRESETS[i].name+' '+key);assert(state[key]>=meta[1]&&state[key]<=meta[2],PRESETS[i].name+' bound '+key);}
 for(let n=0;n<100;n++)assert(Number.isFinite(fieldAt(state,Array.from({length:3},()=>random()*4-2))),PRESETS[i].name+' finite SDF');
 assert.equal(before,JSON.stringify(state));const restored=readPreset(JSON.stringify(presetDocument({name:PRESETS[i].name,state})));for(const key of keys)assert.equal(restored.state[key],state[key]);results.presets.push(PRESETS[i].name);
}
const invalid=newCreation();for(const key of keys)invalid[key]=1e9;const normalized=normalizeCreation(invalid);for(const key of keys)assert.equal(normalized[key],META[key][2]);
fs.writeFileSync(audit+'texture-core-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));console.log('TEXTURE MIGRATION, JSON ROUNDTRIP, UNCHANGED GEOMETRY AND FIRST THREE PRESETS PASS');
