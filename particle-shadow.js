// Planar projection of the actual animated geometry, with optical coverage.
// This is a receiver shadow, not self-shadowing or a caustic simulation.
export function shadowProgram(vertex,fragment,varyings){
 if(varyings||!vertex.includes('vec4 project(vec3 p)')||!fragment.includes('in vec3 v')||!fragment.includes('vPosition'))return {vertex,fragment};
 const uniforms='uniform float uShadowPass,uShadowHeight,uShadowOpacity;uniform vec3 uShadowLight;\n';
 vertex=vertex.replace('vec4 project(vec3 p){',uniforms+`vec4 project(vec3 p){
 if(uShadowPass>1.5)return opticalProject(p);
 if(uShadowPass>.5){
  // Keep crossing segments continuous. Rejecting a vertex with a dummy
  // clip position creates long triangles when a strand crosses the receiver.
  float t=(uShadowHeight-uShadowLight.y)/min(-.02,p.y-uShadowLight.y);
  p=uShadowLight+(p-uShadowLight)*t;
 }
 `);
 fragment=fragment.replace('void main(){',uniforms+'void shadowSourceMain(){')+`
 void main(){
  shadowSourceMain();
  if(uShadowPass>1.5){
   if(color.a<.01)discard;
   float depth=min(gl_FragCoord.z,.999999);
   vec3 packed=fract(depth*vec3(1.,255.,65025.));packed-=packed.yzz*vec3(1./255.,1./255.,0.);
   color=vec4(packed,clamp(color.a,0.,1.));
  }else if(uShadowPass>.5){
   if(vPosition.y<=uShadowHeight||vPosition.y>=uShadowLight.y-.02)discard;
   float a=1.-exp(-max(0.,color.a)*uShadowOpacity);
   color=vec4(vec3(a),a);
  }
 }`;
 return {vertex,fragment};
}

export function shadowLight(state){
 const lights=(state.lights||[]).filter(l=>l.enabled&&l.power>0&&l.y>state.pShadowHeight+.03);
 if(state.pShadowLight>=0)return lights.find(l=>l.id===state.pShadowLight)||null;
 return lights.reduce((best,l)=>!best||l.power>best.power?l:best,null);
}

export class ParticleShadow{
 constructor(owner){this.owner=owner;this.targets=[];this.width=0;this.height=0;this.frames=0;}
 release(){const gl=this.owner.gl;for(const t of this.targets){gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.fbo);}this.targets=[];this.width=this.height=0;}
 resize(w,h){
  // Bounded extra raster work and memory, independent of export resolution.
  const scale=Math.min(1,1024/Math.max(w,h));w=Math.max(1,Math.round(w*scale));h=Math.max(1,Math.round(h*scale));
  if(w===this.width&&h===this.height)return;
  this.release();this.width=w;this.height=h;this.targets=Array.from({length:3},()=>this.owner.target(w,h));
 }
 draw(state,phase,options,weights){
  const light=state.pShadow>0?shadowLight(state):null;this.strength=0;
  if(!light)return null;
  const o=this.owner,gl=o.gl;this.resize(o.width,o.height);const [mask,a,b]=this.targets;
  const previous=o.occlusion;this.light=light;o.shadowPass=this;o.occlusion=0;
  try{o.drawGeometry(mask,state,phase,options,weights);}finally{o.shadowPass=null;o.occlusion=previous;}
  gl.depthMask(true);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.bindVertexArray(o.empty);gl.useProgram(o.blur.program);
  // Source size widens the penumbra; the user can add an artistic softness.
  const radius=state.pShadowSoftness*(1+Math.max(0,light.size)*.5)/1080;
  for(const [dst,src,step]of [[a,mask,[radius,0]],[b,a,[0,radius]]]){o.bind(dst);o.tex(o.blur,'uImage',src.texture,0);o.u(o.blur,'uStep',...step);gl.drawArrays(gl.TRIANGLES,0,3);}
  this.strength=state.pShadow*(1-Math.exp(-light.power));this.frames++;return b.texture;
 }
}
