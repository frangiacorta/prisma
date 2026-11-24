// Fade / DirectionalWipe adapted from gl-transitions (gre), MIT.
// Original shaders, license and pinned provenance: vendor/gl-transitions/.
import {Renderer} from './renderer.js?v=2ed2af454163';
const vertex=`#version 300 es
precision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform sampler2D sceneA,sceneB,previousA,previousB;uniform float progress,master,flash,invert,impact;uniform int kind,direction;uniform vec2 aspects,variants;
vec2 fit(vec2 p,float r){return (p-.5)/vec2(min(1.,r),min(1.,1./r))+.5;}
bool outside(vec2 p){return any(lessThan(p,vec2(0)))||any(greaterThan(p,vec2(1)));}
vec4 deckColor(sampler2D current,sampler2D previous,vec2 p,float amount){
 if(outside(p))return vec4(0);
 vec4 live=texture(current,p);live.rgb*=live.a;
 if(amount>=1.)return live;
 vec4 old=texture(previous,p);old.rgb*=old.a;
 return mix(old,live,amount);
}
vec4 getFromColor(vec2 p){return deckColor(sceneA,previousA,fit(p,aspects.x),variants.x);}
vec4 getToColor(vec2 p){return deckColor(sceneB,previousB,fit(p,aspects.y),variants.y);}
void main(){vec2 pixel=(uv-.5)/(1.+impact)+.5;vec4 a=getFromColor(pixel),b=getToColor(pixel);float m=progress;
 if(progress>0.&&progress<1.){
  if(kind==1){vec2 d=direction==0?vec2(1,0):direction==1?vec2(0,1):direction==2?vec2(-1,0):vec2(0,-1);vec2 v=normalize(d);v/=abs(v.x)+abs(v.y);float center=dot(v,vec2(.5));m=1.-smoothstep(-.12,0.,dot(v,uv)-(center-.5+progress*1.12));}
  if(kind==4){float radius=length((uv-.5)*vec2(aspects.x,1.))/(.5*length(vec2(aspects.x,1.)));float edge=direction>1?1.-radius:radius;m=smoothstep(edge-.08,edge+.08,progress*1.16-.08);}
  if(kind==5){float bell=sin(progress*3.14159265),spin=(direction>1?-1.:1.)*bell*.42;mat2 rot=mat2(cos(spin),-sin(spin),sin(spin),cos(spin));a=getFromColor(rot*(pixel-.5)*(1.+bell*.12)+.5);b=getToColor(transpose(rot)*(pixel-.5)*(1.+bell*.12)+.5);m=smoothstep(0.,1.,progress);}
  if(kind==6){float bell=sin(progress*3.14159265);a=getFromColor((pixel-.5)*(1.-bell*.12)+.5);b=getToColor((pixel-.5)*(1.+(1.-progress)*.18)+.5);m=smoothstep(0.,1.,progress);}
  if(kind==2){float lum=dot(b.rgb,vec3(.2126,.7152,.0722));float threshold=1.08-1.16*progress;m=smoothstep(threshold-.08,threshold+.08,lum);}
 }
 vec3 c=mix(a.rgb,b.rgb,m);if(kind==3&&progress>0.&&progress<1.)c=min(vec3(1),a.rgb*(1.-progress)+b.rgb*progress+min(a.rgb,b.rgb)*sin(progress*3.14159265));
 c=mix(c,1.-c,invert);frag=vec4(mix(c,vec3(1.),flash)*master,1.);
}`;
export class PlaygroundMixer{
 constructor(canvas){
  this.canvas=canvas;const g=this.gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!g)throw Error('WebGL 2 non disponibile per il mix.');
  const compile=(type,src)=>{const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s;};
  const v=compile(g.VERTEX_SHADER,vertex),f=compile(g.FRAGMENT_SHADER,fragment),p=this.program=g.createProgram();g.attachShader(p,v);g.attachShader(p,f);g.linkProgram(p);g.deleteShader(v);g.deleteShader(f);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));
  this.vao=g.createVertexArray();this.textures=[0,1,2,3].map(()=>{const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,1,1,0,g.RGBA,g.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));return t;});
  this.u=Object.fromEntries(['sceneA','sceneB','previousA','previousB','variants','progress','kind','direction','master','aspects','flash','invert','impact'].map(k=>[k,g.getUniformLocation(p,k)]));this.frames=0;this.aspects=[1,1];this.textureSizes=[[1,1],[1,1],[1,1],[1,1]];this.variantMix=[1,1];
 }
 upload(index,canvas){
  const g=this.gl,[width,height]=this.textureSizes[index];
  g.activeTexture(g.TEXTURE0+index);g.bindTexture(g.TEXTURE_2D,this.textures[index]);
  g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  if(width===canvas.width&&height===canvas.height)g.texSubImage2D(g.TEXTURE_2D,0,0,0,g.RGBA,g.UNSIGNED_BYTE,canvas);
  else{g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,canvas);this.textureSizes[index]=[canvas.width,canvas.height];}
 }
 draw(c,w,h,filters={},clock=0,dt=0){
  const g=this.gl;if(g.isContextLost())return;
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
  g.viewport(0,0,w,h);g.useProgram(this.program);g.bindVertexArray(this.vao);
  this.textures.forEach((t,i)=>{g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,t);});
  g.uniform1i(this.u.sceneA,0);g.uniform1i(this.u.sceneB,1);g.uniform1i(this.u.previousA,2);g.uniform1i(this.u.previousB,3);
  g.uniform2fv(this.u.variants,this.variantMix);g.uniform2fv(this.u.aspects,this.aspects);
  g.uniform1f(this.u.progress,c.mix);g.uniform1i(this.u.kind,['fade','wipe','luma','add','iris','swirl','zoom'].indexOf(c.transition));g.uniform1i(this.u.direction,c.direction);
  g.uniform1f(this.u.master,c.blackout?0:c.master);g.uniform1f(this.u.invert,c.invert?1:0);g.uniform1f(this.u.flash,c.flash||0);g.uniform1f(this.u.impact,c.impact||0);
  g.drawArrays(g.TRIANGLES,0,3);
  if(!c.blackout&&Object.keys(filters).length){
   this.effects??=new Renderer(this.canvas);const phase=clock*c.bpm/60*Math.PI*2;
   this.effects.finish(filters,{preview:true,liveDynamics:true,feedbackDeltaSeconds:dt,frameInterval:Math.min(dt,.067)},phase,phase);
  }else this.effects?.feedbackFinishing?.release();
  this.frames++;
 }
 dispose(){const g=this.gl;this.effects?.dispose({loseContext:false});this.textures.forEach(t=>g.deleteTexture(t));g.deleteProgram(this.program);g.deleteVertexArray(this.vao);g.getExtension('WEBGL_lose_context')?.loseContext();}
}
