import {FinishingPass,normalizeFinishRegions} from './finishing.js?v=35455dbed4a0';

// Luminance-modulated carrier contours, evaluated from the composed frame.
// Original shader: no code from the referenced TouchDesigner component.
const fragment=`#version 300 es
precision highp float;
uniform sampler2D uImage;uniform vec2 uSize;
uniform vec4 uLines,uWave,uRects[8];uniform int uRectCount;
uniform vec3 uInk;
uniform float uLod,uMix,uSource,uOnly,uTransparent,uUseMask,uFeather,uInvert,uPhase;
out vec4 color;
float regionMask(vec2 uv){
 if(uRectCount==0)return 0.;vec2 p=vec2(uv.x,1.-uv.y);float m=0.;
 for(int i=0;i<8;i++){if(i>=uRectCount)break;vec4 r=uRects[i];vec2 d=min(p-r.xy,r.xy+r.zw-p)*uSize/min(uSize.x,uSize.y);float e=min(d.x,d.y);m=max(m,uFeather>0.?smoothstep(0.,uFeather,e):step(0.,e));}
 return mix(m,1.-m,uInvert);
}
void main(){
 vec2 uv=gl_FragCoord.xy/uSize;vec4 raw=texture(uImage,uv),base=vec4(raw.rgb*raw.a,raw.a);
 float mask=mix(1.,regionMask(uv),uUseMask),amount=uMix*mask;
 float unit=min(uSize.x,uSize.y)/1080.;vec2 xy=(gl_FragCoord.xy-uSize*.5)/unit;
 vec2 along=vec2(cos(uLines.w),sin(uLines.w)),across=vec2(-along.y,along.x);
 vec4 signalPixel=textureLod(uImage,uv,uLod);
 float luminance=dot(signalPixel.rgb*signalPixel.a,vec3(.2126,.7152,.0722));
 float wave=sin(dot(xy,along)/1080.*uWave.y*6.2831853+uPhase)*uWave.x*luminance;
 float carrier=(dot(xy,across)-uLines.z*luminance)/uLines.x+wave+uPhase/6.2831853;
 // Screen derivatives keep the stroke width stable even where contours bunch.
 float slope=max(fwidth(carrier),.00001),distance=abs(fract(carrier+.5)-.5)/slope;
 float width=max(.3,uLines.y*unit)*.5;
 float stroke=1.-smoothstep(max(0.,width-.6),width+.6,distance);
 // Converging subpixel lines approach their mean coverage rather than aliasing.
 float average=clamp(uLines.y/uLines.x,0.,1.);
 stroke=mix(stroke,average,smoothstep(.35,.85,slope));
 float signal=smoothstep(uWave.z,uWave.z+max(.005,fwidth(luminance)),luminance);
 float a=stroke*signal*raw.a;
 vec3 ink=mix(uInk,raw.rgb,uSource);
 vec4 overlay=vec4(ink*a+base.rgb*(1.-a),a+base.a*(1.-a));
 vec4 only=vec4(ink*a,uTransparent>.5?a:1.);
 vec4 result=mix(base,mix(overlay,only,uOnly),amount);
 // A zero mix or an excluded area returns the untouched straight-alpha pixel.
 color=amount<=0.?raw:(result.a<1./255.?vec4(0.):vec4(result.rgb/result.a,result.a));
}`;

export class ScanlinePass extends FinishingPass{
 constructor(gl){super(gl,fragment,['uLod','uImage','uSize','uLines','uWave','uInk','uMix','uSource','uOnly','uTransparent','uPhase','uRects[0]','uRectCount','uUseMask','uFeather','uInvert']);}
 draw(s,w,h,phase=0){
  const g=this.gl,u=this.uniforms;g.bindFramebuffer(g.FRAMEBUFFER,null);g.activeTexture(g.TEXTURE0);
  if(!this.texture){this.texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.texture);for(const k of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,k,g.LINEAR);for(const k of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,k,g.CLAMP_TO_EDGE);}else g.bindTexture(g.TEXTURE_2D,this.texture);
  if(this.width!==w||this.height!==h){g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,w,h,0,g.RGBA,g.UNSIGNED_BYTE,null);this.width=w;this.height=h;}
  g.copyTexSubImage2D(g.TEXTURE_2D,0,0,0,0,0,w,h);
  const radius=(s.finishScanSmooth||0)*Math.min(w,h)/1080;g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,radius>1?g.LINEAR_MIPMAP_LINEAR:g.LINEAR);if(radius>1)g.generateMipmap(g.TEXTURE_2D);
  g.disable(g.BLEND);g.disable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.disable(g.SCISSOR_TEST);g.colorMask(true,true,true,true);g.viewport(0,0,w,h);g.bindVertexArray(this.vao);g.useProgram(this.program);
  g.uniform1f(u.uLod,Math.max(0,Math.log2(Math.max(1,radius))));g.uniform1i(u.uImage,0);g.uniform2f(u.uSize,w,h);g.uniform4f(u.uLines,s.finishScanSpacing,s.finishScanWidth,s.finishScanDepth,s.finishScanAngle*Math.PI/180);
  g.uniform4f(u.uWave,s.finishScanWave,s.finishScanFrequency,s.finishScanThreshold,0);
  const loop=((phase%(Math.PI*2)+Math.PI*2)%(Math.PI*2));g.uniform1f(u.uPhase,s.finishScanAnimate?loop*Math.round(s.finishScanCycles):0);
  g.uniform1f(u.uMix,s.finishScanMix);g.uniform1f(u.uSource,+s.finishScanSource);g.uniform1f(u.uOnly,+s.finishScanOnly);g.uniform1f(u.uTransparent,+(s.bgMode==='transparent'));
  const hex=/^#[0-9a-f]{6}$/i.test(s.finishScanColor)?s.finishScanColor:'#ff4c35';g.uniform3f(u.uInk,...[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
  const regions=normalizeFinishRegions(s.finishRegions),rects=new Float32Array(32);regions.forEach((r,i)=>rects.set([r.x/100,r.y/100,r.w/100,r.h/100],i*4));g.uniform4fv(u['uRects[0]'],rects);g.uniform1i(u.uRectCount,regions.length);g.uniform1f(u.uUseMask,+(s.finishRegionsEnabled&&s.finishRegionScan));g.uniform1f(u.uFeather,(s.finishFeather||0)/100);g.uniform1f(u.uInvert,+s.finishRegionInvert);
  g.drawArrays(g.TRIANGLES,0,3);g.bindVertexArray(null);
 }
}
