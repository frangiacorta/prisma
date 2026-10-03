const VERT=`#version 300 es
in vec2 aPosition; void main(){gl_Position=vec4(aPosition,0.,1.);}`;
const FRAG=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uResolution;
uniform vec4 uShape,uWarp,uVoid,uCut,uMat,uSurface,uGradient,uFrame,uMotion,uOther;
uniform vec3 uPalette[4],uBg,uBg2,uLightColor,uLight2Color;
uniform vec4 uLight,uLight2;
uniform float uPhase,uBgMode,uBgAngle,uSeed;
const float PI=3.14159265359;
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 transform(vec3 p){p.xy-=uFrame.yz;p/=uFrame.x;float a=uOther.x+uMotion.x*uPhase;p.xz=rot(a)*p.xz;p.yz=rot(uOther.y)*p.yz;return p;}
float field(vec3 world){
 vec3 p=transform(world);float volume=uShape.x*uShape.w*(1.+uMotion.y*sin(uPhase)*uMotion.w*.4);p/=vec3(uShape.y,uShape.z,max(.06,volume));
 float phase=uMotion.y*sin(uPhase)*uMotion.w;
 p.xz=rot(uWarp.z*p.y*.7)*p.xz;
 p.x-=uWarp.y*(p.y*p.y-.25);p.x*=1.-uWarp.y*p.y*.18;
 float w=sin(p.x*3.4+uSeed)*sin(p.y*2.6+phase*2.)*cos(p.z*3.+.6);
 float ripple=sin(p.x*uWarp.w*2.+phase)*sin(p.y*uWarp.w*1.7)*sin(p.z*uWarp.w*1.6+1.);
 float d=length(p)-1.-(uWarp.x+phase*.16)*w-uOther.z*ripple*.17;
 float exponent=2.+uVoid.w*5.;
 vec2 hp=abs(p.xy-uVoid.yz);float inner=pow(pow(hp.x,exponent)+pow(hp.y,exponent),1./exponent)-uVoid.x;
 if(uVoid.x>.001)d=max(d,-inner);
 if(uCut.x>.001)d=max(d,uCut.x-length(p.xy-uCut.yz));
 return d*min(min(uShape.y,uShape.z),max(.06,volume))*uFrame.x*.62;
}
vec3 palette(float t){t=fract(t);float v=t*4.;int i=int(floor(v));float f=fract(v);float smoothness=max(.012,uGradient.w);f=smoothstep(.5-smoothness*.5,.5+smoothness*.5,f);vec3 a=uPalette[0],b=uPalette[1];if(i==1){a=uPalette[1];b=uPalette[2];}if(i==2){a=uPalette[2];b=uPalette[3];}if(i==3){a=uPalette[3];b=uPalette[0];}return mix(a,b,f);}
vec3 bg(vec2 uv){float t=dot(uv,vec2(cos(uBgAngle),sin(uBgAngle)))*.35+.5;return mix(uBg,uBg2,uBgMode==1.?clamp(t,0.,1.):0.);}
vec3 direction(vec4 light){float a=light.x;return normalize(vec3(sin(a)*cos(light.y),sin(light.y),cos(a)*cos(light.y)));}
vec3 envLight(vec3 r,vec4 l,vec3 tint){vec3 ld=direction(l);float sharp=mix(110.,7.,clamp(l.w+uMat.w*.5,0.,1.));float spot=pow(max(dot(r,ld),0.),sharp);vec3 q=r;q.xz=rot(l.x)*q.xz;q.yz=rot(l.y*.4)*q.yz;float stripe=exp(-pow((q.y-.36-.14*sin(q.x*3.))/mix(.028,.22,l.w+uMat.w*.3),2.));stripe*=smoothstep(-.5,.4,q.z);return tint*l.z*(spot*1.8+stripe*.8);}
vec3 environment(vec3 r){return vec3(.012,.017,.032)+envLight(r,uLight,uLightColor)+envLight(r,uLight2,uLight2Color);}
vec3 shade(vec3 p,vec3 n,vec3 rd,vec2 uv){
 vec3 local=transform(p);float facing=max(dot(n,-rd),0.);float fres=pow(1.-facing,3.);
 float pos=dot(local,vec3(cos(uGradient.x),sin(uGradient.x),.35))*uGradient.y*.3+uGradient.z+uMotion.z*uPhase/(2.*PI);
 vec3 base=palette(pos);vec3 irid=palette(pos+fres*.55+n.x*.16+uSurface.y*.15);
 base=mix(base,irid,uSurface.x);
 float diffuse=.22+max(dot(n,direction(uLight)),0.)*uLight.z*.34+max(dot(n,direction(uLight2)),0.)*uLight2.z*.2;
 vec3 reflection=environment(reflect(rd,n));
 vec3 chroma=mix(vec3(.8),irid,.68*uSurface.x+.24*uMat.z);
 vec3 opaque=base*diffuse*(1.-uMat.z*.85)+reflection*chroma*(.28+uMat.z*.85)*uSurface.z;
 opaque+=irid*fres*(.12+uSurface.x*.65);
 vec3 refracted=refract(rd,n,1./uMat.y);
 vec3 through=bg(uv+refracted.xy*uSurface.y*.35)+environment(refracted)*.24;
 through=mix(through,base*.3,.14+uSurface.y*.12);
 vec3 glass=through*(1.-fres*.65)+reflection*(.35+fres*.8)*uSurface.z+irid*fres*.5;
 vec3 color=mix(opaque,glass,uMat.x*(1.-uMat.z*.85));
 color+=base*uSurface.w*(.35+fres*1.8);
 if(uSurface.z<.05)color=mix(color,base,.75);
 return color;
}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*uResolution)/min(uResolution.x,uResolution.y)*3.4;
 vec3 ro=vec3(uv,4.8),rd=vec3(0.,0.,-1.);float t=0.,closest=10.;vec3 nearPoint=ro,p=ro;bool hit=false;
 for(int i=0;i<104;i++){p=ro+rd*t;float d=field(p);if(d<closest){closest=d;nearPoint=p;}if(d<.0015){hit=true;break;}t+=max(d*.8,.003);if(t>9.6)break;}
 float soft=uCut.w*.44;float alpha=hit?1.:exp(-max(closest,0.)/max(.002,soft));
 float halo=exp(-max(closest,0.)/max(.008,.035+uOther.w*.16))*uOther.w*(.12+uSurface.w*.38);
 vec3 color=vec3(0.);
 if(hit||alpha>.002){if(!hit)p=nearPoint;vec2 e=vec2(.003,0.);vec3 n=normalize(vec3(field(p+e.xyy)-field(p-e.xyy),field(p+e.yxy)-field(p-e.yxy),field(p+e.yyx)-field(p-e.yyx)));color=shade(p,n,rd,uv);if(soft>.005&&hit){float rim=pow(1.-abs(dot(n,rd)),3.);alpha*=1.-rim*min(.7,soft*3.);}}
 float flatBlend=(1.-smoothstep(.1,.45,uShape.x))*(1.-uSurface.z);
 if(flatBlend>.001){vec3 fp=transform(vec3(uv,0.));float normalization=max(.025,min(min(uShape.y,uShape.z),uShape.x*uShape.w)*uFrame.x*.62);float flatD=field(vec3(uv,0.))/normalization;float width=max(.008,uCut.w*1.6);float flatAlpha=1.-smoothstep(-width,width,flatD);vec3 flatColor=palette(dot(fp.xy,vec2(cos(uGradient.x),sin(uGradient.x)))*uGradient.y*.3+uGradient.z+uMotion.z*uPhase/(2.*PI));color=mix(color,flatColor,flatBlend);alpha=mix(alpha,flatAlpha,flatBlend);halo*=1.-flatBlend;}
 vec3 glow=palette(atan(uv.y,uv.x)/(2.*PI)+.5)*halo;
 vec3 back=bg(uv);vec3 mapped=color/(vec3(1.)+color*.28);vec3 result=mix(back,mapped,alpha)+glow*(1.-alpha*.65);
 float grain=(hash(gl_FragCoord.xy+uSeed)-.5)*uFrame.w;
 result=max(vec3(0.),result+grain);
 if(uBgMode==2.){float a=clamp(alpha+halo,0.,1.);vec3 c=(color*alpha+glow)/max(a,.001);fragColor=vec4(clamp(c/(1.+c*.28)+grain,0.,1.),a);}else fragColor=vec4(clamp(result,0.,1.),1.);
}`;
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)}
export class Renderer {
 constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('Questo browser non supporta WebGL 2. Prova un browser aggiornato con accelerazione grafica attiva.');this.gl=gl;const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};const p=gl.createProgram();const vs=shader(gl.VERTEX_SHADER,VERT),fs=shader(gl.FRAGMENT_SHADER,FRAG);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));gl.deleteShader(vs);gl.deleteShader(fs);this.program=p;gl.useProgram(p);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);const at=gl.getAttribLocation(p,'aPosition');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);this.locations={};for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(p,i);this.locations[u.name.replace('[0]','')]=gl.getUniformLocation(p,u.name)}this.maxSize=Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),gl.getParameter(gl.MAX_TEXTURE_SIZE),4096)}
 draw(s,phase=0,width=this.canvas.width,height=this.canvas.height){const c=this.canvas,g=this.gl;if(c.width!==width||c.height!==height){c.width=width;c.height=height}g.viewport(0,0,width,height);g.useProgram(this.program);const u=(name,values)=>g['uniform'+values.length+'fv'](this.locations[name],values);const f=(name,v)=>g.uniform1f(this.locations[name],v);const rad=Math.PI/180;
 u('uResolution',[width,height]);u('uShape',[s.volume,s.stretchX,s.stretchY,s.stretchZ]);u('uWarp',[s.deform,s.asymmetry,s.twist,s.waveScale]);u('uVoid',[s.hole,s.holeX,s.holeY,s.holeShape]);u('uCut',[s.cut,s.cutX,s.cutY,s.edge]);u('uMat',[s.transparency,s.refraction,s.metal,s.roughness]);u('uSurface',[s.iridescence,s.thickness,s.gloss,s.emission]);u('uGradient',[s.gradientAngle*rad,s.gradientScale,s.gradientOffset,s.colorSoftness]);u('uFrame',[s.scale,s.positionX,s.positionY,s.grain]);u('uMotion',[+s.animateRotation,+s.animateShape,+s.animateColor,s.motion]);u('uOther',[s.rotateY*rad,s.rotateX*rad,s.waves,s.glow]);u('uLight',[s.lightAngle*rad+(s.animateLight?Math.sin(phase)*.6:0),s.lightHeight*rad,s.lightPower,s.lightSize]);u('uLight2',[s.light2Angle*rad,s.light2Height*rad,s.light2?s.light2Power:0,s.light2Size]);u('uLightColor',rgb(s.lightColor));u('uLight2Color',rgb(s.light2Color));u('uBg',rgb(s.background));u('uBg2',rgb(s.background2));g.uniform3fv(this.locations.uPalette,s.palette.flatMap(rgb));f('uPhase',phase);f('uBgMode',{solid:0,gradient:1,transparent:2}[s.bgMode]);f('uBgAngle',s.bgAngle*rad);f('uSeed',(s.seed%1000)*.013);g.drawArrays(g.TRIANGLES,0,3)}
 pixels(){const {gl,canvas}=this;const raw=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);const flipped=new Uint8Array(raw.length),row=canvas.width*4;for(let y=0;y<canvas.height;y++)flipped.set(raw.subarray(y*row,(y+1)*row),(canvas.height-y-1)*row);return flipped}
 dispose(){this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext()}
}
