export const PALETTE_DEFAULTS={finishPalette:false,finishPaletteMap:1,finishPaletteScale:1,finishPaletteOffset:0,finishPaletteBlur:0,finishPaletteColors:['#10131c','#697a9d','#f5eee5']};
export const PALETTE_META={finishPaletteMap:['Intensità della mappa',0,1,.01],finishPaletteScale:['Scala del chiaroscuro',0,4,.01],finishPaletteOffset:['Spostamento del chiaroscuro',-1,1,.01],finishPaletteBlur:['Diffusione dei colori',0,1,.01]};
export const PALETTE_TRACKS={...PALETTE_META,finishPaletteOffset:['Spostamento del chiaroscuro',0,1,.01]};
export function normalizeFinishPalette(raw){const colors=Array.isArray(raw)?raw.filter(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)).slice(0,12):[];return colors.length?colors:[...PALETTE_DEFAULTS.finishPaletteColors];}
// Final luminance mapping and optional color diffusion; source alpha is preserved.
const vertex=`#version 300 es
out vec2 uv;void main(){uv=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(uv*2.-1.,0.,1.);}`;
const mapping=`#version 300 es
precision highp float;in vec2 uv;out vec4 color;
uniform sampler2D uInput;uniform vec3 uRamp[12];uniform int uCount;uniform vec3 uMap;
void main(){vec4 src=texture(uInput,uv);float value=clamp(dot(src.rgb,vec3(.2126,.7152,.0722))*uMap.y+uMap.z,0.,1.);
 float index=value*float(max(0,uCount-1));int a=int(floor(index)),b=min(a+1,uCount-1);
 color=vec4(mix(src.rgb,mix(uRamp[a],uRamp[b],fract(index)),clamp(uMap.x,0.,1.)),src.a);}`;
const diffusion=`#version 300 es
precision highp float;in vec2 uv;out vec4 color;
uniform sampler2D uInput,uOriginal;uniform vec2 uStep;uniform float uSigma;uniform int uPass;
vec4 sampleAt(vec2 p){vec4 c=texture(uInput,p);return uPass==0?vec4(c.rgb*c.a,c.a):c;}
void main(){vec4 c=sampleAt(uv);float total=1.;
 for(int i=1;i<=160;i++){if(float(i)>ceil(uSigma*3.))break;float weight=exp(-.5*pow(float(i)/max(.00001,uSigma),2.));c+=(sampleAt(uv+uStep*float(i))+sampleAt(uv-uStep*float(i)))*weight;total+=2.*weight;}c/=total;
 color=uPass==0?c:vec4(c.a>1e-7?c.rgb/c.a:vec3(0.),texture(uOriginal,uv).a);}`;
export class PaletteFinishPass{
 constructor(gl){this.gl=gl;this.float=!!gl.getExtension('EXT_color_buffer_float');this.vao=gl.createVertexArray();try{this.map=this.program(mapping);this.blur=this.program(diffusion);}catch(error){this.dispose();throw error;}}
 program(fragment){const g=this.gl,p=g.createProgram(),shaders=[];try{for(const [type,source]of [[g.VERTEX_SHADER,vertex],[g.FRAGMENT_SHADER,fragment]]){const sh=g.createShader(type);shaders.push(sh);g.shaderSource(sh,source);g.compileShader(sh);if(!g.getShaderParameter(sh,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(sh));g.attachShader(p,sh);}g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));return p;}catch(error){g.deleteProgram(p);throw error;}finally{for(const sh of shaders)g.deleteShader(sh);}}
 target(w,h,fp=this.float){const g=this.gl,t=g.createTexture(),f=g.createFramebuffer();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,fp?g.RGBA16F:g.RGBA8,w,h,0,g.RGBA,fp?g.HALF_FLOAT:g.UNSIGNED_BYTE,null);for(const k of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,k,g.LINEAR);for(const k of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,k,g.CLAMP_TO_EDGE);g.bindFramebuffer(g.FRAMEBUFFER,f);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,t,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Palette target incomplete');return {texture:t,fbo:f};}
 uniform(p,name,...value){const g=this.gl,loc=g.getUniformLocation(p,name);g[`uniform${value.length}f`](loc,...value);}
 texture(p,name,target,unit){const g=this.gl;g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,target.texture);g.uniform1i(g.getUniformLocation(p,name),unit);}
 draw(s,w,h){const amount=Math.max(0,Math.min(1,s.finishPaletteMap||0));if(amount===0)return false;const g=this.gl;
  if(this.width!==w||this.height!==h){this.release();this.width=w;this.height=h;this.input=this.target(w,h,false);this.mapped=this.target(w,h);this.horizontal=this.target(w,h);}
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.input.texture);g.copyTexSubImage2D(g.TEXTURE_2D,0,0,0,0,0,w,h);
  g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.disable(g.SCISSOR_TEST);g.disable(g.CULL_FACE);g.viewport(0,0,w,h);g.bindVertexArray(this.vao);g.useProgram(this.map);
  const radius=Math.max(0,s.finishPaletteBlur||0)*amount*8*Math.min(w,h)/1080;
  g.bindFramebuffer(g.FRAMEBUFFER,radius>1e-6?this.mapped.fbo:null);this.texture(this.map,'uInput',this.input,0);this.uniform(this.map,'uMap',amount,s.finishPaletteScale??1,s.finishPaletteOffset||0);
  const colors=(s.finishPaletteColors?.length?s.finishPaletteColors:s.palette?.length?s.palette:['#000000','#ffffff']).slice(0,12);g.uniform1i(g.getUniformLocation(this.map,'uCount'),colors.length);
  colors.forEach((hex,i)=>this.uniform(this.map,`uRamp[${i}]`,...[1,3,5].map(at=>parseInt(hex.slice(at,at+2),16)/255)));g.drawArrays(g.TRIANGLES,0,3);
  if(radius>1e-6){g.useProgram(this.blur);this.uniform(this.blur,'uSigma',radius*1.6368);this.texture(this.blur,'uOriginal',this.input,1);
   for(const [pass,input,target,x,y]of [[0,this.mapped,this.horizontal,1/w,0],[1,this.horizontal,null,0,1/h]]){g.bindFramebuffer(g.FRAMEBUFFER,target?.fbo||null);this.texture(this.blur,'uInput',input,0);this.uniform(this.blur,'uStep',x,y);g.uniform1i(g.getUniformLocation(this.blur,'uPass'),pass);g.drawArrays(g.TRIANGLES,0,3);}}
  g.bindVertexArray(null);g.activeTexture(g.TEXTURE0);return true;
 }
 release(){const g=this.gl;for(const target of [this.input,this.mapped,this.horizontal])if(target){g.deleteTexture(target.texture);g.deleteFramebuffer(target.fbo);}this.input=this.mapped=this.horizontal=null;this.width=this.height=0;}
 dispose(){this.release();if(this.map)this.gl.deleteProgram(this.map);if(this.blur)this.gl.deleteProgram(this.blur);if(this.vao)this.gl.deleteVertexArray(this.vao);this.map=this.blur=this.vao=null;}
}
