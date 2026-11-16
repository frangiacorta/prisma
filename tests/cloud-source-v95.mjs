import assert from 'node:assert/strict';
import {changeGrainSource,cloudToBody,grainMix} from '../body-layers.js';
import {newCreation,normalizeCreation} from '../creative-model.js';
import {sampleFrame} from '../solid-renderer.js';
import {presetDocument,readPreset} from '../preset-files.js';
import {TRACK_META} from '../studio-model.js';

// CPU only: no browser, WebGL context, screenshots or timing inference.
const rows=[];
const check=(name,fn)=>{fn();rows.push({name,passed:true});};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const wave=(s,key,amplitude)=>s.motions[key]={...s.motions[key],enabled:true,amplitude,phase:32,cycles:2,direction:-1,curve:'soft',pace:.2,pacePhase:37,hold:.1,mode:'wave'};
const cloud=()=>normalizeCreation({...newCreation(),engine:'particles',grainSource:'cloud',sceneGrains:.37,pOpening:.8,pThickness:.28,pLobeDepth:.6,pLobes:7,pCellAmount:.4,pTentacle:.6,pTravel:1.2,pOrganic:.8,
 baseForm:2,structFan:.8,structSlices:.5,fractalAmount:.9,cellMorph:.8,petalAmount:.7,stemAmount:.4,hole:.2,cut:.2,asymmetry:.4,grainDispersal:0});
const reopen=s=>readPreset(JSON.stringify(presetDocument({state:s,name:'Source conversion contract'}))).state;
const common=['palette','lights','thinFilm','pFilm','metal','roughness','transparency','refraction','coat','hollow','wallThickness','fullness','growthAmount','growthColor','duration','motionPeriod','speed','motion','positionX','positionY','rotateX','rotateY','rotateZ','volume','stretchX','stretchY','stretchZ','pCount','pSize','pTrailCount','pTrailLength','finishEnabled'];

