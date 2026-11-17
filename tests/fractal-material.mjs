import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startRegiaServer} from '../pc/server.mjs';
const startCreativeServer=(port,options)=>startRegiaServer(port,options?.studioRoot);
import assert from 'node:assert/strict';
const base=JSON.parse(await readFile(new URL('../previews/mandelbulb-dettaglio.prisma.json',import.meta.url),'utf8')).state;
Object.assign(base,{fractalKind:3,colorLayers:1,colorLayerMix:0,colorWaveAmount:0});
const cases=[['plain',{}],['affine',{scale:.8,positionX:.2,positionY:-.4,stretchX:1.3,stretchY:.7,stretchZ:1.2,volume:.5,rotateX:23,rotateY:47,rotateZ:18}],['mixed',{twist:-.7,bendX:.3,taper:-.5,pinch:.4,asymmetry:.2,structGrowth:.2,structSpiral:-.2,structFold:.08}],['structure',{structGrowth:.3,structSpiral:.2,structCurl:.15,structFold:.12,structScallop:.3,structFlowPhase:.4}],['sculpt',{forcePoints:[{enabled:true,x:.3,y:.2,z:0,radius:1.8,strength:.7,swirl:.4}]}],['dynamics',{dynAmount:.4,dynWind:1.1,dynGravity:.3}],['softness-zero',{colorSoftness:0}],['softness-wide',{colorSoftness:2.5}],['finite-extreme',{fractalPower:14,asymmetry:1,bendX:1,bendY:1}]].map(([label,patch])=>({label,state:{...structuredClone(base),...patch,colorLayers:1,fractalAmount:1}}));
const service=await startCreativeServer(0);let browser,timer,result;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});timer=setTimeout(()=>browser.close().catch(()=>{}),90000);const page=await browser.newPage();
 await page.route('**/__gpu-proof.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Common recursive pigment contract</title>'}));await page.goto(service.url+'__gpu-proof.html');
 result=await page.evaluate(async({url,cases})=>{
  const {Renderer,implicitGeometrySource,uploadFractalMaterial}=await import(url+'solid-renderer.js'),{prismaPaletteGLSL}=await import(url+'particle-shading.js'),{ImplicitHitPass}=await import(url+'implicit-hit-pass.js'),{DynamicsSolver}=await import(url+'dynamics.js');
  const r=new Renderer(document.createElement('canvas')),g=r.gl,rows=[];let body,grain;
  const bodyMain=`layout(location=1)out vec4 hitLayer1;layout(location=2)out vec4 hitLayer2;layout(location=3)out vec4 hitLayer3;
  void main(){vec2 uv=(gl_FragCoord.xy-.5)/31.*4.-2.;vec3 world=vec3(uv,.37);float d=field(world);vec3 local=transform(world);
   vec3 actual=surfacePalette(local,vec3(.2),world);float t=fractalColorCoordinate(fractalMaterialPoint(world))*uColorLayers.y+uColorLayers.z;
   vec3 a=palette(t),b=palette(t+.37);fragColor=vec4(actual,1.);hitLayer1=vec4(recordedAnchor,1.);hitLayer2=vec4(mix(a,a*b*1.6,uColorLayers.w),1.);hitLayer3=vec4(fractalMaterialPoint(world),1.);}`;
  const header='#version 300 es\nprecision highp float;precision highp int;out vec4 fragColor;\n';
  const grainSource=header+prismaPaletteGLSL+`uniform sampler2D uAnchor;layout(location=1)out vec4 hitLayer1;layout(location=2)out vec4 hitLayer2;layout(location=3)out vec4 hitLayer3;
  void main(){vec3 p=texelFetch(uAnchor,ivec2(gl_FragCoord.xy),0).xyz;vec3 c=prismaColorLayersAt(p,vec3(.2),p,true);fragColor=vec4(c,1.);hitLayer1=vec4(fractalMaterialPoint(p),1.);hitLayer2=vec4(fractalColorCoordinate(fractalMaterialPoint(p)));hitLayer3=vec4(0.);}`;
  function read(pass,index){g.bindFramebuffer(g.READ_FRAMEBUFFER,pass.framebuffer);g.readBuffer(g.COLOR_ATTACHMENT0+index);const data=new Float32Array(4096);g.readPixels(0,0,32,32,g.RGBA,g.FLOAT,data);return data;}
  function compare(a,b){let max=0,nonfinite=0;for(let i=0;i<a.length;i++){if(i%4===3)continue;if(!Number.isFinite(a[i])||!Number.isFinite(b[i]))nonfinite++;else max=Math.max(max,Math.abs(a[i]-b[i]));}return{max,nonfinite};}
  const tex=g.createTexture();g.bindTexture(g.TEXTURE_2D,tex);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
  try{
   grain=new ImplicitHitPass(g,grainSource);await grain.prepare();
   for(const c of cases){
    let s=c.state;if(s.dynAmount>0){const solver=new DynamicsSolver(s);solver.advance(.5);s={...s,_dynamics:solver.frame(.5,s.dynAmount)};}
    let shader=implicitGeometrySource(s,{main:bodyMain});shader=shader.replace('vec3 fieldParts(vec3 world){','vec3 recordedAnchor;\nvec3 fieldParts(vec3 world){');
    const anchor='p/=vec3(uShape.y,uShape.z,volume);';const start=shader.indexOf('vec3 fieldParts(vec3 world){'),index=shader.indexOf(anchor,start);if(index<0)throw Error('Field anchor unavailable');shader=shader.slice(0,index)+shader.slice(index).replace(anchor,anchor+'recordedAnchor=p;');
    body=new ImplicitHitPass(g,shader);await body.prepare();body.draw(32,32,{upload:(gl,locations,program)=>{r.program=program;r.locations=locations;r.bindFrame(s,s,0,32,32,{},8,true);}});
    const bodyColor=read(body,0),anchors=read(body,1),expectedColor=read(body,2),expectedDomain=read(body,3);
    g.activeTexture(g.TEXTURE0+14);g.bindTexture(g.TEXTURE_2D,tex);g.texImage2D(g.TEXTURE_2D,0,g.RGBA32F,32,32,0,g.RGBA,g.FLOAT,anchors);
    grain.draw(32,32,{upload:(gl,locations,program)=>{
     const u=(name,v)=>{const l=gl.getUniformLocation(program,name);if(l!==null)gl['uniform'+v.length+'fv'](l,v);};uploadFractalMaterial(s,u);
     u('uGradient',[0,s.gradientScale,s.gradientOffset,1]);u('uColorLayers',[s.colorLayers,s.colorLayerScale,s.colorLayerShift,s.colorLayerMix]);u('uColorSoftness',[s.colorSoftness]);
     gl.uniform1i(gl.getUniformLocation(program,'uPaletteCount'),s.palette.length);gl.uniform3fv(gl.getUniformLocation(program,'uPalette'),s.palette.flatMap(hex=>[1,3,5].map(i=>{const x=parseInt(hex.slice(i,i+2),16)/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;})));gl.uniform1i(gl.getUniformLocation(program,'uAnchor'),14);
    }});
    const grainColor=read(grain,0),grainDomain=read(grain,1);rows.push({label:c.label,points:1024,domain:compare(expectedDomain,grainDomain),pigment:compare(expectedColor,grainColor),surface:compare(bodyColor,grainColor),glError:g.getError()});body.dispose();body=null;
   }
  }finally{g.deleteTexture(tex);body?.dispose();grain?.dispose();r.dispose();}
  return rows;
 },{url:service.url,cases});
}finally{clearTimeout(timer);await browser?.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
console.log(JSON.stringify(result,null,2));for(const row of result){assert.equal(row.glError,0);assert.equal(row.domain.nonfinite,0);assert.equal(row.pigment.nonfinite,0);assert(row.domain.max<2e-5);assert(row.pigment.max<2e-5);assert(row.surface.max<2e-5);}
