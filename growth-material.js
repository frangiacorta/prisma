// Gray–Scott finite differences adapted from dueyama/gray-scott-3d (MIT).
// Copyright (c) 2026 Daishin Ueyama. License: vendor/gray-scott/LICENSE.
// Prisma: periodic object-space material volume, seeded domains, cached worker
// baking and packed gradients. No geometry is replaced and no frame history is used.
export const GROWTH_DEFAULTS={growthAmount:0,growthVeins:0,growthScale:1.1,growthDepth:.55,growthColor:.7,growthContrast:1.4,growthCoverage:.5,growthRoughness:.2,growthWarp:.2,growthFlow:0,growthCycles:1,growthFeed:.028,growthKill:.058,growthDiffusion:1,growthAge:650,growthSeed:42};
export const GROWTH_META={growthVeins:['Rete di bordi',0,1,.01],growthAmount:['Crescita organica',0,1,.01],growthScale:['Densità del disegno',.3,3,.01],growthDepth:['Incisione / rilievo',-1,1,.01],growthColor:['Colore della crescita',0,1,.01],growthContrast:['Definizione dei bordi',.3,3,.01],growthCoverage:['Estensione',0,1,.01],growthRoughness:['Rugosità delle zone',0,1,.01],growthWarp:['Irregolarità del campo',0,1,.01],growthFlow:['Scorrimento del disegno',0,1,.01],growthCycles:['Cicli del disegno',1,6,1],growthFeed:['Nutrimento',.015,.065,.0005],growthKill:['Consumo',.045,.07,.0005],growthDiffusion:['Diffusione',.7,1.3,.01],growthAge:['Sviluppo della trama',100,1200,20],growthSeed:['Variante della crescita',1,9999,1]};
export const GROWTH_STUDIES=[{name:'Venature',values:{growthAmount:1,growthFeed:.028,growthKill:.056,growthAge:800,growthDiffusion:1,growthDepth:.9,growthScale:2.6,growthVeins:.9,growthCoverage:.6,growthContrast:1.4,growthColor:1,growthRoughness:.35,growthWarp:.2,growthSeed:42}},{name:'Cellule',values:{growthAmount:1,growthFeed:.0367,growthKill:.0649,growthAge:1000,growthDiffusion:1,growthDepth:.7,growthScale:2.5,growthVeins:0,growthCoverage:.75,growthContrast:1,growthColor:1,growthRoughness:.15,growthWarp:.15,growthSeed:42}}];