check('Explicit cloud→body clears latent geometry and preserves common material',()=>{
 const s=cloud(),before=structuredClone(s);wave(s,'structFan',.3);wave(s,'cellMorph',.2);
 const report=changeGrainSource(s,'body');
 assert.equal(s.grainSource,'body');assert.equal(s.engine,'solid');assert.equal(grainMix(s),.37);
 for(const k of ['baseForm','structFan','structSlices','fractalAmount','cellMorph','petalAmount','stemAmount','hole','cut','asymmetry'])assert.equal(s[k],0,k);
 assert.equal(s.motions.structFan.enabled,false);assert.equal(s.motions.cellMorph.enabled,false);
 near(s.loopAmount,.8);near(s.lobeAmount,.24);assert.equal(s.lobes,7);near(s.loopTube,.28);
 for(const k of common)assert.deepEqual(s[k],before[k],k);
 assert.equal(report.lossy,true);assert.ok(report.unmapped.includes('pCellAmount'));assert.ok(report.unmapped.includes('pTentacle'));assert.ok(report.unmapped.includes('pOrganic'));
 assert.notEqual(s.scale,before.scale);assert.equal(cloudToBody(before).engine,'solid');
});
check('Implicit legacy source and explicit source produce the same conversion',()=>{
 const a=cloud(),b=structuredClone(a);delete b.grainSource;
 changeGrainSource(a,'body');changeGrainSource(b,'body');assert.deepEqual(a,b);
});
check('Opening/lobe/scale tracks preserve phase, rhythm and amplitude mapping',()=>{
 const s=cloud();wave(s,'pOpening',.12);wave(s,'pLobeDepth',.15);wave(s,'scale',.08);
 const old=structuredClone(s),report=changeGrainSource(s,'body'),factor=s.scale/old.scale;
 for(const phase of [0,.37,1.8,3.2,6.283185307179586]){
  const a=sampleFrame(old,phase),b=sampleFrame(s,phase);near(b.loopAmount,a.pOpening);near(b.lobeAmount,a.pLobeDepth*.4);near(b.scale,a.scale*factor);
 }
 assert.equal(s.motions.pOpening.enabled,false);assert.equal(s.motions.pLobeDepth.enabled,false);
 assert.ok(report.mappedTracks.some(t=>t.from==='pOpening'&&t.to==='loopAmount'));
 const opened=reopen(s);for(const key of ['loopAmount','lobeAmount','scale'])assert.deepEqual(opened.motions[key],s.motions[key]);
 for(const key of ['pOpening','pThickness','pLobeDepth','lobeAmount'])assert.ok(TRACK_META[key]);
});
check('Closed-cloud thickness animates radius; incompatible dual waves are disclosed',()=>{
 const s=cloud();s.pOpening=0;s.pThickness=.6;wave(s,'pThickness',.05);const old=structuredClone(s),report=changeGrainSource(s,'body');
 assert.ok(report.mappedTracks.some(t=>t.from==='pThickness'&&t.to==='scale'));
 for(const phase of [0,.5,2])near(sampleFrame(s,phase).scale,old.scale*2*(1.7*2.6/7.5)*sampleFrame(old,phase).pThickness);
 const both=cloud();both.pOpening=0;wave(both,'pThickness',.05);wave(both,'scale',.1);
 const limitation=changeGrainSource(both,'body');assert.ok(limitation.unmapped.includes('motions.pThickness'));
});
check('Ring tube motion and reverse body→cloud survive preset normalization',()=>{
 const s=normalizeCreation({...newCreation(),grainSource:'body',sceneGrains:.4,loopAmount:1,loopRadius:.9,loopTube:.3,lobeAmount:.12,lobes:5,deform:.3,twist:.7});
 wave(s,'loopTube',.06);wave(s,'loopAmount',.1);wave(s,'lobeAmount',.03);const old=structuredClone(s);
 changeGrainSource(s,'cloud');for(const key of ['pOrganic','pTravel','pCellAmount','pTentacle','deform','twist'])assert.equal(s[key],0,key);
 const saved=reopen(s);for(const key of ['pThickness','pOpening','pLobeDepth'])assert.deepEqual(saved.motions[key],s.motions[key]);
 for(const phase of [0,.5,2]){const a=sampleFrame(old,phase),b=sampleFrame(saved,phase);near(b.pThickness,a.loopTube);near(b.pLobeDepth,a.lobeAmount/.4);}
});
check('Unedited return restores original geometry after save; current material/pose persist',()=>{
 const s=cloud();wave(s,'pCellAmount',.2);const old=structuredClone(s);changeGrainSource(s,'body');
 s.palette=['#aabbcc'];s.metal=.87;s.rotateY=73;s.duration=21;
 const opened=reopen(s),report=changeGrainSource(opened,'cloud');
 assert.equal(report.restored,true);assert.equal(report.lossy,false);
 for(const k of ['pOpening','pThickness','pLobes','pLobeDepth','pCellAmount','pTentacle','pTravel','pOrganic','scale','baseForm','structFan','fractalAmount'])assert.deepEqual(opened[k],old[k],k);
 assert.deepEqual(opened.motions.pCellAmount,old.motions.pCellAmount);
 assert.deepEqual(opened.palette,['#aabbcc']);near(opened.metal,.87);near(opened.rotateY,73);near(opened.duration,21);
});
check('Geometry edits invalidate return memory; conversions are repeatable and non-destructive',()=>{
 const s=cloud();changeGrainSource(s,'body');s.loopAmount=.35;const report=changeGrainSource(s,'cloud');
 assert.equal(report.restored,false);near(s.pOpening,.35);
 const saved=structuredClone(s),noop=changeGrainSource(s,'cloud');assert.equal(noop.changed,false);assert.deepEqual(s,saved);
 assert.throws(()=>changeGrainSource(s,'invalid'),TypeError);assert.deepEqual(s,saved);
});
check('Geometry memory is bounded, whitelisted and compatible with old presets',()=>{
 const s=cloud();assert.equal(s.grainSourceMemory,undefined);changeGrainSource(s,'body');
 const raw=JSON.parse(JSON.stringify(s));raw.grainSourceMemory.original.values.palette=['#ffffff'];raw.grainSourceMemory.original.values.unsupported=1;raw.grainSourceMemory.original.values.scale=1e30;
 const clean=normalizeCreation(raw);assert.equal(clean.grainSourceMemory.original.values.palette,undefined);assert.equal(clean.grainSourceMemory.original.values.unsupported,undefined);assert.equal(clean.grainSourceMemory.original.values.scale,4.5);
 assert.deepEqual(normalizeCreation(reopen(s)),reopen(s));
 const old=normalizeCreation({...newCreation(),engine:'particles'});assert.equal(old.grainSource,undefined);assert.equal(old.sceneGrains,undefined);
});
check('New source tracks clamp at their domains and mapped edge phases agree',()=>{
 const s=normalizeCreation({...newCreation(),grainSource:'body',loopAmount:.8,lobeAmount:.35,loopTube:.3});
 wave(s,'loopAmount',.5);wave(s,'lobeAmount',.3);wave(s,'loopTube',.5);const old=structuredClone(s);
 const report=changeGrainSource(s,'cloud');assert.ok(report.clipped.includes('motions.pOpening'));
 const opened=reopen(s);
 for(let i=0;i<65;i++){
  const phase=i/64*Math.PI*2,a=sampleFrame(old,phase),b=sampleFrame(opened,phase);
  near(b.pOpening,a.loopAmount);near(b.pLobeDepth,a.lobeAmount/.4);
  assert.ok(b.pThickness>=.02&&b.pThickness<=1);
  assert.ok(b.pOpening>=0&&b.pOpening<=1);assert.ok(b.pLobeDepth>=0&&b.pLobeDepth<=1);
 }
});
console.log(JSON.stringify({passed:true,scope:'CPU source conversion and preset contract; not visual equivalence',tests:rows},null,2));
