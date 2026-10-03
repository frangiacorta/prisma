// This module is intentionally self-contained: exported HTML wallpapers run offline.
const TAU=Math.PI*2;
function motionWave(t,phase){const a=phase*Math.round(t.cycles||1)*(t.direction||1)+(t.phase||0)*Math.PI/180;const x=Math.sin(a);return t.curve==='triangle'?2/Math.PI*Math.asin(x):t.curve==='soft'?x*Math.abs(x):x}
export function sampleFrame(source,phase=0){
 const s={...source,lights:(source.lights||[]).map(l=>({...l}))};
 const limits={volume:[.08,1.5],deform:[0,.75],twist:[-2.5,2.5],waves:[0,.4],hole:[0,.95],cut:[0,1.6],scale:[.35,1.7],positionX:[-1.5,1.5],positionY:[-1.5,1.5],iridescence:[0,1],roughness:[0,1],transparency:[0,1]};
 for(const [key,t] of Object.entries(source.motions||{})){
  if(!t.enabled)continue;const continuous=t.mode==='cycle'&&(key.startsWith('rotate')||key==='gradientOffset');
  const value=continuous?(phase/TAU*Math.round(t.cycles||1)*(t.direction||1)+(t.phase||0)/360)*(key.startsWith('rotate')?360:1):motionWave(t,phase)*(t.amplitude||0)*(source.motion??.3)/.3;
  s[key]=source[key]+value;if(limits[key])s[key]=Math.max(limits[key][0],Math.min(limits[key][1],s[key]));
 }
 if(!source.motions){if(source.animateRotation)s.rotateY+=phase*180/Math.PI;if(source.animateShape){s.volume*=1+Math.sin(phase)*source.motion*.4;s.deform+=Math.sin(phase)*source.motion*.16}if(source.animateColor)s.gradientOffset+=phase/TAU;}
 for(const l of s.lights){if(l.orbit?.enabled){const t=l.orbit,a=t.mode==='cycle'?phase*Math.round(t.cycles||1)*(t.direction||1)+(t.phase||0)*Math.PI/180:motionWave(t,phase)*t.amplitude*Math.PI/180*(source.motion??.3)/.3;const cs=Math.cos(a),sn=Math.sin(a);if(t.axis==='x'){[l.y,l.z]=[l.y*cs-l.z*sn,l.y*sn+l.z*cs]}else if(t.axis==='z'){[l.x,l.y]=[l.x*cs-l.y*sn,l.x*sn+l.y*cs]}else{[l.x,l.z]=[l.x*cs-l.z*sn,l.x*sn+l.z*cs]}}if(l.pulse?.enabled)l.power=Math.max(0,l.power*(1+motionWave(l.pulse,phase)*l.pulse.amplitude*(source.motion??.3)/.3))}
 return s;
}
const VERT=`#version 300 es
in vec2 aPosition;void main(){gl_Position=vec4(aPosition,0.,1.);}`;
const FRAG=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uResolution;
uniform vec4 uShape,uWarp,uVoid,uCut,uMat,uSurface,uGradient,uFrame,uOther;
uniform vec4 uExtraShape,uExtraShape2,uExtraShape3,uCoat,uOptics,uTexture,uPhoto1,uPhoto2,uPhoto3,uPhoto4;
uniform vec3 uPalette[12],uBg,uBg2;
uniform vec4 uLights[8],uLightProps[8],uLightExtra[8];
uniform vec3 uLightColors[8];
uniform int uPaletteCount,uLightCount;
uniform float uBgMode,uBgAngle,uSeed;
const float PI=3.14159265359;
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 transform(vec3 p){p.xy-=uFrame.yz;p/=uFrame.x;p.xy=rot(uExtraShape3.z)*p.xy;p.xz=rot(uOther.x)*p.xz;p.yz=rot(uOther.y)*p.yz;return p;}
float smax(float a,float b,float k){if(k<.0001)return max(a,b);float h=max(k-abs(a-b),0.)/k;return max(a,b)+h*h*k*.25;}
float field(vec3 world){
 vec3 p=transform(world);float volume=max(.06,uShape.x*uShape.w);p/=vec3(uShape.y,uShape.z,volume);
 p.xz=rot(uWarp.z*p.y*.7)*p.xz;
 p.x-=uWarp.y*(p.y*p.y-.25)+uExtraShape.z*(p.y*p.y-.3);p.y-=uExtraShape.w*(p.x*p.x-.3);
 p.x*=1.-uWarp.y*p.y*.18;p.xz/=max(.35,1.-uExtraShape.y*p.y*.45);
 p.x*=1.+uExtraShape2.z*exp(-p.y*p.y*4.);
 float w=sin(p.x*3.4+uSeed)*sin(p.y*2.6)*cos(p.z*3.+.6);
 float ripple=sin(p.x*uWarp.w*2.)*sin(p.y*uWarp.w*1.7)*sin(p.z*uWarp.w*1.6+1.);
 float exponent=2.+uExtraShape.x*6.;float norm=pow(pow(abs(p.x),exponent)+pow(abs(p.y),exponent)+pow(abs(p.z),exponent),1./exponent);
 float lobe=sin(atan(p.y,p.x)*uExtraShape2.y)*uExtraShape2.x*(1.-min(1.,abs(p.z))*.65);
 float d=norm-1.-uWarp.x*w-uOther.z*ripple*.17-lobe;
 float innerPower=2.+uVoid.w*5.;vec2 hp=abs((p.xy-uVoid.yz)/vec2(uExtraShape3.x,1.));
 float inner=pow(pow(hp.x,innerPower)+pow(hp.y,innerPower),1./innerPower)-uVoid.x;
 if(uVoid.x>.001)d=smax(d,-inner,uExtraShape2.w);
 if(uCut.x>.001)d=smax(d,uCut.x-length((p.xy-uCut.yz)/vec2(uExtraShape3.y,1.)),uExtraShape2.w);
 return d*min(min(uShape.y,uShape.z),volume)*uFrame.x*.5;
}
vec3 palette(float t){float v=fract(t)*float(uPaletteCount);int i=int(floor(v));int j=(i+1)%uPaletteCount;float f=fract(v),width=max(.012,uGradient.w);f=smoothstep(.5-width*.5,.5+width*.5,f);return mix(uPalette[i],uPalette[j],f);}
vec3 bg(vec2 uv){float t=dot(uv,vec2(cos(uBgAngle),sin(uBgAngle)))*.35+.5;return mix(uBg,uBg2,uBgMode==1.?clamp(t,0.,1.):0.);}
float fixture(vec2 q,vec4 props,vec4 extra){float width=max(.04,props.x),height=max(.04,props.y),soft=max(.015,extra.x);float d;
 if(props.w<.5){d=length(q/width)-1.;return 1.-smoothstep(-soft,soft,d);}
 if(props.w<1.5){d=max(abs(q.x)/width,abs(q.y)/height)-1.;return 1.-smoothstep(-soft,soft,d);}
 if(props.w<2.5){d=length(q)/max(.06,extra.y);return pow(max(0.,1.-d*d),mix(6.,.7,soft));}
 if(props.w<3.5){return exp(-dot(q/vec2(width,height),q/vec2(width,height))*mix(2.5,.6,soft));}
 if(props.w<4.5){float box=1.-smoothstep(-soft,soft,max(abs(q.x)/width,abs(q.y)/height)-1.);vec2 wave=abs(sin(q/vec2(width,height)*extra.z*PI*.5));float lattice=smoothstep(.25,.55,wave.x)*smoothstep(.25,.55,wave.y);return box*lattice;}
 d=abs(length(q/width)-.8);return 1.-smoothstep(.05,.08+soft*.35,d);
}
vec3 envLight(vec3 r,vec3 p,int i,float rough){vec3 offset=uLights[i].xyz-p;float distance=max(.25,length(offset));vec3 ld=offset/distance;float facing=dot(r,ld);if(facing<=.01)return vec3(0.);vec3 right=normalize(cross(abs(ld.y)>.98?vec3(1.,0.,0.):vec3(0.,1.,0.),ld));vec3 up=cross(ld,right);vec2 q=vec2(dot(r,right),dot(r,up))/max(.1,facing)*distance;q=rot(uLightProps[i].z)*q;
 float aniso=uTexture.x;vec2 anis=rot(uTexture.y)*q;anis.x*=1.-aniso*.75;anis.y*=1.+aniso*.6;q=mix(q,anis,aniso);
 vec4 props=uLightProps[i];props.xy+=rough*.85;vec4 extra=uLightExtra[i];extra.x=clamp(extra.x+rough*.5,.01,1.);if(props.w>1.5&&props.w<2.5)q/=distance;
 float attenuation=1./(1.+distance*distance*.025);return uLightColors[i]*uLights[i].w*fixture(q,props,extra)*attenuation*1.5;
}
vec3 environment(vec3 r,vec3 p,float rough){vec3 col=vec3(.012,.017,.032);for(int i=0;i<8;i++){if(i>=uLightCount)break;col+=envLight(r,p,i,rough);}return col;}
vec3 shade(vec3 p,vec3 n,vec3 rd,vec2 uv){
 vec3 local=transform(p);if(uTexture.z>.001)n=normalize(n+vec3(sin(local.y*84.),cos(local.x*71.),sin(local.z*69.))*uTexture.z*.045);
 float facing=max(dot(n,-rd),0.),fres=pow(1.-facing,3.)*uCoat.z;
 float pos=dot(local,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z;
 vec3 base=palette(pos),irid=palette(pos+(fres*.55+n.x*.16+uSurface.y*.15)*uOptics.x+uCoat.w);base=mix(base,irid,uSurface.x);
 vec3 diffuse=vec3(.22);for(int i=0;i<8;i++){if(i>=uLightCount)break;vec3 off=uLights[i].xyz-p;diffuse+=uLightColors[i]*max(dot(n,normalize(off)),0.)*uLights[i].w*.34/(1.+dot(off,off)*.025);}
 vec3 reflectDir=reflect(rd,n),reflection=environment(reflectDir,p,uMat.w);
 vec3 chroma=mix(vec3(.8),irid,.68*uSurface.x+.24*uMat.z);
 vec3 opaque=base*diffuse*(1.-uMat.z*.85)+reflection*chroma*(.28+uMat.z*.85)*uSurface.z;
 opaque+=irid*fres*(.12+uSurface.x*.65);
 vec3 refracted=refract(rd,n,1./uMat.y);vec3 transmission=environment(refracted,p,uMat.w)*.24;
 if(uOptics.y>.001){float shift=uOptics.y*.045;transmission=vec3(environment(normalize(refracted+vec3(shift,0.,0.)),p,uMat.w).r,environment(refracted,p,uMat.w).g,environment(normalize(refracted-vec3(shift,0.,0.)),p,uMat.w).b)*.24;}
 vec3 through=bg(uv+refracted.xy*uSurface.y*.35)+transmission;through=mix(through,base*.3,uOptics.w);through*=exp(-uOptics.z*uSurface.y*(vec3(1.)-base)*.65);
 vec3 glass=through*(1.-min(1.,fres)*.65)+reflection*(.35+fres*.8)*uSurface.z+irid*fres*.5;
 vec3 color=mix(opaque,glass,uMat.x*(1.-uMat.z*.85));
 if(uCoat.x>.001)color+=environment(reflectDir,p,uCoat.y)*uCoat.x*(.16+fres*.5);
 color+=base*uSurface.w*(.35+fres*1.8);if(uSurface.z<.05)color=mix(color,base,.75);return color;
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
vec3 photo(vec3 c,vec2 uv){c*=exp2(uPhoto1.x);c+=uPhoto1.y;float lum=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lum),c,uPhoto1.w);c=(c-.5)*uPhoto1.z+.5;c+=uPhoto3.x*pow(max(0.,1.-lum),2.)+uPhoto3.y*pow(max(0.,lum),2.);c*=vec3(1.+uPhoto2.x*.18+uPhoto2.y*.08,1.-uPhoto2.y*.14,1.-uPhoto2.x*.18+uPhoto2.y*.08);c=pow(max(c,vec3(0.)),vec3(1./uPhoto4.x));c*=1.-uPhoto2.z*smoothstep(.3,2.4,length(uv));return c;}
void main(){
 vec2 originalUV=(gl_FragCoord.xy-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4;
 vec2 uv=originalUV*(1.+uPhoto2.w*dot(originalUV,originalUV)*.18);
 vec3 ro=vec3(uv,4.8),rd=vec3(0.,0.,-1.);float t=0.,closest=10.;vec3 nearPoint=ro,p=ro;bool hit=false;
 for(int i=0;i<112;i++){p=ro+rd*t;float d=field(p);if(d<closest){closest=d;nearPoint=p;}if(d<.0015){hit=true;break;}t+=max(d*.8,.003);if(t>9.6)break;}
 float soft=uCut.w*.44,alpha=hit?1.:exp(-max(closest,0.)/max(.002,soft));
 float halo=exp(-max(closest,0.)/max(.008,.035+uOther.w*.16))*uOther.w*(.12+uSurface.w*.38);vec3 color=vec3(0.);
 if(hit||alpha>.002){if(!hit)p=nearPoint;vec2 e=vec2(.003,0.);vec3 grad=vec3(field(p+e.xyy)-field(p-e.xyy),field(p+e.yxy)-field(p-e.yxy),field(p+e.yyx)-field(p-e.yyx));vec3 n=length(grad)<.00001?vec3(0.,0.,1.):normalize(grad);color=shade(p,n,rd,uv);if(soft>.005&&hit)alpha*=1.-pow(1.-abs(dot(n,rd)),3.)*min(.7,soft*3.);}
 float flatBlend=(1.-smoothstep(.1,.45,uShape.x))*(1.-uSurface.z);
 if(flatBlend>.001){vec3 fp=transform(vec3(uv,0.));float normalization=max(.025,min(min(uShape.y,uShape.z),uShape.x*uShape.w)*uFrame.x*.5);float flatD=field(vec3(uv,0.))/normalization;float width=max(.008,uCut.w*1.6);float flatAlpha=1.-smoothstep(-width,width,flatD);vec3 flatColor=palette(dot(fp.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*uGradient.y*.3+uGradient.z);color=mix(color,flatColor,flatBlend);alpha=mix(alpha,flatAlpha,flatBlend);halo*=1.-flatBlend;}
 vec3 glow=palette(atan(uv.y,uv.x)/(2.*PI)+.5)*halo;vec3 back=bg(uPhoto4.y>.5?uv:originalUV);
 vec3 mapped=color/(vec3(1.)+color*.28),subject=mapped+glow*(1.-alpha*.65);vec3 result;
 if(uPhoto4.y>.5)result=photo(mix(back,mapped,alpha)+glow*(1.-alpha*.65),originalUV);else result=mix(back,photo(subject,originalUV),alpha)+glow*(1.-alpha);
 float grain=(hash(floor(gl_FragCoord.xy/max(.5,uPhoto3.z))+uSeed)-.5)*uFrame.w;result+=grain*(uPhoto4.y>.5?1.:alpha);
 if(uBgMode==2.){float a=clamp(alpha+halo,0.,1.);vec3 c=(mapped*alpha+glow)/max(a,.001);fragColor=vec4(clamp(photo(c,originalUV)+grain,0.,1.),a);}else fragColor=vec4(clamp(result,0.,1.),1.);
}`;
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)}
export class Renderer{
 constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('Questo browser non supporta WebGL 2. Prova un browser aggiornato con accelerazione grafica attiva.');this.gl=gl;const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};const p=gl.createProgram(),vs=shader(gl.VERTEX_SHADER,VERT),fs=shader(gl.FRAGMENT_SHADER,FRAG);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));gl.deleteShader(vs);gl.deleteShader(fs);this.program=p;gl.useProgram(p);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const at=gl.getAttribLocation(p,'aPosition');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);this.locations={};for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(p,i);this.locations[u.name.replace('[0]','')]=gl.getUniformLocation(p,u.name)}this.maxSize=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),gl.getParameter(gl.MAX_TEXTURE_SIZE),4096)}
 draw(source,phase=0,width=this.canvas.width,height=this.canvas.height){const s=sampleFrame(source,phase),c=this.canvas,g=this.gl;if(c.width!==width||c.height!==height){c.width=width;c.height=height}g.viewport(0,0,width,height);g.useProgram(this.program);const u=(name,v)=>g['uniform'+v.length+'fv'](this.locations[name],v),f=(name,v)=>g.uniform1f(this.locations[name],v),rad=Math.PI/180;
 u('uResolution',[width,height]);u('uShape',[s.volume,s.stretchX,s.stretchY,s.stretchZ]);u('uWarp',[s.deform,s.asymmetry,s.twist,s.waveScale]);u('uVoid',[s.hole,s.holeX,s.holeY,s.holeShape]);u('uCut',[s.cut,s.cutX,s.cutY,s.edge]);u('uMat',[s.transparency,s.refraction,s.metal,s.roughness]);u('uSurface',[s.iridescence,s.thickness,s.gloss,s.emission]);u('uGradient',[s.gradientAngle*rad,s.gradientScale,s.gradientOffset,s.colorSoftness]);u('uFrame',[s.scale,s.positionX,s.positionY,s.grain]);u('uOther',[s.rotateY*rad,s.rotateX*rad,s.waves,s.glow]);u('uExtraShape',[s.roundness||0,s.taper||0,s.bendX||0,s.bendY||0]);u('uExtraShape2',[s.lobeAmount||0,s.lobes||5,s.pinch||0,s.rimRound||0]);u('uExtraShape3',[s.holeAspect||1,s.cutAspect||1,(s.rotateZ||0)*rad,0]);u('uCoat',[s.coat||0,s.coatRoughness||.1,s.fresnel??1,s.iridShift||0]);u('uOptics',[s.iridScale||1,s.dispersion||0,s.absorption||0,s.tintStrength??.15]);u('uTexture',[s.anisotropy||0,(s.anisotropyAngle||0)*rad,s.surfaceTexture||0,0]);
 u('uPhoto1',[s.exposure||0,s.brightness||0,s.contrast??1,s.saturation??1]);u('uPhoto2',[s.temperature||0,s.photoTint||0,s.vignette||0,s.lensDistortion||0]);u('uPhoto3',[s.blacks||0,s.highlights||0,s.grainSize||1,0]);u('uPhoto4',[s.gamma||1,+!!s.photoAll,0,0]);
 const palette=s.palette.slice(0,12);while(palette.length<12)palette.push(palette[palette.length-1]||'#ffffff');g.uniform3fv(this.locations.uPalette,palette.flatMap(rgb));g.uniform1i(this.locations.uPaletteCount,Math.max(1,Math.min(12,s.palette.length)));
 const active=s.lights.filter(l=>l.enabled).slice(0,8),pos=[],colors=[],props=[],extra=[];const types={circle:0,bar:1,spot:2,diffuser:3,grid:4,ring:5};for(let i=0;i<8;i++){const l=active[i];pos.push(...(l?[l.x,l.y,l.z,l.power]:[0,0,0,0]));colors.push(...rgb(l?.color||'#000000'));props.push(...(l?[l.size,l.length,l.roll*rad,types[l.type]??0]:[1,1,0,0]));extra.push(...(l?[l.softness,Math.tan(l.cone*rad),l.grid,0]:[.3,1,4,0]))}g.uniform4fv(this.locations.uLights,pos);g.uniform3fv(this.locations.uLightColors,colors);g.uniform4fv(this.locations.uLightProps,props);g.uniform4fv(this.locations.uLightExtra,extra);g.uniform1i(this.locations.uLightCount,active.length);
 u('uBg',rgb(s.background));u('uBg2',rgb(s.background2));f('uBgMode',{solid:0,gradient:1,transparent:2}[s.bgMode]);f('uBgAngle',s.bgAngle*rad);f('uSeed',(s.seed%1000)*.013);g.drawArrays(g.TRIANGLES,0,3)}
 pixels(){const {gl,canvas}=this,raw=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);const flipped=new Uint8Array(raw.length),row=canvas.width*4;for(let y=0;y<canvas.height;y++)flipped.set(raw.subarray(y*row,(y+1)*row),(canvas.height-y-1)*row);return flipped}
 dispose(){this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext()}
}
