import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readPreset} from '../preset-files.js';
import {sampleFrame} from '../solid-renderer.js';
import {surfaceWebGraph,surfaceWebStrength,surfaceWebWeights} from '../surface-web-model.js';

const surface={engine:'solid',grainSource:'body',structWeaveCradle:.6,structWeaveNodes:.8,structWeaveMembrane:.3};
assert.deepEqual(surfaceWebWeights(surface),[.6,.8,.3]);
assert.equal(surfaceWebStrength({}),0);
const woven={...surface,structFibres:1,structWeft:1,structShell:1};
assert.deepEqual(surfaceWebWeights(woven),[.6,0,0]);
assert.equal(surfaceWebStrength({...woven,structWeaveBranching:1,structWeaveTension:1}),0);
assert.deepEqual(surfaceWebWeights({...woven,grainSource:'cloud'}),[.6,.8,.3]);
assert.equal(surfaceWebStrength({...surface,grainSource:'cloud',pCount:0}),0);

// Existing reference animation keeps its original, explicitly modelled junctions on every frame.
const {state}=readPreset(await readFile(new URL('../previews/reticolo-giunzioni.prisma.json',import.meta.url),'utf8'));
for(let f=0;f<=60*state.duration;f++){
 const s=sampleFrame(state,2*Math.PI*f/(60*state.duration));
 assert.equal(surfaceWebStrength(s),0,'duplicate reference geometry at frame '+f);
}

// The implicit sampler marks a missed surface with an invalid point. Even a
// single miss must not draw a triangle to the fallback coordinate at infinity.
const count=80,rest=new Float32Array(8*count);
for(let i=0;i<count;i++){
 const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*2.399963;
 rest.set([r*Math.cos(a),y,r*Math.sin(a),i%9===0?0:1],8*i);
}
const first=surfaceWebGraph(rest,count,0);
assert.deepEqual(first,surfaceWebGraph(rest,count,0));
assert(first.faces.length&&first.edges.length&&first.points.length);
for(const buffer of Object.values(first))for(const index of buffer)assert(rest[8*index+3]);
assert(surfaceWebGraph(rest,count,1).edges.length>first.edges.length);
assert.notDeepEqual(surfaceWebGraph(rest,count,0,.55).edges,first.edges);
const beads=surfaceWebGraph(rest,count,1,1,false);
assert.deepEqual(beads.points,first.points);assert.equal(beads.faces.length+beads.edges.length,0);
console.log('Reticolo su forma e nuvola, connettività, identità dei campioni e compatibilità dei 1.801 fotogrammi verificati.');
