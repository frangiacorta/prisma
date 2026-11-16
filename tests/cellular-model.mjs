import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {newCreation} from '../creative-model.js';
import {animateCellular,CELLULAR_DEFAULTS,cellularField,uploadCellular} from '../cellular-form.js';
import {fieldAt,sampleFrame} from '../solid-renderer.js';
import {presetDocument,readPreset} from '../preset-files.js';

const output='reports/cellular-form';
await mkdir(output,{recursive:true});
const sphere={...newCreation(),seed:811};
const full={...sphere,cellMorph:1};
const points=Array.from({length:97},(_,i)=>[Math.sin(i*2.7)*1.3,Math.cos(i*1.7)*1.3,Math.sin(i*.9)*1.3]);
const compare=(a,b)=>points.map(p=>fieldAt(a,p)-fieldAt(b,p));
assert(compare(sphere,{...full,cellMorph:0,cellSpineLength:2}).every(x=>x===0));
for(const patch of [{cellBubbles:0},{cellSpines:0},{cellSpineLength:.12},{cellExposure:.1},{cellSpread:0},{cellSpineTaper:0},{cellSizeVariation:0}]){
 assert(compare(full,{...full,...patch}).some(x=>Math.abs(x)>.005),JSON.stringify(patch));
}
const animated=animateCellular(structuredClone(full));
assert.equal(sampleFrame(animated,0).cellMorph,0);
assert.equal(sampleFrame(animated,Math.PI).cellMorph,1);
assert(compare(sampleFrame(animated,0),sampleFrame(animated,2*Math.PI)).every(x=>Math.abs(x)<1e-8));
const living={...animated,cellMorph:1,motions:{...animated.motions,cellMorph:{enabled:false}}};
assert(compare(sampleFrame(living,0),sampleFrame(living,Math.PI/2)).some(x=>Math.abs(x)>.005));
assert(compare(sampleFrame(living,0),sampleFrame(living,2*Math.PI)).every(x=>Math.abs(x)<1e-8));
for(const p of points){
 const at=m=>cellularField({...full,cellMorph:m},Math.hypot(...p)-1,p);
 assert(Math.abs(at(.00001)-at(0))<.0002);
 assert(Math.abs(at(.50001)-at(.5))<.0002);
}
const doc=presetDocument({state:animated,name:'Cellule madreperlacee'});
const restored=readPreset(JSON.stringify(doc)).state;
for(const k of Object.keys(CELLULAR_DEFAULTS))assert.equal(restored[k],animated[k]);
for(const k of ['cellMorph','cellBreathPhase','cellSpinePhase'])assert.equal(restored.motions[k].enabled,true);
// A bent spine's own curve must stay inside its field. A non-orthogonal
// bend basis used to leave disconnected middle sections and floating caps.
for(const phase of [0,.23,.5,.79]){
 const scene={...full,cellBubbles:0,cellSpineBend:.9,cellFlex:.8,cellSpinePhase:phase,cellSpineWidth:.035,cellSpineTaper:1},uniforms={};
 const gl={uniform1f:(key,value)=>uniforms[key]=value,uniform2f:(key,...value)=>uniforms[key]=value,uniform2i:(key,...value)=>uniforms[key]=value,uniform4fv:(key,value)=>uniforms[key]=value};
 const locations=Object.fromEntries(['uCellBubbles','uCellGeometry','uCellCounts','uCellSpines','uCellBends','uCellAxes','uCellCore'].map(key=>[key,key]));
 uploadCellular(scene,gl,locations,true);
 for(let i=0;i<uniforms.uCellCounts[1];i++){
  const spine=uniforms.uCellSpines.slice(i*4,i*4+4),bend=uniforms.uCellBends.slice(i*4,i*4+4);
  assert(Math.abs(spine.slice(0,3).reduce((sum,v,k)=>sum+v*bend[k],0))<1e-12,'Spine bend must be transverse');
  for(const t of [.25,.5,.75,1]){
   const point=spine.slice(0,3).map((v,k)=>v*(scene.cellCore+spine[3]*t)+bend[k]*t*t);
   assert(cellularField(scene,Math.hypot(...point)-1,point)<0,'Bent spine centerline must remain inside');
  }
 }
}
