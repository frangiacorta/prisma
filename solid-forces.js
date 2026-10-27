import {DYNAMICS_GLSL,bindDynamics} from './dynamics.js?v=9fa7ff517902';
import {samplePath} from './particle-paths.js?v=9fa7ff517902';
// Manual sculpting fields live in scene space, independently of the object transform.
// The inverse map keeps the original material, topology and animation composable.
export const hasSolidForces=s=>(s.dynAmount||0)>0||(s.forcePoints||[]).some(p=>p.enabled&&(Math.abs(p.strength)>1e-6||Math.abs(p.swirl)>1e-6))||(s.forcePaths||[]).some(p=>p.enabled&&p.mode!=='contain'&&p.strength>1e-6);
export function solidForceSlope(s){return (s.forcePoints||[]).filter(p=>p.enabled).reduce((n,p)=>n+Math.abs(p.strength)*.6+Math.abs(p.swirl||0)*.6,0)+(s.forcePaths||[]).filter(p=>p.enabled).reduce((n,p)=>n+p.strength*.6,0);}
const solidCurveCache=new WeakMap();
function solidCurves(s){const paths=(s.forcePaths||[]).filter(p=>p.enabled&&p.mode!=='contain'&&p.strength>1e-6).slice(0,4);return paths.map(p=>{const key=JSON.stringify([p.points,p.closed]);let cached=solidCurveCache.get(p);if(cached?.key!==key){cached={key,points:samplePath(p,32)};solidCurveCache.set(p,cached);}return {path:p,points:cached.points};});}
function solidClosest(points,closed,p,z){let best=Infinity,q;for(let i=0;i<(closed?points.length:points.length-1);i++){const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p[0]-a.x)*dx+(p[1]-a.y)*dy)/Math.max(1e-9,dx*dx+dy*dy))),v=[a.x+t*dx,a.y+t*dy,z],d=Math.hypot(...p.map((x,k)=>x-v[k]));if(d<best){best=d;q=v;}}return q;}
export function solidForceMap(s,p){let delta=[0,0,0],barrier=-1e6;const fields=(s.forcePoints||[]).filter(f=>f.enabled).slice(0,8).map(f=>({center:[f.x,f.y,f.z],...f}));for(const {path,points} of solidCurves(s))fields.push({center:solidClosest(points,path.closed,p,path.z),radius:path.radius,strength:path.strength*(path.mode==='avoid'?-1:1),swirl:0});
 for(const f of fields){const v=p.map((x,k)=>x-f.center[k]),r=Math.max(.05,f.radius),d=Math.hypot(...v),t=Math.max(0,1-d/r),w=t*t*(3-2*t),power=Math.max(-3,Math.min(3,f.strength));for(let k=0;k<3;k++)delta[k]+=v[k]*power*w*.38;delta[0]+=-v[1]*(f.swirl||0)*w*.4;delta[1]+=v[0]*(f.swirl||0)*w*.4;if(power<-1.2){const x=Math.min(1,(-power-1.2)/1.8);barrier=Math.max(barrier,r*x*x*(3-2*x)-d);}}
 return {point:p.map((v,i)=>v+delta[i]),barrier};
}
export const SOLID_FORCES_GLSL=`
${DYNAMICS_GLSL}
uniform int uSculptPointCount,uSculptPathCount,uSculptSamples,uSculptIterations;
uniform vec4 uSculptPoints[8];uniform vec2 uSculptPointOptions[8];
uniform vec4 uSculptPaths[4];uniform highp sampler2D uSculptCurves;
uniform float uSculptBound;
bool sculptActive(){return uSculptPointCount+uSculptPathCount>0||uDynAmount>0.;}
vec3 sculptClosest(vec3 p,int row,bool closed){
 vec3 closest=vec3(0.);float best=1e20;int n=uSculptSamples-(closed?0:1);
 for(int j=0;j<n;j++){vec2 a=texelFetch(uSculptCurves,ivec2(j,row),0).xy,b=texelFetch(uSculptCurves,ivec2((j+1)%32,row),0).xy,ab=b-a;float t=clamp(dot(p.xy-a,ab)/max(1e-9,dot(ab,ab)),0.,1.);vec3 q=vec3(a+t*ab,uSculptPaths[row].z);float d=dot(p-q,p-q);if(d<best){best=d;closest=q;}}
 return closest;
}
vec3 sculptMap(vec3 p,out float barrier){
 vec3 delta=vec3(0.);barrier=-1e6;
 for(int i=0;i<uSculptPointCount+uSculptPathCount;i++){
  vec3 center;float power,r,swirl=0.;
  if(i<uSculptPointCount){center=uSculptPoints[i].xyz;power=uSculptPoints[i].w;r=uSculptPointOptions[i].x;swirl=uSculptPointOptions[i].y;}
  else{int row=i-uSculptPointCount;vec4 path=uSculptPaths[row];center=sculptClosest(p,row,path.w>.5);power=path.x;r=path.y;}
  vec3 v=p-center;float d=length(v),t=max(0.,1.-d/max(.05,r)),w=t*t*(3.-2.*t);
  delta+=v*power*w*.38+vec3(-v.y,v.x,0.)*swirl*w*.4;
  if(power< -1.2)barrier=max(barrier,r*smoothstep(1.2,3.,-power)-d);
 }
 return p+delta;
}
`;
export function withSolidForces(source){
 source=source.replace('vec3 transform(vec3 p){',SOLID_FORCES_GLSL+'\nvec3 transform(vec3 p){');
 const start=source.indexOf('float field(vec3 world){');let i=source.indexOf('{',start),depth=1,end=i+1;while(depth){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}
 const original=source.slice(start,end).replace('float field(','float unforcedField(');
 source=source.slice(0,start)+original+`
float field(vec3 world){float barrier;vec3 p=sculptMap(world,barrier);return max(max(unforcedField(dynamicsInverse(p)),barrier*.5),dynamicsBarrier(world)*.5);}
`+source.slice(end);
 source=source.replaceAll('vec3 local=transform(p)', 'vec3 local=transform(dynamicsInverse(p))');
 // Field differentials include the sculpting map, including barrier normals.
 source=source.replace(/vec3 surfaceGradient\(vec3 (world|p)\)\{/,(_,name)=>`vec3 surfaceGradient(vec3 ${name}){if(sculptActive()){float e=.0004*uFrame.x;vec3 n=vec3(0.);for(int k=0;k<int(min(6.,uRuntime.w));k++){int axis=k/2;float sign=k%2==0?1.:-1.;vec3 o=vec3(0.);o[axis]=e*sign;n[axis]+=field(${name}+o)*sign;}return n;}`);
 source=source.replace('extent=axes()*uGeometryRadius;','extent=axes()*uGeometryRadius+vec3(uSculptBound/max(.001,uFrame.x));');
 return source;
}
export function uploadSolidForces(renderer,s){
 bindDynamics(renderer.gl,renderer.program,s);
 const g=renderer.gl,l=renderer.locations,points=(s.forcePoints||[]).filter(p=>p.enabled&&(Math.abs(p.strength)>1e-6||Math.abs(p.swirl)>1e-6)).slice(0,8),curves=solidCurves(s),pos=new Float32Array(32),opts=new Float32Array(16),paths=new Float32Array(16);let bound=(s._dynamics?.max||0)*2;
 points.forEach((p,i)=>{pos.set([p.x,p.y,p.z,p.strength],i*4);opts.set([p.radius,p.swirl],i*2);bound+=p.radius*(Math.abs(p.strength)*.12+Math.abs(p.swirl)*.13);});
 const data=new Float32Array(32*4*4);curves.forEach(({path:p,points:q},i)=>{paths.set([p.strength*(p.mode==='avoid'?-1:1),p.radius,p.z,+p.closed],i*4);q.forEach((v,j)=>data.set([v.x,v.y,0,0],(i*32+j)*4));bound+=p.radius*p.strength*.12;});
 g.uniform1i(l.uSculptSamples,32);g.uniform1i(l.uSculptIterations,5);g.uniform1i(l.uSculptPointCount,points.length);g.uniform1i(l.uSculptPathCount,curves.length);g.uniform4fv(l.uSculptPoints,pos);g.uniform2fv(l.uSculptPointOptions,opts);g.uniform4fv(l.uSculptPaths,paths);g.uniform1f(l.uSculptBound,bound);
 g.activeTexture(g.TEXTURE4);if(!renderer.sculptTexture){renderer.sculptTexture=g.createTexture();g.bindTexture(g.TEXTURE_2D,renderer.sculptTexture);g.texStorage2D(g.TEXTURE_2D,1,g.RGBA32F,32,4);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);}else g.bindTexture(g.TEXTURE_2D,renderer.sculptTexture);
 const key=JSON.stringify(curves.map(({path:p})=>[p.points,p.closed]));if(key!==renderer.sculptKey){g.texSubImage2D(g.TEXTURE_2D,0,0,0,32,4,g.RGBA,g.FLOAT,data);renderer.sculptKey=key;}
 g.uniform1i(l.uSculptCurves,4);g.activeTexture(g.TEXTURE0);
}
