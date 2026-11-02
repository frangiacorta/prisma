import assert from 'node:assert/strict';
import {sampleFrame} from '../solid-renderer.js';
import {flowScene,FlowDirector} from '../playground-flow.js';
import {flowChoice,normalizeFlow,flowTiming,flowProfile} from '../flow-model.js';
import {normalizeCreation} from '../creative-model.js';
import {defaultPlayground,normalizePlayground} from '../playground-model.js';
const palettes=new Set(),moves=new Set(),materials=new Set(),rhythms=new Set();
for(const engine of ['solid','particles'])for(const mood of ['calm','organic','electric'])for(let step=0;step<60;step++){
 const f=normalizeFlow({engines:engine,mood,step}),scene=flowScene(f),s=normalizeCreation(scene.state);
 assert.deepEqual(scene,flowScene(f));assert(s.motions.colorWavePhase.enabled);assert(s.motions.roughness.enabled);assert.equal(s.engine,engine);
 const a=sampleFrame(s,.1),b=sampleFrame(s,1.3);assert.notEqual(a.colorWavePhase,b.colorWavePhase);assert.notEqual(a.roughness,b.roughness);assert.notDeepEqual([a.lights[0].x,a.lights[0].y,a.lights[0].z],[b.lights[0].x,b.lights[0].y,b.lights[0].z]);palettes.add(s.palette.join());moves.add(Object.entries(s.motions).filter(([k,t])=>/^(rotate|position|scale)/.test(k)&&t.enabled).map(([k])=>k).join());materials.add([s.metal,s.coat,s.thinFilm].join());rhythms.add(s.motions.colorWavePhase.pace.toFixed(2));
 assert(s.motions.colorWavePhase.pace>0);assert(s.lights[0].orbit.enabled);assert(flowTiming(f).hold>0);assert(flowTiming(f).transition>0);
 for(const t of Object.values(s.motions))assert([t.amplitude,t.cycles,t.phase,t.pace].every(Number.isFinite));
}
assert(palettes.size>=30);assert(moves.size>=8);assert(materials.size>=9);assert(rhythms.size>20);
const seq=Array.from({length:40},(_,step)=>flowChoice(normalizeFlow({step})).engine);assert(seq.some((x,i)=>i&&x===seq[i-1]));assert(seq.some((x,i)=>i&&x!==seq[i-1]));
for(let i=0;i<seq.length-4;i++)assert(new Set(seq.slice(i,i+5)).size===2);
const f=normalizeFlow({enabled:true,colors:'custom',palette:['#881122','#22bbcc','#ffddaa']}),scene=flowScene(f);assert.deepEqual(scene.state.palette,f.palette);
const e={config:defaultPlayground(scene),decks:{A:{...scene,phase:0,revision:0}},closed:false};e.config.flow=f;const director=new FlowDirector(e),s=e.decks.A.state,original=s.motions.roughness.amplitude;
for(let n=0;n<300;n++){e.decks.A.phase=n/40;director.modulate(1/60);}assert.deepEqual(s.palette,f.palette);
e.config.flow.intensity=1;for(let n=0;n<600;n++)director.modulate(1/60);assert(s.motions.roughness.amplitude>original);assert(s.speed>0&&s.speed<5);assert(s.deform>=0&&s.deform<=1);
const snapshot={...e.config,decks:{A:e.decks.A,B:scene}};assert.deepEqual(normalizePlayground(JSON.parse(JSON.stringify(snapshot))).flow,e.config.flow);
assert.equal(normalizeFlow({colors:'current'}).colors,'current');assert.equal(normalizeFlow().colors,'auto');
console.log(JSON.stringify({pass:true,scenes:360,palettes:palettes.size,choreographies:moves.size,materials:materials.size,rhythms:rhythms.size,sequence:seq.slice(0,16)}));
