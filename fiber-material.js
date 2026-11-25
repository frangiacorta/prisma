// A retained project may be rendered before it reaches the editor's migration.
// The previous tissue material used the surface texture for the closed buds.
export function legacyFiberWeave(state){
 return ['structWeaveBranching','structShell','structFibres','structWeft'].every(key=>state[key]>0||state.motions?.[key]?.enabled);
}
const clamp01=value=>Math.max(0,Math.min(1,value));
export function migrateFiberMaterial(state,raw=state){
 const legacy=raw.fiberPile==null&&legacyFiberWeave(raw);
 const follows=legacy||raw.fiberTarget==='growth';
 state.fiberTarget=follows||raw.fiberTarget==='nodes'?'nodes':'all';
 state.fiberGrowth=follows?1:Number.isFinite(raw.fiberGrowth)?clamp01(raw.fiberGrowth):0;
 state.fiberPile=legacy?clamp01(Number(raw.surfaceTexture)||0):clamp01(Number(raw.fiberPile)||0);
 state.fiberLength=Number.isFinite(raw.fiberLength)?clamp01(raw.fiberLength):.35;
 return state;
}
export function fiberMaterialUniform(state){
 // Standalone renderers can also receive a deck or saved state directly.
 const s=state.fiberGrowth==null||state.fiberTarget==='growth'?migrateFiberMaterial({},state):state;
 return [s.fiberPile??0,s.fiberLength??.35,Number(s.fiberTarget==='nodes'),s.fiberGrowth];
}

// All functions use object/grain coordinates. The footprint is in the same
// coordinates per output pixel, including when a sprite is rendered as a quad.
export const FIBER_MATERIAL_GLSL=`
uniform vec4 uFiberPile;
float fiberGrowthWeight(float development){
 return mix(1.,clamp(development,0.,1.),uFiberPile.w);
}
float fiberGrainExtent(){
 return uFiberPile.x*mix(.024,.23,uFiberPile.y);
}
vec4 fiberHash4(vec4 n){
 n=fract(n*.1031);n*=n+33.33;return fract(n*(n+n));
}
float fiberNoise(vec3 p){
 vec3 cell=floor(p),t=fract(p);t=t*t*(3.-2.*t);
 float base=dot(cell,vec3(1.,149.,83.));
 vec4 corners=base+vec4(0.,1.,149.,150.);
 vec4 h=mix(fiberHash4(corners),fiberHash4(corners+83.),t.z);
 return mix(mix(h.x,h.y,t.x),mix(h.z,h.w,t.x),t.y)-.5;
}
float fiberThreads(vec3 p,float footprint){
 vec3 curl=sin(p.yzx*11.3+p.zxy*3.9)+.53*cos(p.zxy*19.7-p.xyz*5.1);
 vec3 q=p+curl*.046;
 vec3 skew=vec3(dot(q,vec3(.91,.36,-.17)),dot(q,vec3(-.39,.89,.23)),dot(q,vec3(.23,-.15,.96)));
 float scale=mix(1.26,.70,uFiberPile.y);
 vec3 frequency=vec3(13.,46.,87.)*scale;
 vec3 signal=vec3(fiberNoise(q*frequency.x),fiberNoise(skew*vec3(.29,1.,.66)*frequency.y),fiberNoise(skew.zxy*vec3(.34,.69,1.)*frequency.z+11.4));
 vec3 bandwidth=frequency*footprint;
 return dot(signal/(1.+bandwidth*bandwidth),vec3(.38,1.36,1.10));
}
float fiberEdgeOpacity(float radius,float extent,float signal,float aa){
 float border=1.+extent*(.39+.31*signal);
 float depth=max(aa,.02+extent*.68);
 float outer=min(1.+extent,border+depth);
 return 1.-smoothstep(min(outer-.001,border-depth),outer,radius);
}
vec3 fiberScatter(vec3 dye,vec3 original,vec3 irradiance,float cosView,float roughness,float signal,float amount){
 float rim=pow(1.-clamp(cosView,0.,1.),mix(2.3,.88,uFiberPile.y));
 float reflectance=.87+.28*signal+rim*(.37+.64*uFiberPile.y)*(.61+.39*roughness);
 return mix(original,dye*irradiance*reflectance,amount);
}
`;
