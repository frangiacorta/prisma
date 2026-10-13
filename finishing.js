// One final image pass, after the complete frame (including tiled/accumulated exports).
export const FINISH_DEFAULTS={finishEnabled:true,finishTone:true,finishRgb:false,finishMosaic:false,finishCompare:false,finishRgbR:8,finishRgbG:0,finishRgbB:-8,finishRgbAngle:0,finishRgbMix:1,finishCellX:12,finishCellY:12,finishMosaicMix:1};
export const FINISH_META={finishRgbR:['Spostamento rosso',-60,60,.1],finishRgbG:['Spostamento verde',-60,60,.1],finishRgbB:['Spostamento blu',-60,60,.1],finishRgbAngle:['Direzione RGB',-180,180,1],finishRgbMix:['Intensità RGB',0,1,.01],finishCellX:['Larghezza celle',1,160,1],finishCellY:['Altezza celle',1,160,1],finishMosaicMix:['Intensità mosaico',0,1,.01]};
export const MAX_FINISH_REGIONS=8;
export const EDGE_DEFAULTS={finishEdge:false,finishEdgeWidth:2,finishEdgeThreshold:.08,finishEdgeSoftness:.15,finishEdgeColor:'#d7ff91',finishEdgeSource:false,finishEdgeOnly:false,finishEdgeMix:1,finishRegionEdge:true};
export const GLITCH_DEFAULTS={finishGlitch:false,finishGlitchAmount:65,finishGlitchBand:48,finishGlitchCoverage:.6,finishGlitchSplit:10,finishGlitchMix:1,finishGlitchAnimate:true,finishGlitchCycles:4,finishGlitchDuty:.6,finishGlitchSoftness:.35,finishGlitchSeed:42,finishRegionGlitch:true};
Object.assign(FINISH_DEFAULTS,EDGE_DEFAULTS,GLITCH_DEFAULTS);
Object.assign(FINISH_META,{finishEdgeWidth:['Spessore contorni',.5,12,.1],finishEdgeThreshold:['Soglia dei dettagli',.01,1,.01],finishEdgeSoftness:['Morbidezza contorni',.01,.6,.01],finishEdgeMix:['Mix contorni',0,1,.01],finishGlitchAmount:['Spostamento bande',0,180,1],finishGlitchBand:['Altezza bande',4,240,1],finishGlitchCoverage:['Quantità di bande',0,1,.01],finishGlitchSplit:['Separazione colori',0,60,1],finishGlitchMix:['Mix glitch',0,1,.01],finishGlitchCycles:['Impulsi nel loop',1,24,1],finishGlitchDuty:['Durata di ogni impulso',.1,1,.01],finishGlitchSoftness:['Entrata e uscita morbide',0,1,.01],finishGlitchSeed:['Variante delle bande',1,9999,1]});
/*
MIT License

Copyright (c) 2026 Niccolò Fanton

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
// Glyph atlas/sampling adapted from Niccolo Fanton's morphing-ascii-shader (MIT).
// See vendor/ascii/LICENSE and NOTICE.txt. No Three.js runtime is required.
export const GLYPH_DEFAULTS={finishGlyph:false,finishGlyphStyle:0,finishGlyphCell:20,finishGlyphScale:.9,finishGlyphDensity:1.3,finishGlyphSoftness:1,finishGlyphSource:true,finishGlyphColor:'#8ef5d5',finishGlyphMix:1,finishGlyphGlow:.35,finishGlyphRadius:8,finishGlyphVariation:0,finishGlyphCycles:2,finishRegionGlyph:true};
Object.assign(FINISH_DEFAULTS,GLYPH_DEFAULTS);
Object.assign(FINISH_META,{finishGlyphStyle:['Stile segni',0,2,1],finishGlyphCell:['Dimensione celle',5,100,1],finishGlyphScale:['Dimensione segni',.2,1,.01],finishGlyphDensity:['Densità dei segni',.2,3,.01],finishGlyphSoftness:['Morbidezza dei passaggi',0,1,.01],finishGlyphMix:['Mix con originale',0,1,.01],finishGlyphGlow:['Intensità bagliore',0,2,.01],finishGlyphRadius:['Raggio bagliore',1,40,.5],finishGlyphVariation:['Variazione animata',0,1,.01],finishGlyphCycles:['Cicli dei segni nel loop',1,12,1]});
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
 constructor(gl,fragment=FINISH_FRAGMENT,names=null){this.gl=gl;const shaders=[];try{this.program=gl.createProgram();for(const [type,source]of [[gl.VERTEX_SHADER,FINISH_VERTEX],[gl.FRAGMENT_SHADER,fragment]]){const sh=gl.createShader(type);shaders.push(sh);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));gl.attachShader(this.program,sh);}gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));this.vao=gl.createVertexArray();this.uniforms=Object.fromEntries((names||['uImage','uSize','uCell','uOffsets','uAxis','uMosaic','uRgb','uRects[0]','uRectCount','uMaskEffects','uFeather','uInvert']).map(n=>[n,gl.getUniformLocation(this.program,n)]));}catch(e){this.dispose();throw e;}finally{shaders.forEach(s=>gl.deleteShader(s));}}
 draw(s,w,h){const gl=this.gl,u=this.uniforms,scale=Math.min(w,h)/1080;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);
  if(!this.texture){this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}else gl.bindTexture(gl.TEXTURE_2D,this.texture);
  if(this.width!==w||this.height!==h){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);this.width=w;this.height=h;}
  gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,w,h);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.viewport(0,0,w,h);gl.bindVertexArray(this.vao);gl.useProgram(this.program);
  gl.uniform1i(u.uImage,0);gl.uniform2f(u.uSize,w,h);gl.uniform2f(u.uCell,Math.max(1,s.finishCellX*scale),Math.max(1,s.finishCellY*scale));gl.uniform3f(u.uOffsets,s.finishRgbR*scale,s.finishRgbG*scale,s.finishRgbB*scale);const a=s.finishRgbAngle*Math.PI/180;gl.uniform2f(u.uAxis,Math.cos(a),Math.sin(a));gl.uniform1f(u.uMosaic,s.finishMosaic?s.finishMosaicMix:0);gl.uniform1f(u.uRgb,s.finishRgb?s.finishRgbMix:0);const regions=normalizeFinishRegions(s.finishRegions),rects=new Float32Array(32);regions.forEach((r,i)=>rects.set([r.x/100,r.y/100,r.w/100,r.h/100],i*4));gl.uniform4fv(u['uRects[0]'],rects);gl.uniform1i(u.uRectCount,regions.length);gl.uniform2f(u.uMaskEffects,s.finishRegionsEnabled&&s.finishRegionMosaic?1:0,s.finishRegionsEnabled&&s.finishRegionRgb?1:0);gl.uniform1f(u.uFeather,(s.finishFeather||0)/100);gl.uniform1f(u.uInvert,s.finishRegionInvert?1:0);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindVertexArray(null);
 }
 release(){if(this.texture)this.gl.deleteTexture(this.texture);this.texture=null;this.width=this.height=0;}
 dispose(){this.release();if(this.program)this.gl.deleteProgram(this.program);if(this.vao)this.gl.deleteVertexArray(this.vao);this.program=this.vao=null;}
}

// Stateless glyph blending keeps seeking, repeated frames and offline exports identical.
// The periodic variation travels across cells; it never depends on wall-clock frame rate.
const GLYPH_FRAGMENT=`#version 300 es
precision highp float;
uniform sampler2D uImage,uAtlas;uniform vec2 uSize;uniform float uCell,uScale,uDensity,uSoft,uSource,uVariation,uPhase;uniform int uStyle;uniform vec3 uInk;
out vec4 color;
float glyph(float i,vec2 p){if(any(lessThan(p,vec2(0.)))||any(greaterThan(p,vec2(1.))))return 0.;return texture(uAtlas,vec2((clamp(i,0.,9.)+p.x)/10.,1.-p.y)).a;}
void main(){vec2 pixel=gl_FragCoord.xy,cell=floor(pixel/uCell),center=(cell+.5)*uCell/uSize;
vec4 sampleColor=texture(uImage,clamp(center,.5/uSize,1.-.5/uSize));
float l=dot(sampleColor.rgb,vec3(.2126,.7152,.0722));
float wave=sin(uPhase+cell.x*.37+cell.y*.23);
float density=clamp(l*uDensity*(1.+uVariation*wave),0.,1.);
vec2 p=(fract(pixel/uCell)-.5)/uScale+.5,q=p-.5;float mask=0.;
if(uStyle==0){float index=density*9.,i=floor(index),f=fract(index);float width=max(.001,uSoft*.5);float blend=smoothstep(.5-width,.5+width,f);mask=mix(glyph(i,p),glyph(i+1.,p),blend);}
else if(uStyle==1){float halfLength=.43*sqrt(density);float d=min(abs(q.x-q.y),abs(q.x+q.y))*.707107;float aa=max(.004,fwidth(q.x));mask=(1.-smoothstep(.025,.025+aa,d))*(1.-smoothstep(halfLength-aa,halfLength,max(abs(q.x),abs(q.y))));}
else {float radius=.46*sqrt(density),aa=max(.004,fwidth(q.x));mask=1.-smoothstep(max(0.,radius-aa),radius+aa,length(q));}
mask*=smoothstep(0.,.025,density);vec3 ink=mix(uInk,sampleColor.rgb,uSource);float alpha=clamp(mask*sampleColor.a,0.,1.);color=vec4(ink*alpha,alpha);}`;
const GLYPH_BLUR=`#version 300 es
precision highp float;uniform sampler2D uImage;uniform vec2 uStep;uniform vec2 uSize;out vec4 color;
void main(){vec2 uv=gl_FragCoord.xy/uSize;color=texture(uImage,uv)*.227027;
color+=(texture(uImage,uv+uStep*1.384615)+texture(uImage,uv-uStep*1.384615))*.316216;
color+=(texture(uImage,uv+uStep*3.230769)+texture(uImage,uv-uStep*3.230769))*.070270;}`;
const GLYPH_COMPOSITE=`#version 300 es
precision highp float;uniform sampler2D uImage,uGlyph,uBloom;uniform vec2 uSize;uniform float uMix,uGlow,uTransparent;
uniform vec4 uRects[8];uniform int uRectCount;uniform float uUseMask,uFeather,uInvert;out vec4 color;
float regionMask(vec2 uv){if(uRectCount==0)return 0.;vec2 p=vec2(uv.x,1.-uv.y);float m=0.;for(int i=0;i<8;i++){if(i>=uRectCount)break;vec4 r=uRects[i];vec2 d=min(p-r.xy,r.xy+r.zw-p)*uSize/min(uSize.x,uSize.y);float edge=min(d.x,d.y);m=max(m,uFeather>0.?smoothstep(0.,uFeather,edge):step(0.,edge));}return mix(m,1.-m,uInvert);}
void main(){vec2 uv=gl_FragCoord.xy/uSize;vec4 base=texture(uImage,uv);float amount=uMix*mix(1.,regionMask(uv),uUseMask);
if(amount<=0.){color=base;return;}
vec4 g=texture(uGlyph,uv),b=texture(uBloom,uv)*uGlow;float coverage=clamp(g.a+b.a,0.,1.);float a=mix(base.a,coverage,uTransparent);
vec3 rgb=min(g.rgb+b.rgb,vec3(a));vec4 result=mix(vec4(base.rgb*base.a,base.a),vec4(rgb,a),amount);
color=vec4(result.a>0.000001?result.rgb/result.a:vec3(0.),result.a);}`;

/*
The MIT License

Copyright © 2010-2026 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
// Sobel neighbourhood and RGB sampling adapted from three.js (MIT); see vendor/three-filters.
// FinishingPass owns capture texture, shader lifecycle and resize/release for these passes too.
const DETAIL_FRAGMENT=`#version 300 es
precision highp float;
uniform sampler2D uImage;uniform vec2 uSize;uniform int uKind;uniform float uMix,uTransparent;
uniform float uWidth,uThreshold,uSoftness,uOnly,uSource;uniform vec3 uInk;
uniform float uAmount,uBand,uCoverage,uSplit,uPhase,uDuty,uPulseSoft,uSeed,uAnimate;
uniform vec4 uRects[8];uniform int uRectCount;uniform float uUseMask,uFeather,uInvert;
out vec4 color;
vec4 samplePM(vec2 uv){vec4 c=texture(uImage,clamp(uv,.5/uSize,1.-.5/uSize));return vec4(c.rgb*c.a,c.a);}
vec2 signalAt(vec2 uv){vec4 c=samplePM(uv);return vec2(dot(c.rgb,vec3(.2126,.7152,.0722)),c.a);}
float regionMask(vec2 uv){if(uRectCount==0)return 0.;vec2 p=vec2(uv.x,1.-uv.y);float m=0.;for(int i=0;i<8;i++){if(i>=uRectCount)break;vec4 r=uRects[i];vec2 d=min(p-r.xy,r.xy+r.zw-p)*uSize/min(uSize.x,uSize.y);float edge=min(d.x,d.y);m=max(m,uFeather>0.?smoothstep(0.,uFeather,edge):step(0.,edge));}return mix(m,1.-m,uInvert);}
float hashBand(float n){return fract(sin(n*127.1+uSeed*311.7)*43758.5453);}
void main(){vec2 uv=gl_FragCoord.xy/uSize;vec4 original=texture(uImage,uv),base=vec4(original.rgb*original.a,original.a);
float amount=uMix*mix(1.,regionMask(uv),uUseMask);if(amount<=0.){color=original;return;}
vec4 effect=base;
if(uKind==0){
 vec2 t=vec2(uWidth)/uSize;
 vec2 tl=signalAt(uv+t*vec2(-1.,1.)),tc=signalAt(uv+t*vec2(0.,1.)),tr=signalAt(uv+t);
 vec2 ml=signalAt(uv-t*vec2(1.,0.)),mr=signalAt(uv+t*vec2(1.,0.));
 vec2 bl=signalAt(uv-t),bc=signalAt(uv-t*vec2(0.,1.)),br=signalAt(uv+t*vec2(1.,-1.));
 vec2 gx=-tl-2.*ml-bl+tr+2.*mr+br,gy=tl+2.*tc+tr-bl-2.*bc-br;
 float strength=max(length(vec2(gx.x,gy.x)),length(vec2(gx.y,gy.y)))*.25;
 float edge=smoothstep(uThreshold,uThreshold+uSoftness,strength);
 vec4 neighbor=samplePM(uv+t);vec3 source=original.a>0.001?original.rgb:(neighbor.a>0.001?neighbor.rgb/neighbor.a:vec3(1.));
 vec3 ink=mix(uInk,source,uSource);vec4 over=vec4(ink*edge+base.rgb*(1.-edge),edge+base.a*(1.-edge));
 vec4 only=vec4(ink*edge,mix(max(base.a,edge),edge,uTransparent));effect=mix(over,only,uOnly);
}else{
 float row=floor(gl_FragCoord.y/uBand),r=hashBand(row),selected=step(r,uCoverage)*step(.0001,uCoverage);
 float clock=uPhase/6.28318530718,dist=abs(fract(clock+.5)-.5)*2.;
 float pulse=1.-smoothstep(max(0.,uDuty-max(.002,uPulseSoft*uDuty)),uDuty,dist);
 pulse=mix(1.,pulse,uAnimate);float motion=mix(1.,cos(uPhase+r*6.28318530718),uAnimate);
 float shift=(hashBand(row+53.)*2.-1.)*uAmount*motion*selected*pulse;
 float split=uSplit*selected*pulse;vec2 p=uv+vec2(shift/uSize.x,0.),offset=vec2(split/uSize.x,0.);
 vec4 cr=samplePM(p+offset),cg=samplePM(p),cb=samplePM(p-offset);
 effect=vec4(cr.r,cg.g,cb.b,max(cr.a,max(cg.a,cb.a)));
}
vec4 c=mix(base,effect,amount);color=vec4(c.a>0.000001?c.rgb/c.a:vec3(0.),c.a);}`;
export class DetailPass extends FinishingPass{
 constructor(gl){super(gl,DETAIL_FRAGMENT,['uImage','uSize','uKind','uMix','uTransparent','uWidth','uThreshold','uSoftness','uOnly','uSource','uInk','uAmount','uBand','uCoverage','uSplit','uPhase','uDuty','uPulseSoft','uSeed','uAnimate','uRects[0]','uRectCount','uUseMask','uFeather','uInvert']);}
 draw(s,w,h,phase=0,kind=0){const g=this.gl,u=this.uniforms,scale=Math.min(w,h)/1080;g.bindFramebuffer(g.FRAMEBUFFER,null);g.activeTexture(g.TEXTURE0);
  if(!this.texture){this.texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.texture);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);}else g.bindTexture(g.TEXTURE_2D,this.texture);
  if(this.width!==w||this.height!==h){g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);this.width=w;this.height=h;}
  g.copyTexSubImage2D(g.TEXTURE_2D,0,0,0,0,0,w,h);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.disable(g.SCISSOR_TEST);g.colorMask(true,true,true,true);g.viewport(0,0,w,h);g.bindVertexArray(this.vao);g.useProgram(this.program);
  g.uniform1i(u.uImage,0);g.uniform2f(u.uSize,w,h);g.uniform1i(u.uKind,kind);g.uniform1f(u.uMix,kind?s.finishGlitchMix:s.finishEdgeMix);g.uniform1f(u.uTransparent,s.bgMode==='transparent'?1:0);
  g.uniform1f(u.uWidth,Math.max(.5,s.finishEdgeWidth*scale));g.uniform1f(u.uThreshold,s.finishEdgeThreshold);g.uniform1f(u.uSoftness,s.finishEdgeSoftness);g.uniform1f(u.uOnly,s.finishEdgeOnly?1:0);g.uniform1f(u.uSource,s.finishEdgeSource?1:0);const hex=/^#[0-9a-f]{6}$/i.test(s.finishEdgeColor)?s.finishEdgeColor:'#d7ff91';g.uniform3f(u.uInk,...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
  g.uniform1f(u.uAmount,s.finishGlitchAmount*scale);g.uniform1f(u.uBand,Math.max(1,s.finishGlitchBand*scale));g.uniform1f(u.uCoverage,s.finishGlitchCoverage);g.uniform1f(u.uSplit,s.finishGlitchSplit*scale);g.uniform1f(u.uPhase,(((phase%(Math.PI*2))+Math.PI*2)%(Math.PI*2))*Math.round(s.finishGlitchCycles));g.uniform1f(u.uDuty,s.finishGlitchDuty);g.uniform1f(u.uPulseSoft,s.finishGlitchSoftness);g.uniform1f(u.uSeed,Math.round(s.finishGlitchSeed));g.uniform1f(u.uAnimate,s.finishGlitchAnimate?1:0);
  const regions=normalizeFinishRegions(s.finishRegions),rects=new Float32Array(32);regions.forEach((r,i)=>rects.set([r.x/100,r.y/100,r.w/100,r.h/100],i*4));g.uniform4fv(u['uRects[0]'],rects);g.uniform1i(u.uRectCount,regions.length);g.uniform1f(u.uUseMask,s.finishRegionsEnabled&&(kind?s.finishRegionGlitch:s.finishRegionEdge)?1:0);g.uniform1f(u.uFeather,(s.finishFeather||0)/100);g.uniform1f(u.uInvert,s.finishRegionInvert?1:0);g.drawArrays(g.TRIANGLES,0,3);g.bindVertexArray(null);
 }
}

export class GlyphPass{
 constructor(gl){this.gl=gl;this.targets=[];this.programs=[];try{
  this.vao=gl.createVertexArray();
  for(const fragment of [GLYPH_FRAGMENT,GLYPH_BLUR,GLYPH_COMPOSITE]){const p=gl.createProgram(),shaders=[];this.programs.push(p);try{for(const [type,source]of [[gl.VERTEX_SHADER,FINISH_VERTEX],[gl.FRAGMENT_SHADER,fragment]]){const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));}finally{shaders.forEach(s=>gl.deleteShader(s));}}
  // Adapted buildGlyphAtlas: fixed monospace ASCII, white alpha masks, no runtime dependency.
  const canvas=document.createElement('canvas'),size=96,chars=' .:-=+*#%@';canvas.width=size*chars.length;canvas.height=size;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 76px monospace';for(let i=0;i<chars.length;i++)ctx.fillText(chars[i],i*size+size/2,size/2);
  this.atlas=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.atlas);this.textureSettings();gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
  this.locations=this.programs.map(p=>Object.fromEntries(['uImage','uAtlas','uSize','uCell','uScale','uDensity','uSoft','uSource','uVariation','uPhase','uStyle','uInk','uStep','uGlyph','uBloom','uMix','uGlow','uTransparent','uRects[0]','uRectCount','uUseMask','uFeather','uInvert'].map(n=>[n,gl.getUniformLocation(p,n)])));
 }catch(e){this.dispose();throw e;}}
 textureSettings(){const g=this.gl;g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);}
 target(w,h){const g=this.gl,texture=g.createTexture(),fbo=g.createFramebuffer(),t={texture,fbo,w,h};this.targets.push(t);g.bindTexture(g.TEXTURE_2D,texture);this.textureSettings();g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,texture,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Buffer Filtri non disponibile');return t;}
 bind(texture,unit){const g=this.gl;g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,texture);}
 begin(index,target,w,h){const g=this.gl;g.bindFramebuffer(g.FRAMEBUFFER,target?.fbo||null);g.viewport(0,0,w,h);g.useProgram(this.programs[index]);return this.locations[index];}
 draw(s,w,h,phase=0){const g=this.gl;g.activeTexture(g.TEXTURE0);if(this.width!==w||this.height!==h){this.release();try{this.input=this.target(w,h);this.glyph=this.target(w,h);this.blurA=this.target(Math.max(1,Math.ceil(w/2)),Math.max(1,Math.ceil(h/2)));this.blurB=this.target(this.blurA.w,this.blurA.h);this.width=w;this.height=h;}catch(e){this.release();throw e;}}
  g.bindFramebuffer(g.FRAMEBUFFER,null);this.bind(this.input.texture,0);g.copyTexSubImage2D(g.TEXTURE_2D,0,0,0,0,0,w,h);g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.disable(g.SCISSOR_TEST);g.colorMask(true,true,true,true);g.bindVertexArray(this.vao);
  const scale=Math.min(w,h)/1080;let u=this.begin(0,this.glyph,w,h);this.bind(this.input.texture,0);this.bind(this.atlas,1);g.uniform1i(u.uImage,0);g.uniform1i(u.uAtlas,1);g.uniform2f(u.uSize,w,h);g.uniform1f(u.uCell,Math.max(2,s.finishGlyphCell*scale));g.uniform1f(u.uScale,s.finishGlyphScale);g.uniform1f(u.uDensity,s.finishGlyphDensity);g.uniform1f(u.uSoft,s.finishGlyphSoftness);g.uniform1f(u.uSource,s.finishGlyphSource?1:0);g.uniform1f(u.uVariation,s.finishGlyphVariation);g.uniform1f(u.uPhase,(((phase%(Math.PI*2))+Math.PI*2)%(Math.PI*2))*Math.round(s.finishGlyphCycles));g.uniform1i(u.uStyle,Math.round(s.finishGlyphStyle));const hex=/^#[0-9a-f]{6}$/i.test(s.finishGlyphColor)?s.finishGlyphColor:'#8ef5d5';g.uniform3f(u.uInk,...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));g.drawArrays(g.TRIANGLES,0,3);
  let bloom=this.glyph.texture;
  if(s.finishGlyphGlow>0){const radius=s.finishGlyphRadius*scale;for(const [target,input,dx,dy]of [[this.blurA,this.glyph.texture,radius/w,0],[this.blurB,this.blurA.texture,0,radius/h]]){u=this.begin(1,target,target.w,target.h);this.bind(input,0);g.uniform1i(u.uImage,0);g.uniform2f(u.uSize,target.w,target.h);g.uniform2f(u.uStep,dx,dy);g.drawArrays(g.TRIANGLES,0,3);}bloom=this.blurB.texture;}
  u=this.begin(2,null,w,h);this.bind(this.input.texture,0);this.bind(this.glyph.texture,1);this.bind(bloom,2);g.uniform1i(u.uImage,0);g.uniform1i(u.uGlyph,1);g.uniform1i(u.uBloom,2);g.uniform2f(u.uSize,w,h);g.uniform1f(u.uMix,s.finishGlyphMix);g.uniform1f(u.uGlow,s.finishGlyphGlow);g.uniform1f(u.uTransparent,s.bgMode==='transparent'?1:0);
  const regions=normalizeFinishRegions(s.finishRegions),rects=new Float32Array(32);regions.forEach((r,i)=>rects.set([r.x/100,r.y/100,r.w/100,r.h/100],i*4));g.uniform4fv(u['uRects[0]'],rects);g.uniform1i(u.uRectCount,regions.length);g.uniform1f(u.uUseMask,s.finishRegionsEnabled&&s.finishRegionGlyph?1:0);g.uniform1f(u.uFeather,(s.finishFeather||0)/100);g.uniform1f(u.uInvert,s.finishRegionInvert?1:0);g.drawArrays(g.TRIANGLES,0,3);g.bindVertexArray(null);g.activeTexture(g.TEXTURE0);
 }
 release(){for(const t of this.targets||[]){this.gl.deleteTexture(t.texture);this.gl.deleteFramebuffer(t.fbo);}this.targets=[];this.width=this.height=0;this.input=this.glyph=this.blurA=this.blurB=null;}
 dispose(){this.release();for(const p of this.programs||[])this.gl.deleteProgram(p);this.programs=[];if(this.atlas)this.gl.deleteTexture(this.atlas);if(this.vao)this.gl.deleteVertexArray(this.vao);this.atlas=this.vao=null;}
}
