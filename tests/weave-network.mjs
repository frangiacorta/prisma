import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { newCreation, normalizeCreation } from '../creative-model.js';
import { sampleFrame } from '../solid-renderer.js';
import { presetDocument, readPreset } from '../preset-files.js';
import { structureField, STRUCTURE_DEFAULTS } from '../structure-model.js';
import { junctionPose } from '../weave-junction.js';
import { slingDistance, slingPose } from '../weave-sling.js';

const source=existsSync('web/studio/index.html')?'web/studio':'.';
const path='/previews/reticolo-giunzioni.prisma.json';
const raw=await readFile(process.argv.find(arg=>arg.startsWith('--preset='))?.slice(9)||source+path,'utf8');
const project=readPreset(raw);
const {state}=project;
const tau=Math.PI*2;
const at=seconds=>sampleFrame(state,seconds/state.duration*tau);
const original=normalizeCreation(newCreation());
// An incoming and outgoing fibre meet opposite shoulders. Pulling the
// nodules apart takes up the threads' slack without moving either stitch.
const ends=new Float32Array(18*4);
for(let i=0;i<18;i++)ends[i*4+3]=.06;
ends[6*4]=.12;
const pouch=slingPose(ends,1,0,0,0,0,1).vertices;
ends[6*4]=.75;
const stretched=slingPose(ends,1,0,0,0,0,1).vertices;
assert(pouch[2]>0&&pouch[6]<0);
assert(stretched[3]<pouch[3]);
assert.deepEqual(stretched.slice(0,3),pouch.slice(0,3));
assert(Math.abs((stretched[4]-pouch[4])-.63)<1e-6);
assert.equal(stretched[5],pouch[5]);
assert.equal(stretched[6],pouch[6]);
// Once the available silk runs out, a long span must open while its
// attachment on the nodule remains sewn. Check the actual field on the face.
assert(stretched[7]>pouch[7]);
const gauze=new Float32Array([0,0,0,0,.8,0,0,0,0,.4,0,1]);
function thinnestDistance(face,x0,x1,y0,y1){
 let closest=Infinity;
 for(let j=0;j<=12;j++)for(let i=0;i<=30;i++){
  const x=x0+(x1-x0)*i/30,y=y0+(y1-y0)*j/12;
  closest=Math.min(closest,slingDistance(x,y,0,face,0,1.7,1));
 }
 return closest;
}
const sewn=thinnestDistance(gauze,.005,.032,.002,.022);
assert(sewn<0&&thinnestDistance(gauze,.31,.46,.034,.10)<0);
gauze[7]=1;
assert.equal(thinnestDistance(gauze,.005,.032,.002,.022),sewn);
assert(thinnestDistance(gauze,.31,.46,.034,.10)>.01);
const dormant={...original,...STRUCTURE_DEFAULTS,structWeaveBranching:1};
const opticsAt=at(24);
for(const point of [[0,0,0],[1,0,0],[0,1.2,.86]]){
 const d=Math.hypot(...point)-1;
 assert.equal(structureField(dormant,d,point),structureField(original,d,point));
 assert.equal(structureField({...opticsAt,structWeaveCupLight:0},d,point),
              structureField({...opticsAt,structWeaveCupLight:1.6},d,point));
}
for(const [key,track] of Object.entries(state.motions).filter(([,track])=>track.mode==='points')){
 assert(track.enabled&&track.points.length>=10,key);
 assert.equal(at(0)[key],at(state.duration)[key],key+' seam');
}
assert(at(2).structWeaveGrowth>at(7).structWeaveGrowth+.6);
// The final frame of the twelve-second close-up still carries the beads.
// Sample both sides of the cut as well as its last encoded video frame.
for(const sec of [11.6,359/30,12,12.2]){
 assert(at(sec).structWeaveCradle>.85,'The web released its load at '+sec);
 assert(at(sec).structWeaveFlex>.75,'The pocket lost its flex at '+sec);
}
assert.equal(at(14).structWeaveCradle,0);
// At full load every suspended bead has a real attachment in the web.
// Repeat after resizing the nodules to catch a net left in the old pose.
for(const t of [11.6,359/30,12,12.2]){
 const frame=at(t);
 for(const size of [frame.structWeaveCupSize,.48,1.35]){
  const {ends,sling}=junctionPose({...frame,structWeaveCupSize:size});
  assert(sling.pocket>.95);
  for(let j=0;j<ends.length;j+=4){
   let nearest=Infinity;
   for(let v=0;v<sling.vertices.length;v+=4){
    nearest=Math.min(nearest,Math.hypot(...[0,1,2].map(k=>sling.vertices[v+k]-ends[j+k])));
   }
   assert(nearest<ends[j+3],`Web detached from bead ${j/4} at ${t}s, cup size ${size}`);
  }
 }
}
assert(at(17).structWeaveRelease>at(11).structWeaveRelease+.5);
assert(at(24).structWeaveCup>at(17).structWeaveCup+.6);
assert(at(5).transparency<.55 && at(24).transparency>.65 && at(24).transparency>at(5).transparency+.25);
assert(at(24).structWeaveCupLight>at(5).structWeaveCupLight+.2);
assert.deepEqual(readPreset(JSON.stringify(presetDocument(project))).state.motions,state.motions);
if(process.argv.includes('--model')){
 console.log('Reticolo · punti temporali, sezione disattivata e salvataggio verificati');
 process.exit(0);
}

