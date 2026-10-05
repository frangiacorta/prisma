import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {PRESETS,preset,META} from '/workspace/prisma-studio/dist/model.js';
import {PRESETS as oldPresets,preset as oldPreset} from './model-before.mjs';
import {normalizeCreation,newCreation} from '/workspace/prisma-studio/dist/creative-model.js';
const textureKeys=['textureDepth','textureScale','textureOrganic','textureAngle','textureWrinkles','textureFolds','textureWear','textureRipples'];
for(let i=0;i<3;i++){
 assert.deepEqual(PRESETS[i],oldPresets[i]);const current=preset(i),old=oldPreset(i);for(const k of textureKeys)delete current[k];assert.deepEqual(current,old);
}
const report=[];
for(let i=3;i<6;i++){
 const s=preset(i);assert.equal(s.renderVersion,2);assert(!Object.values(s.motions).some(t=>t.enabled));assert(s.lights.every(l=>!l.visible));assert.equal(s.lights.length,2);
 for(const [k,m] of Object.entries(META))assert(Number.isFinite(s[k])&&s[k]>=m[1]&&s[k]<=m[2],`${i}:${k}`);
 assert.deepEqual(normalizeCreation(JSON.parse(JSON.stringify(s))),s);
 assert(['textureWrinkles','textureFolds','textureWear','textureRipples'].some(k=>s[k]>0));
 if(s.petalAmount>0)assert(s.petalCount*s.petalRows<=24);else assert(s.volume>=.22);
 writeFileSync(`/workspace/prisma-texture-audit/preset-${i}.json`,JSON.stringify({name:PRESETS[i].name,state:s,phase:0,ratio:1},null,2));
 report.push({index:i,name:PRESETS[i].name,material:s.materialName,appendages:s.petalAmount>0?s.petalCount*s.petalRows:0,volume:s.volume});
}
assert.equal(newCreation().materialName,'Bolla di sapone');
console.log(JSON.stringify({passed:true,firstThreeExactIncludingLights:true,newPresets:report,legacyPresetsStillInSavedStates:true,roundTrip:true}));
