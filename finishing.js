// One final image pass, after the complete frame (including tiled/accumulated exports).
export const FINISH_DEFAULTS={finishEnabled:true,finishTone:true,finishRgb:false,finishMosaic:false,finishCompare:false,finishRgbR:8,finishRgbG:0,finishRgbB:-8,finishRgbAngle:0,finishRgbMix:1,finishCellX:12,finishCellY:12,finishMosaicMix:1};
export const FINISH_META={finishRgbR:['Spostamento rosso',-60,60,.1],finishRgbG:['Spostamento verde',-60,60,.1],finishRgbB:['Spostamento blu',-60,60,.1],finishRgbAngle:['Direzione RGB',-180,180,1],finishRgbMix:['Intensità RGB',0,1,.01],finishCellX:['Larghezza celle',1,160,1],finishCellY:['Altezza celle',1,160,1],finishMosaicMix:['Intensità mosaico',0,1,.01]};
export const MAX_FINISH_REGIONS=8;
Object.assign(FINISH_DEFAULTS,{finishRegionsEnabled:false,finishRegionMosaic:true,finishRegionRgb:false,finishRegionInvert:false,finishFeather:0,finishRegions:[]});
FINISH_META.finishFeather=['Sfumatura bordo',0,20,.1];
export function normalizeFinishRegions(raw){return (Array.isArray(raw)?raw:[]).filter(r=>r&&['x','y','w','h'].every(k=>Number.isFinite(r[k]))).slice(0,MAX_FINISH_REGIONS).map((r,i)=>{const x=Math.max(0,Math.min(99,r.x)),y=Math.max(0,Math.min(99,r.y));return {id:i+1,x,y,w:Math.max(1,Math.min(100-x,r.w)),h:Math.max(1,Math.min(100-y,r.h))};});}
export const TONE_NEUTRAL={exposure:0,brightness:0,contrast:1,saturation:1,temperature:0,photoTint:0,gamma:1,blacks:0,highlights:0};
export const PHOTO_NEUTRAL={...TONE_NEUTRAL,vignette:0,lensDistortion:0,grain:0,grainSize:1};
export function finishingOff(s,o={}){return s.finishEnabled===false||(o.preview&&s.finishCompare===true);}
export function finishingSource(s,o={}){return finishingOff(s,o)?{...s,...PHOTO_NEUTRAL}:s.finishTone===false?{...s,...TONE_NEUTRAL}:s;}
const FINISH_VERTEX=`#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`;
const FINISH_FRAGMENT=`#version 300 es
precision highp float;
uniform sampler2D uImage;uniform vec2 uSize,uCell;uniform vec3 uOffsets;uniform vec2 uAxis;uniform float uMosaic,uRgb;
uniform vec4 uRects[8];uniform int uRectCount;uniform vec2 uMaskEffects;uniform float uFeather,uInvert;
out vec4 color;
float regionMask(vec2 uv){if(uRectCount==0)return 0.;vec2 p=vec2(uv.x,1.-uv.y);float m=0.;for(int i=0;i<8;i++){if(i>=uRectCount)break;vec4 r=uRects[i];vec2 d=min(p-r.xy,r.xy+r.zw-p)*uSize/min(uSize.x,uSize.y);float edge=min(d.x,d.y);float a=uFeather>0.?smoothstep(0.,uFeather,edge):step(0.,edge);m=max(m,a);}return mix(m,1.-m,uInvert);}
vec4 sampleImage(vec2 uv){vec4 c=texture(uImage,clamp(uv,.5/uSize,1.-.5/uSize));return vec4(c.rgb*c.a,c.a);}
vec4 mosaic(vec2 uv){vec2 pixel=(floor(uv*uSize/uCell)+.5)*uCell;return mix(sampleImage(uv),sampleImage(pixel/uSize),uMosaic*mix(1.,regionMask(uv),uMaskEffects.x));}
void main(){vec2 uv=gl_FragCoord.xy/uSize;vec4 base=mosaic(uv);
vec4 r=mosaic(uv-uAxis*uOffsets.r/uSize),g=mosaic(uv-uAxis*uOffsets.g/uSize),b=mosaic(uv-uAxis*uOffsets.b/uSize);
vec4 split=vec4(r.r,g.g,b.b,max(r.a,max(g.a,b.a)));vec4 c=mix(base,split,uRgb*mix(1.,regionMask(uv),uMaskEffects.y));
color=vec4(c.a>0.000001?c.rgb/c.a:vec3(0.),c.a);}`;
export class FinishingPass{
 constructor(gl){this.gl=gl;const shaders=[];try{this.program=gl.createProgram();for(const [type,source]of [[gl.VERTEX_SHADER,FINISH_VERTEX],[gl.FRAGMENT_SHADER,FINISH_FRAGMENT]]){const sh=gl.createShader(type);shaders.push(sh);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));gl.attachShader(this.program,sh);}gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));this.vao=gl.createVertexArray();this.uniforms=Object.fromEntries(['uImage','uSize','uCell','uOffsets','uAxis','uMosaic','uRgb','uRects[0]','uRectCount','uMaskEffects','uFeather','uInvert'].map(n=>[n,gl.getUniformLocation(this.program,n)]));}catch(e){this.dispose();throw e;}finally{shaders.forEach(s=>gl.deleteShader(s));}}
 draw(s,w,h){const gl=this.gl,u=this.uniforms,scale=Math.min(w,h)/1080;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);
  if(!this.texture){this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}else gl.bindTexture(gl.TEXTURE_2D,this.texture);
  if(this.width!==w||this.height!==h){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);this.width=w;this.height=h;}
  gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,w,h);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.viewport(0,0,w,h);gl.bindVertexArray(this.vao);gl.useProgram(this.program);
  gl.uniform1i(u.uImage,0);gl.uniform2f(u.uSize,w,h);gl.uniform2f(u.uCell,Math.max(1,s.finishCellX*scale),Math.max(1,s.finishCellY*scale));gl.uniform3f(u.uOffsets,s.finishRgbR*scale,s.finishRgbG*scale,s.finishRgbB*scale);const a=s.finishRgbAngle*Math.PI/180;gl.uniform2f(u.uAxis,Math.cos(a),Math.sin(a));gl.uniform1f(u.uMosaic,s.finishMosaic?s.finishMosaicMix:0);gl.uniform1f(u.uRgb,s.finishRgb?s.finishRgbMix:0);const regions=normalizeFinishRegions(s.finishRegions),rects=new Float32Array(32);regions.forEach((r,i)=>rects.set([r.x/100,r.y/100,r.w/100,r.h/100],i*4));gl.uniform4fv(u['uRects[0]'],rects);gl.uniform1i(u.uRectCount,regions.length);gl.uniform2f(u.uMaskEffects,s.finishRegionsEnabled&&s.finishRegionMosaic?1:0,s.finishRegionsEnabled&&s.finishRegionRgb?1:0);gl.uniform1f(u.uFeather,(s.finishFeather||0)/100);gl.uniform1f(u.uInvert,s.finishRegionInvert?1:0);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindVertexArray(null);
 }
 release(){if(this.texture)this.gl.deleteTexture(this.texture);this.texture=null;this.width=this.height=0;}
 dispose(){this.release();if(this.program)this.gl.deleteProgram(this.program);if(this.vao)this.gl.deleteVertexArray(this.vao);this.program=this.vao=null;}
}
