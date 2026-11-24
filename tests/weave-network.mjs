import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { newCreation, normalizeCreation } from '../creative-model.js';
import { sampleFrame } from '../solid-renderer.js';
import { presetDocument, readPreset } from '../preset-files.js';
import { structureField, STRUCTURE_DEFAULTS } from '../structure-model.js';

const source=existsSync('web/studio/index.html')?'web/studio':'.';
const path='/previews/reticolo-giunzioni.prisma.json';
const raw=await readFile(process.argv.find(arg=>arg.startsWith('--preset='))?.slice(9)||source+path,'utf8');
const project=readPreset(raw);
const {state}=project;
const tau=Math.PI*2;
const at=seconds=>sampleFrame(state,seconds/state.duration*tau);
const original=normalizeCreation(newCreation());
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
assert(at(17).structWeaveRelease>at(11).structWeaveRelease+.5);
assert(at(24).structWeaveCup>at(17).structWeaveCup+.6);
assert(at(24).transparency>at(5).transparency+.4);
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
  const draw=async (scene,phase=0)=>{
   const start=performance.now();
   const ok=await renderer.drawAccumulated(scene,phase,168,224,{samples:1,quality:'full',cancelled:()=>performance.now()-start>45000});
   if(!ok||g.getError())throw Error('Reticolo render failed');
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
   if(!before.has(scene))before.set(scene,await draw(scene));
   changes.push({label,difference:difference(before.get(scene),await draw({...scene,[key]:value}))});
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
 const controls=['structWeavePitch','structWeaveRootBend','structWeaveTipBend','structWeaveRearX','structWeaveRearY','structWeaveBranching','structWeaveTension','structWeaveFront','structWeaveFinesse','structWeaveReach','structWeaveRelease','structWeaveHierarchy','structWeaveSpread','structWeaveAlignment','structWeaveCupSize','structWeaveFlare'];
 await page.locator('[data-tab="shape"]').click();
 for(const key of controls)assert.equal(await page.locator('[data-number="'+key+'"]').count(),1,key);
 await page.locator('[data-tab="material"]').click();
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
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
