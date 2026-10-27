// Fade / DirectionalWipe adapted from gl-transitions (gre), MIT.
// Original shaders, license and pinned provenance: vendor/gl-transitions/.
const vertex=`#version 300 es
precision highp float;out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;in vec2 uv;out vec4 frag;
uniform sampler2D sceneA,sceneB;uniform float progress,master;uniform int kind,direction;uniform vec2 aspects;
vec2 fit(vec2 p,float r){return (p-.5)/vec2(min(1.,r),min(1.,1./r))+.5;}
bool outside(vec2 p){return any(lessThan(p,vec2(0)))||any(greaterThan(p,vec2(1)));}
vec4 getFromColor(vec2 p){p=fit(p,aspects.x);if(outside(p))return vec4(0);vec4 c=texture(sceneA,p);return vec4(c.rgb*c.a,c.a);}
vec4 getToColor(vec2 p){p=fit(p,aspects.y);if(outside(p))return vec4(0);vec4 c=texture(sceneB,p);return vec4(c.rgb*c.a,c.a);}
void main(){vec4 a=getFromColor(uv),b=getToColor(uv);float m=progress;
 if(progress>0.&&progress<1.){
  if(kind==1){vec2 d=direction==0?vec2(1,0):direction==1?vec2(0,1):direction==2?vec2(-1,0):vec2(0,-1);vec2 v=normalize(d);v/=abs(v.x)+abs(v.y);float center=dot(v,vec2(.5));m=1.-smoothstep(-.12,0.,dot(v,uv)-(center-.5+progress*1.12));}
  if(kind==2){float lum=dot(b.rgb,vec3(.2126,.7152,.0722));m=smoothstep(1.-progress-.08,1.-progress+.08,lum);}
 }
 vec3 c=mix(a.rgb,b.rgb,m);if(kind==3&&progress>0.&&progress<1.)c=min(vec3(1),a.rgb*(1.-progress)+b.rgb*progress+min(a.rgb,b.rgb)*sin(progress*3.14159265));
 frag=vec4(c*master,1.);
}`;
export class PlaygroundMixer{
 constructor(canvas){
  this.canvas=canvas;const g=this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!g)throw Error('WebGL 2 non disponibile per il mix.');
  const compile=(type,src)=>{const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s;};
  const v=compile(g.VERTEX_SHADER,vertex),f=compile(g.FRAGMENT_SHADER,fragment),p=this.program=g.createProgram();g.attachShader(p,v);g.attachShader(p,f);g.linkProgram(p);g.deleteShader(v);g.deleteShader(f);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));
  this.vao=g.createVertexArray();this.textures=[0,1].map(()=>{const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,1,1,0,g.RGBA,g.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));return t;});
  this.u=Object.fromEntries(['sceneA','sceneB','progress','kind','direction','master','aspects'].map(k=>[k,g.getUniformLocation(p,k)]));this.frames=0;this.aspects=[1,1];
 }
 upload(index,canvas){const g=this.gl;g.activeTexture(g.TEXTURE0+index);g.bindTexture(g.TEXTURE_2D,this.textures[index]);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,canvas);}
 draw(c,w,h){const g=this.gl;if(g.isContextLost())throw Error('La GPU ha interrotto il mix. Chiudi e riapri il Playground.');if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}g.viewport(0,0,w,h);g.useProgram(this.program);g.bindVertexArray(this.vao);this.textures.forEach((t,i)=>{g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,t);});g.uniform1i(this.u.sceneA,0);g.uniform1i(this.u.sceneB,1);g.uniform2f(this.u.aspects,this.aspects[0],this.aspects[1]);g.uniform1f(this.u.progress,c.mix);g.uniform1i(this.u.kind,['fade','wipe','luma','add'].indexOf(c.transition));g.uniform1i(this.u.direction,c.direction);g.uniform1f(this.u.master,c.blackout?0:c.master);g.drawArrays(g.TRIANGLES,0,3);this.frames++;}
 dispose(){const g=this.gl;this.textures.forEach(t=>g.deleteTexture(t));g.deleteProgram(this.program);g.deleteVertexArray(this.vao);g.getExtension('WEBGL_lose_context')?.loseContext();}
}