// Self-contained so the same worker can be embedded in an offline wallpaper.
export function bakeGrowth(config){
 const n=config.size||64,n2=n*n,count=n*n2;let a=new Float32Array(count),b=new Float32Array(count),aa=new Float32Array(count),bb=new Float32Array(count),seed=config.seed>>>0;
 const rand=()=>{seed+=0x6D2B79F5;let x=Math.imul(seed^seed>>>15,1|seed);x^=x+Math.imul(x^x>>>7,61|x);return ((x^x>>>14)>>>0)/4294967296;};
 const minus=Int32Array.from({length:n},(_,i)=>(i+n-1)%n),plus=Int32Array.from({length:n},(_,i)=>(i+1)%n);a.fill(1);
 // Numerous irregular nuclei fill the periodic volume, without a pole or seam.
 for(let j=0;j<140;j++){const cx=rand()*n,cy=rand()*n,cz=rand()*n,r=1.4+rand()*3.1;for(let z=Math.floor(cz-r);z<=cz+r;z++)for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++)if((x-cx)**2+(y-cy)**2+(z-cz)**2<r*r){const i=((z+n)%n)*n2+((y+n)%n)*n+(x+n)%n;a[i]=.45+rand()*.1;b[i]=.22+rand()*.08;}}
 const f=config.feed,k=config.kill,du=.18*config.diffusion,dv=.09*config.diffusion,dt=.8/Math.max(1,config.diffusion);
 for(let step=0;step<config.age;step++){
  for(let z=0;z<n;z++){const zz=z*n2,zm=minus[z]*n2,zp=plus[z]*n2;for(let y=0;y<n;y++){const yy=y*n,ym=minus[y]*n,yp=plus[y]*n;for(let x=0;x<n;x++){
   const i=zz+yy+x,u=a[i],v=b[i],rx=u*v*v;
   const lu=a[zz+yy+minus[x]]+a[zz+yy+plus[x]]+a[zz+ym+x]+a[zz+yp+x]+a[zm+yy+x]+a[zp+yy+x]-6*u;
   const lv=b[zz+yy+minus[x]]+b[zz+yy+plus[x]]+b[zz+ym+x]+b[zz+yp+x]+b[zm+yy+x]+b[zp+yy+x]-6*v;
   aa[i]=Math.min(1,Math.max(0,u+dt*(du*lu-rx+f*(1-u))));bb[i]=Math.min(1,Math.max(0,v+dt*(dv*lv+rx-(f+k)*v)));
  }}}
  [a,aa]=[aa,a];[b,bb]=[bb,b];
 }
 // Height and central gradients in one filtered sample. Signed gradients are
 // stored in a half-float GPU volume to preserve smooth shading gradients.
 const data=new Float32Array(count*4);let max=0,sum=0;
 for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=z*n2+y*n+x,v=b[i],q=i*4;max=Math.max(max,v);sum+=v;
  data[q]=Math.min(1,v*2);
  data[q+1]=Math.min(1,Math.max(0,.5+(b[z*n2+y*n+plus[x]]-b[z*n2+y*n+minus[x]])*2));
  data[q+2]=Math.min(1,Math.max(0,.5+(b[z*n2+plus[y]*n+x]-b[z*n2+minus[y]*n+x])*2));
  data[q+3]=Math.min(1,Math.max(0,.5+(b[plus[z]*n2+y*n+x]-b[minus[z]*n2+y*n+x])*2));
 }
 return {data,size:n,max,mean:sum/count};
}
const growthCache=new Map(),growthContexts=new WeakMap(),growthLocations=new WeakMap();let growthWorkerURL,previewEntry;
function growthConfig(s){return {size:64,feed:s.growthFeed??.028,kill:s.growthKill??.058,diffusion:s.growthDiffusion??1,age:Math.round(s.growthAge??650),seed:Math.round(s.growthSeed??42)};}
function cancelGrowthEntry(e){if(!e||e.result||e.pins)return;clearTimeout(e.timer);e.worker?.terminate();e.worker=null;e.cancelled=true;growthCache.delete(e.key);}
function startGrowthEntry(e){
 if(e.started||e.cancelled)return;e.started=true;clearTimeout(e.timer);const start=performance.now();
 growthWorkerURL??=URL.createObjectURL(new Blob(['const bakeGrowth='+bakeGrowth.toString()+';onmessage=e=>{const r=bakeGrowth(e.data);postMessage(r,[r.data.buffer]);};'],{type:'text/javascript'}));
 const worker=new Worker(growthWorkerURL);e.worker=worker;
 worker.onmessage=event=>{e.result=event.data;e.ms=performance.now()-start;worker.terminate();e.worker=null;for(const [k,v]of growthCache)if(growthCache.size>6&&v.result&&!v.pins&&k!==e.key)growthCache.delete(k);};
 worker.onerror=event=>{e.error=Error(event.message||'Impossibile calcolare la crescita organica.');worker.terminate();e.worker=null;};worker.postMessage(e.config);
}
function growthEntry(s,pinned=false){
 const config=growthConfig(s),key=JSON.stringify(config);let e=growthCache.get(key);
 if(!pinned&&previewEntry?.key!==key){cancelGrowthEntry(previewEntry);previewEntry=null;}
 if(!e){e={key,config,pins:0};growthCache.set(key,e);e.timer=setTimeout(()=>startGrowthEntry(e),120);}
 if(!pinned)previewEntry=e;
 if(e.error)throw e.error;return e;
}
export function prepareGrowth(s){if(!(s.growthAmount>0)){cancelGrowthEntry(previewEntry);previewEntry=null;return true;}return !!growthEntry(s).result;}
export function growthDiagnostics(){return {cached:growthCache.size,running:[...growthCache.values()].filter(e=>e.worker).length,pending:[...growthCache.values()].filter(e=>!e.started).length,completed:[...growthCache.values()].filter(e=>e.result).length};}
export async function prepareGrowthAsync(s,options={}){if(!(s.growthAmount>0))return true;const e=growthEntry(s,true);e.pins++;startGrowthEntry(e);try{while(!e.result){if(options.cancelled?.())return false;if(e.error)throw e.error;await new Promise(r=>setTimeout(r,16));}return true;}finally{e.pins--;if(!e.pins&&!e.result&&options.cancelled?.())cancelGrowthEntry(e);}}
export function bindGrowth(gl,program,s,phase=0){
 let c=growthContexts.get(gl);if(!c){c={texture:gl.createTexture()};growthContexts.set(gl,c);gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_3D,c.texture);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_3D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T,gl.TEXTURE_WRAP_R])gl.texParameteri(gl.TEXTURE_3D,p,gl.REPEAT);gl.texImage3D(gl.TEXTURE_3D,0,gl.RGBA16F,1,1,1,0,gl.RGBA,gl.FLOAT,new Float32Array([0,.5,.5,.5]));}
 gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_3D,c.texture);let e=s.growthAmount>0?growthEntry(s):null;if(e?.result&&c.key!==e.key){const r=e.result;gl.texImage3D(gl.TEXTURE_3D,0,gl.RGBA16F,r.size,r.size,r.size,0,gl.RGBA,gl.FLOAT,r.data);c.key=e.key;}
 let u=growthLocations.get(program);if(!u){u=Object.fromEntries(['uGrowthVolume','uGrowthShape','uGrowthLook','uGrowthMotion'].map(n=>[n,gl.getUniformLocation(program,n)]));growthLocations.set(program,u);}
 const active=e?.result?s.growthAmount:0;gl.uniform1i(u.uGrowthVolume,7);gl.uniform4f(u.uGrowthShape,active,s.growthScale??1.1,s.growthDepth??.55,s.growthContrast??1.4);gl.uniform4f(u.uGrowthLook,s.growthColor??.7,s.growthCoverage??.5,s.growthRoughness??.2,s.growthWarp??.2);gl.uniform4f(u.uGrowthMotion,((phase%(2*Math.PI)+2*Math.PI)%(2*Math.PI))*Math.round(s.growthCycles||1),s.growthFlow||0,64,s.growthVeins||0);gl.activeTexture(gl.TEXTURE0);
}
export function disposeGrowth(gl){const c=growthContexts.get(gl);if(c)gl.deleteTexture(c.texture);growthContexts.delete(gl);}
export const GROWTH_GLSL=`
uniform highp sampler3D uGrowthVolume;uniform vec4 uGrowthShape,uGrowthLook,uGrowthMotion;
vec4 growthVolume(vec3 q){
 // Cubic B-spline reconstruction: eight linearly filtered volume reads.
 // Smooth derivatives remain smooth under macro magnification.
 vec3 x=q*uGrowthMotion.z-.5,i=floor(x),f=fract(x),one=1.-f;
 vec3 w0=one*one*one/6.,w1=(3.*f*f*f-6.*f*f+4.)/6.;
 vec3 w2=(-3.*f*f*f+3.*f*f+3.*f+1.)/6.,w3=f*f*f/6.;
 vec3 g0=w0+w1,g1=w2+w3,a=(i-1.+w1/g0+.5)/uGrowthMotion.z,b=(i+1.+w3/g1+.5)/uGrowthMotion.z;
 return mix(mix(mix(texture(uGrowthVolume,vec3(a.x,a.y,a.z)),texture(uGrowthVolume,vec3(b.x,a.y,a.z)),g1.x),mix(texture(uGrowthVolume,vec3(a.x,b.y,a.z)),texture(uGrowthVolume,vec3(b.x,b.y,a.z)),g1.x),g1.y),mix(mix(texture(uGrowthVolume,vec3(a.x,a.y,b.z)),texture(uGrowthVolume,vec3(b.x,a.y,b.z)),g1.x),mix(texture(uGrowthVolume,vec3(a.x,b.y,b.z)),texture(uGrowthVolume,vec3(b.x,b.y,b.z)),g1.x),g1.y),g1.z);
}
vec4 organicGrowth(vec3 p){
 vec3 q=p*uGrowthShape.y*.45+vec3(.5);float phase=uGrowthMotion.x;
 q+=vec3(cos(phase)-1.,sin(phase),sin(phase*2.)*.25)*uGrowthMotion.y*.12;
 q+=sin(q.yzx*6.2831853+sin(q.zxy*6.2831853)*.6)*uGrowthLook.w*.035;
 vec4 field=growthVolume(q);float threshold=mix(.65,0.,uGrowthLook.y),span=1.-threshold;
 float raw=clamp((field.r-threshold)/span,0.,1.),t=pow(raw,uGrowthShape.w);
 float height=t*t*(3.-2.*t),slope=6.*t*(1.-t)*uGrowthShape.w*pow(max(.0001,raw),uGrowthShape.w-1.)/span;
 if(raw<=0.||raw>=1.)slope=0.;
 vec3 grad=(field.gba-vec3(.5))*.5*uGrowthMotion.z*uGrowthShape.y*.45*slope;
 grad*=mix(1.,4.-8.*height,uGrowthMotion.w);height=mix(height,4.*height*(1.-height),uGrowthMotion.w);
 return vec4(height,grad);
}
`;
