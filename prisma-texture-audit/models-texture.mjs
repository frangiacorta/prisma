import assert from 'node:assert/strict';
import {preset,META,GROUPS,randomize} from '/workspace/prisma-studio/dist/model.js';
import {EXTRA_BASE,TEXTURE_STYLES,MATERIAL_STYLES} from '/workspace/prisma-studio/dist/studio-model.js';
import {newCreation,normalizeCreation,textureStyle,material,similar} from '/workspace/prisma-studio/dist/creative-model.js';
import {buildPanel} from '/workspace/prisma-studio/dist/panels.js';
import {presetDocument,readPreset} from '/workspace/prisma-studio/dist/preset-files.js';
const keys=['textureDepth','textureScale','textureOrganic','textureAngle','textureWrinkles','textureFolds','textureWear','textureRipples'],weights=keys.slice(4),surface=new Set([...keys,'surfaceTexture']);
for(let i=0;i<6;i++){
 const old=preset(i);for(const k of keys)delete old[k];const restored=normalizeCreation(old);
 for(const k of keys)assert.equal(restored[k],EXTRA_BASE[k]);
 assert(weights.every(k=>restored[k]===0));
}
for(const k of keys){assert(META[k]&&GROUPS.material.includes(k));assert(!GROUPS.shape.includes(k));}
for(let i=0;i<TEXTURE_STYLES.length;i++){
 const s=newCreation(),original=structuredClone(s);textureStyle(s,i);assert(weights.some(k=>s[k]>0));
 for(const k of Object.keys(original))if(!surface.has(k))assert.deepEqual(s[k],original[k],`texture preset changed ${k}`);
 const textured=Object.fromEntries(keys.map(k=>[k,s[k]]));
 for(let m=0;m<MATERIAL_STYLES.length;m++){material(s,m);for(const k of keys)assert.equal(s[k],textured[k],`material ${m} lost ${k}`);}
 const imported=readPreset(JSON.stringify(presetDocument({name:'Texture di prova',state:s,phase:.34,ratio:9/16}))).state;
 for(const k of keys)assert.equal(imported[k],s[k]);
 const variants=similar(s,818,8);for(const v of variants)for(const k of keys)assert(Number.isFinite(v[k])&&v[k]>=META[k][1]&&v[k]<=META[k][2]);
}
const s=newCreation(),invalid={...s,textureScale:100,textureAngle:-999,textureWrinkles:8,textureDepth:NaN};const safe=normalizeCreation(invalid);assert.equal(safe.textureScale,8);assert.equal(safe.textureAngle,-180);assert.equal(safe.textureWrinkles,1);assert.equal(safe.textureDepth,.35);
const random=randomize(s,71,.7,'material',{});for(const k of keys)assert(Number.isFinite(random[k]));
const h={slider:k=>`[slider:${k}]`,section:(n,b)=>b,details:(n,b)=>b,colorField:()=>'',check:()=>'',icon:()=>''},html=buildPanel('material',s,h,1);
for(const k of surface)assert.equal(html.split(`[slider:${k}]`).length,2,`${k} must appear exactly once`);
assert(html.indexOf('[slider:textureDepth]')<html.indexOf('[slider:textureWrinkles]'));assert(html.includes('id="reset-texture"'));
assert.equal(new Set(TEXTURE_STYLES.map(s=>s.name)).size,4);assert.throws(()=>textureStyle(s,40));
console.log(JSON.stringify({passed:true,newControls:keys,texturePresets:TEXTURE_STYLES.map(t=>t.name),legacyWeightsZero:true,materialSwitchPreservesTexture:true,presetTransfer:true,independentSurfaceOnly:true}));