const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1190,height:845},serviceWorkers:'block'});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('http://localhost:8242/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/weave-check.html')return route.fulfill({contentType:'text/html',body:'<!doctype html>'});
  if(url.pathname===path)return route.fulfill({contentType:'application/json',body:raw});
  const file=source+(url.pathname==='/'?'/index.html':url.pathname);
  return existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:'File unavailable'});
 });
 await page.goto('http://localhost:8242/weave-check.html');
 const report=await page.evaluate(async ({state,tau})=>{
  const {structureField,structureUniforms,STRUCTURE_GLSL}=await import('/structure-model.js');
  const {Renderer,sampleFrame}=await import('/renderer.js');
  const renderer=new Renderer(document.createElement('canvas'));
  const g=renderer.gl;
  const probe=()=>{
   const gl=document.createElement('canvas').getContext('webgl2');
   if(!gl?.getExtension('EXT_color_buffer_float'))throw Error('Floating geometry test unavailable');
   const program=gl.createProgram();
   const code=[
    '#version 300 es\nvoid main(){gl_Position=vec4(vec2((gl_VertexID<<1)&2,gl_VertexID&2)*2.-1.,0.,1.);}',
    '#version 300 es\n#define WEAVE_DETAIL 1\nprecision highp float;uniform float uSeed;uniform vec4 uRuntime;uniform sampler2D positions;out vec4 color;'+STRUCTURE_GLSL+
     'void main(){vec3 p=texelFetch(positions,ivec2(gl_FragCoord.xy),0).xyz; color=vec4(structureField(length(p)-1.,p));}'
   ];
   for(const [i,type] of [gl.VERTEX_SHADER,gl.FRAGMENT_SHADER].entries()){
    const shader=gl.createShader(type);gl.shaderSource(shader,code[i]);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program,shader);gl.deleteShader(shader);
   }
   gl.linkProgram(program);gl.useProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   let seed=0xc0638b57;
   const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
   const n=1512,input=new Float32Array(n*4),out=new Float32Array(n*4);
   for(let i=0;i<n;i++){
    const angle=next()*tau,z=next()*2-1,r=Math.sqrt(1-z*z),size=.78+next()*.53;
    input.set([r*Math.cos(angle)*size,r*Math.sin(angle)*size,z*size,1],i*4);
   }
   function texture(unit,data){
    const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,n,1,0,gl.RGBA,gl.FLOAT,data);return t;
   }
   const inputTexture=texture(0,input),outputTexture=texture(1,null),fb=gl.createFramebuffer();
   gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,outputTexture,0);
   gl.uniform1i(gl.getUniformLocation(program,'positions'),0);
   gl.uniform4f(gl.getUniformLocation(program,'uRuntime'),0,0,2,16);gl.viewport(0,0,n,1);
   const result=[];
   for(const seconds of [0,2,7,12,15,18,24]){
    const queried=sampleFrame(state,seconds/state.duration*tau);
    const frame=seconds===12?{...queried,structWeaveBranching:.49,structWeaveTension:.46}:queried;
    structureUniforms(frame,(name,value)=>gl['uniform'+value.length+'fv'](gl.getUniformLocation(program,name),value));
    gl.uniform1f(gl.getUniformLocation(program,'uSeed'),(frame.seed%1000)*.013);
    gl.drawArrays(gl.TRIANGLES,0,3);gl.readPixels(0,0,n,1,gl.RGBA,gl.FLOAT,out);
    let max=0,mean=0,signs=0,nearSurface=0;
    for(let i=0;i<n;i++){
     const point=Array.from(input.subarray(i*4,i*4+3)),cpu=structureField(frame,Math.hypot(...point)-1,point),gpu=out[i*4];
     const error=Math.abs(cpu-gpu);
     max=Math.max(max,error);mean+=error/n;
     if(Math.min(Math.abs(cpu),Math.abs(gpu))<.012)nearSurface=Math.max(nearSurface,error);
     if((cpu<0)!==(gpu<0)&&error>.00005)signs++;
    }
    result.push({seconds,max,mean,nearSurface,signs,samples:n});
   }
   gl.deleteFramebuffer(fb);gl.deleteTexture(inputTexture);gl.deleteTexture(outputTexture);gl.deleteProgram(program);
   gl.getExtension('WEBGL_lose_context')?.loseContext();return result;
  };
  const kernel=probe();
  const draw=async (scene,phase=0,label='preset')=>{
   const start=performance.now();
   const ok=await renderer.drawAccumulated(scene,phase,168,224,{samples:1,quality:'full',cancelled:()=>performance.now()-start>45000});
   const error=g.getError();
   if(!ok||error)throw Error(label+' · render '+(ok?'ready':'incomplete')+', WebGL '+error+' after '+Math.round(performance.now()-start)+' ms');
   return renderer.pixels();
  };
  const difference=(a,b)=>{
   let total=0;for(let i=0;i<a.length;i++)total+=Math.abs(a[i]-b[i]);
   return total/a.length/255;
  };
  const bridge={...sampleFrame(state,7/state.duration*tau),motions:{}};
  const sprout={...sampleFrame(state,2/state.duration*tau),motions:{}};
  const emerging={...sampleFrame(state,1/state.duration*tau),motions:{}};
  const cups={...sampleFrame(state,24/state.duration*tau),motions:{}};
  const trials=[
   ['ramificazione',bridge,'structWeaveBranching',.34],
   ['tensione delle giunzioni',bridge,'structWeaveTension',.30],
   ['passo longitudinale',bridge,'structWeavePitch',1.52],
   ['disposizione posteriore X',bridge,'structWeaveRearX',bridge.structWeaveRearX>.3?-.62:.72],
   ['disposizione posteriore Y',bridge,'structWeaveRearY',bridge.structWeaveRearY>.3?-.68:.73],
   ['scarto della base',bridge,'structWeaveRootBend',.41],
   ['scarto della biforcazione',bridge,'structWeaveTipBend',-.46],
   ['inclinazione dei ponti',bridge,'structWeaveSlope',bridge.structWeaveSlope>.25?-.72:.81],
   ['curvatura dei ponti',bridge,'structWeaveArch',bridge.structWeaveArch>.25?-.76:.83],
   ['rete attorno ai noduli',bridge,'structWeaveCradle',0],
   ['elasticità dei rami',sprout,'structWeaveFlex',0],
   ['posizione della germinazione',sprout,'structWeaveFront',sprout.structWeaveFront>.5?.07:.92],
   ['gerarchia',bridge,'structWeaveHierarchy',0],
   ['fibre',bridge,'structWeaveFinesse',.42],
   ['direzione microfibre',bridge,'structWeaveAlignment',0],
   ['ponti',bridge,'structWeaveMembrane',.24],
   ['giunzioni',bridge,'structWeaveNodes',.2],
   ['ritiro',cups,'structWeaveRelease',.43],
   ['crescita',sprout,'structWeaveGrowth',.13],
   ['sfasamento della crescita',emerging,'structDelay',emerging.structDelay>.5?.05:.95],
   ['lunghezza',sprout,'structWeaveReach',.48],
   ['apertura laterale',cups,'structWeaveSpread',.51],
   ['coppe',cups,'structWeaveCup',.17],
   ['diametro coppe',cups,'structWeaveCupSize',.52],
   ['svasatura coppe',{...cups,structDelay:.24},'structWeaveFlare',0],
   ['apertura indipendente dal ritiro',sprout,'structWeaveCup',1],
   ['trasparenza',cups,'transparency',.22],
   ['luce interna',cups,'structWeaveCupLight',0],
   ['fuoco',bridge,'focusDepth',1.7],
   ['luce',bridge,'lights',bridge.lights.map(light=>({...light,power:light.power*.23}))]
  ];
  const before=new Map();
  const changes=[];
  for(const [label,scene,key,value] of trials){
   if(!before.has(scene))before.set(scene,await draw(scene,0,label+' (prima)'));
   changes.push({label,difference:difference(before.get(scene),await draw({...scene,[key]:value},0,label))});
  }
  const first=await draw(state),last=await draw(state,tau);
  const after=await draw({...bridge,sceneGrains:.40,pCount:3200,pSize:.28,pOpacity:.55},0);
  const layerChange=difference(before.get(bridge),after);
  const results={kernel,changes,loop:difference(first,last),layerChange};
  renderer.dispose();return results;
 },{state,tau});
 for(const frame of report.kernel){
  assert(frame.mean<.0001&&frame.nearSurface<.001,JSON.stringify(frame));
  assert(frame.signs===0,JSON.stringify(frame));
 }
 for(const result of report.changes)assert(result.difference>.001,JSON.stringify(result));
 assert.equal(report.loop,0);
 assert(report.layerChange>.004);

 await page.goto('http://localhost:8242/?preset='+encodeURIComponent(path.slice(1)));
 await page.waitForFunction(()=>window.prismaReady&&JSON.parse(localStorage.getItem('prisma-current-v2'))?.state?.structWeaveBranching===1,null,{timeout:30000});
 await page.waitForFunction(()=>document.getElementById('render-error').hidden,null,{timeout:80000});
 const controls=['structWeavePitch','structWeaveRootBend','structWeaveTipBend','structWeaveRearX','structWeaveRearY','structWeaveSlope','structWeaveArch','structWeaveCradle','structWeaveFlex','structWeaveBranching','structWeaveTension','structWeaveFront','structWeaveFinesse','structWeaveReach','structWeaveRelease','structWeaveHierarchy','structWeaveSpread','structWeaveAlignment','structWeaveCupSize','structWeaveFlare'];
 await page.locator('[data-tab="shape"]').click();
 for(const key of controls)assert.equal(await page.locator('[data-number="'+key+'"]').count(),1,key);
 await page.locator('[data-tab="light"]').click();
 assert.equal(await page.locator('[data-number="structWeaveCupLight"]').count(),1);
 await page.locator('[data-tab="motion"]').click();
 await page.locator('[data-animate-path="motions.structWeaveRelease"]').click();
 const rows=page.locator('#animation-editor .motion-point');
 assert.equal(await rows.count(),state.motions.structWeaveRelease.points.length);
 const value=rows.first().locator('input').nth(1);
 await value.fill('0.17');
 await value.press('Tab');
 await page.waitForFunction(()=>{
  const project=JSON.parse(localStorage.getItem('prisma-current-v2'));
  const state=project?.state;
  return Math.abs((state?.structWeaveRelease||0)+(state?.motions?.structWeaveRelease?.points?.[0]?.offset||0)-.17)<.00001;
 });
 const durations=await page.evaluate(async()=>{
  const duration=name=>new Promise((resolve,reject)=>{
   const v=document.createElement('video');
   const timeout=setTimeout(()=>reject(Error('Preview metadata timed out: '+name)),15000);
   v.onloadedmetadata=()=>{clearTimeout(timeout);resolve(v.duration);};
   v.onerror=()=>{clearTimeout(timeout);reject(Error('Unreadable preview: '+name));};
   v.preload='metadata';v.src='/previews/'+name+'.mp4';
  });
  return Promise.all(['reticolo-apertura','reticolo-giunzioni'].map(duration));
 });
 assert.deepEqual(durations,[12,30]);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
