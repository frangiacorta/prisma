import assert from 'node:assert/strict';
import {FlowDirector,flowScene} from '../playground-flow.js';
import {normalizeFlow,flowChoice,flowTiming} from '../flow-model.js';
import {defaultPlayground,normalizePlayground,transitionValue} from '../playground-model.js';
import {newCreation,normalizeCreation} from '../creative-model.js';
const config=defaultPlayground({state:newCreation(),name:'Test',ratio:16/9,phase:0});
for(const engines of ['solid','particles'])for(let step=0;step<10;step++){
 const f=normalizeFlow({engines,step,colors:'neon'}),d=flowScene(f),s=normalizeCreation(d.state);
 assert.equal(s.engine,engines);assert.equal(s.background,'#000000');assert.deepEqual(d,flowScene(f));assert(Object.entries(s.motions).some(([k,t])=>/^(rotate|position|scale)/.test(k)&&t.enabled));assert(s.palette.length===3);
}
assert.equal(new Set(Array.from({length:5},(_,step)=>flowChoice(normalizeFlow({step})).family)).size,5);
config.flow=normalizeFlow({enabled:true,speed:3,colors:'neon',step:10});assert.deepEqual(normalizePlayground(JSON.parse(JSON.stringify(config))).flow,config.flow);
const make=()=>{const e={config:structuredClone(config),ratio:16/9,clock:0,closed:false,generation:{A:0,B:0},pending:{A:false,B:false},decks:{A:{state:newCreation(),name:'Manuale A',revision:0},B:{state:newCreation(),name:'Manuale B',revision:0}},job:null,notify(){},async load(id,d){this.decks[id]={...d,revision:0};return true;},take(to){this.job={from:this.config.mix,to,start:this.clock,seconds:flowTiming(this.config.flow).transition,curve:'smooth'};return true;}};e.flow=new FlowDirector(e);e.tick=async(dt=.1)=>{e.clock+=dt;e.flow.tick(dt);if(e.job){e.config.mix=transitionValue(e.job,e.clock);if(e.clock>=e.job.start+e.job.seconds){e.config.mix=e.job.to;e.job=null;}}await Promise.resolve();};return e;};
let e=make();await e.tick();assert.equal(e.flow.phase,'ready');e.flow.next();await e.tick();assert.equal(e.flow.phase,'transition');for(let i=0;i<3;i++)await e.tick();const mix=e.config.mix;e.config.flow.paused=true;for(let i=0;i<5;i++)await e.tick();assert(Math.abs(e.config.mix-mix)<1e-12);e.flow.next();for(let i=0;i<20;i++)await e.tick();assert(e.flow.cycles>=1);assert.equal(e.config.flow.step,11);
e.flow.stop();const manualMix=e.config.mix;for(let i=0;i<60;i++)await e.tick();assert.equal(e.config.mix,manualMix);assert.equal(e.flow.phase,'idle');
e=make();e.load=async()=>false;await e.tick();assert.equal(e.flow.phase,'error');assert(e.config.flow.paused);e.load=async(id,d)=>{e.decks[id]={...d,revision:0};return true;};e.flow.next();await e.tick();assert.equal(e.flow.phase,'ready');
e=make();let resolve;e.load=()=>new Promise(r=>resolve=r);await e.tick();assert.equal(e.flow.phase,'loading');e.flow.stop();resolve(true);await Promise.resolve();assert.equal(e.flow.phase,'idle');assert.equal(e.generation.B,1);
e=make();e.config.mix=.3;await e.tick();assert.equal(e.flow.phase,'settle');for(let i=0;i<30;i++)await e.tick();assert(e.flow.phase==='ready');
console.log('PASS Flow: ten families/engine combinations, determinism, project roundtrip, pause, takeover, load failure/retry and cancellation');
