(() => {
  const canvas=document.querySelector('#scene'),status=document.querySelector('#status');
  const config=window.prismaCalibration;
  document.querySelector('#width').value=config.projection.width;
  if(config.projection.height!==null)document.querySelector('#height').value=config.projection.height;
  document.querySelector('#distance').value=config.eye.estimatedWallDistance;
  document.querySelector('#eyeX').value=config.eye.x??0;
  document.querySelector('#eyeY').value=config.eye.y??0;
  const gl=canvas.getContext('webgl2',{antialias:false,powerPreference:'high-performance'});
  if(!gl){status.textContent='WebGL2 non disponibile in Wallpaper Engine';window.calibrationStatus={passed:false,error:status.textContent};return;}
  const vertex=`#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`;
  const fragment=`#version 300 es
precision highp float;
uniform vec2 uResolution,uSize,uEyeXY;
uniform float uEyeZ,uGrid,uFront,uMotion,uTime,uCube;
out vec4 outColor;
const float INF=1.e20;
float sphereHit(vec3 ro,vec3 rd,vec3 c,float r){vec3 o=ro-c;float b=dot(o,rd),q=b*b-dot(o,o)+r*r;if(q<0.)return INF;float s=sqrt(q),a=-b-s;return a>.01?a:(-b+s>.01?-b+s:INF);}
float boxHit(vec3 ro,vec3 rd,vec3 centre,vec3 halfSize,float angle,out vec3 normal){
 float c=cos(angle),s=sin(angle);vec3 o=ro-centre;
 o=vec3(c*o.x-s*o.z,o.y,s*o.x+c*o.z);
 vec3 d=vec3(c*rd.x-s*rd.z,rd.y,s*rd.x+c*rd.z);
 float pitch=angle==0.?0.:.25,cp=cos(pitch),sp=sin(pitch);
 o=vec3(o.x,cp*o.y+sp*o.z,-sp*o.y+cp*o.z);
 d=vec3(d.x,cp*d.y+sp*d.z,-sp*d.y+cp*d.z);
 vec3 safeDir=mix(vec3(.000001),d,greaterThan(abs(d),vec3(.000001)));
 vec3 a=(-halfSize-o)/safeDir,b=(halfSize-o)/safeDir;
 vec3 nearT=min(a,b),farT=max(a,b);
 float enter=max(nearT.x,max(nearT.y,nearT.z)),leave=min(farT.x,min(farT.y,farT.z));
 if(enter>leave||leave<=.01){normal=vec3(0.);return INF;}
 float t=enter>.01?enter:leave;vec3 p=(o+d*t)/halfSize,q=abs(p),n;
 if(q.x>q.y&&q.x>q.z)n=vec3(sign(p.x),0.,0.);
 else if(q.y>q.z)n=vec3(0.,sign(p.y),0.);
 else n=vec3(0.,0.,sign(p.z));
 n=vec3(n.x,cp*n.y-sp*n.z,sp*n.y+cp*n.z);
 normal=vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);return t;
}
float visibility(vec3 p,vec3 n,vec3 source,vec3 sphere,float radius,float ow,float oh){
 vec3 origin=p+n*1.5,toLight=source-origin;float distance=length(toLight);vec3 direction=toLight/distance;
 vec3 unused;float objectHit=uCube>.5?boxHit(origin,direction,sphere,vec3(radius),.35,unused):sphereHit(origin,direction,sphere,radius);
 if(objectHit<distance)return 0.;
 if(uCube>.5)for(int side=0;side<2;side++){
  vec3 post=vec3(uSize.x*.24*(side==0?-1.:1.),0.,0.);
  if(boxHit(origin,direction,post,vec3(8.,uSize.y*.5,16.),0.,unused)<distance)return 0.;
 }
 if(origin.z<0.&&direction.z>0.){float t=-origin.z/direction.z;vec3 wall=origin+direction*t;if(t<distance&&(abs(wall.x)>ow||abs(wall.y)>oh))return 0.;}
 return 1.;
}
void main(){
 vec2 uv=gl_FragCoord.xy/uResolution;
 vec2 wall=(uv-.5)*uSize;
 vec3 ro=vec3(uEyeXY,uEyeZ),rd=normalize(vec3(wall,0.)-ro);
 // The opening fills the projected canvas; retain the Windows bars outside it.
 float ow=uSize.x*.5,oh=uSize.y*.5,depth=min(uSize.x,uSize.y)*.72;
 float scale=min(uSize.x,uSize.y);
 vec3 sphere=mix(vec3(0.,-uSize.y*.045,-scale*.13),vec3(uSize.x*.265,-uSize.y*.12,scale*.25),uFront);
 float radius=scale*mix(.275,.24,uFront);
 if(uMotion>.5){
  sphere=vec3(uSize.x*.20,-uSize.y*.10,scale*(-.055-.422*cos(uTime*6.2831853/12.)));
  radius=scale*.22;
 }
 if(uCube>.5){
  radius=scale*.14;
  if(uMotion<.5)sphere.z=scale*mix(-.477,.367,uFront);
  // Go around the right post rather than passing through solid geometry.
  float approach=sphere.z/(scale*.37);
  sphere.x=uSize.x*(.24-.17*exp(-approach*approach));sphere.y=-uSize.y*.10;
 }
 float best=INF;int kind=0;vec3 normal=vec3(0.,0.,1.),hit=vec3(0.);
 vec3 objectNormal;float ts=uCube>.5?boxHit(ro,rd,sphere,vec3(radius),.35,objectNormal):sphereHit(ro,rd,sphere,radius);
 if(ts<best){best=ts;kind=2;hit=ro+rd*ts;normal=uCube>.5?objectNormal:normalize(hit-sphere);}
 if(uCube>.5)for(int side=0;side<2;side++){
  vec3 post=vec3(uSize.x*.24*(side==0?-1.:1.),0.,0.);
  ts=boxHit(ro,rd,post,vec3(8.,uSize.y*.5,16.),0.,objectNormal);
  if(ts<best){best=ts;kind=5;hit=ro+rd*ts;normal=objectNormal;}
 }
 float tp=-ro.z/rd.z;vec3 plane=ro+rd*tp;
 bool inside=abs(plane.x)<ow&&abs(plane.y)<oh;
 if(tp>0.&&tp<best&&!inside){best=tp;kind=1;hit=plane;normal=vec3(0.,0.,1.);}
 if(inside){
  float t=(-depth-ro.z)/rd.z;vec3 p=ro+rd*t;
  if(t>tp&&t<best&&abs(p.x)<=ow&&abs(p.y)<=oh){best=t;kind=3;hit=p;normal=vec3(0.,0.,1.);}
  for(int axis=0;axis<2;axis++)for(int side=0;side<2;side++){
   float v=(axis==0?ow:oh)*(side==0?-1.:1.);
   float origin=axis==0?ro.x:ro.y,dir=axis==0?rd.x:rd.y;
   if(abs(dir)<.00001)continue;
   t=(v-origin)/dir;p=ro+rd*t;
   if(t>tp&&t<best&&p.z<0.&&p.z>-depth&&abs(axis==0?p.y:p.x)<=(axis==0?oh:ow)){
    best=t;kind=4;hit=p;normal=axis==0?vec3(-sign(v),0.,0.):vec3(0.,-sign(v),0.);
   }
  }
 }
 vec3 color=vec3(.035,.045,.058);
 vec3 lightPosition=vec3(-uSize.x*.48,uSize.y*.75,scale*1.1);
 vec3 light=normalize(lightPosition-hit);
 if(kind>0){
  float lighting=0.,shadow=0.;
  for(int sampleIndex=0;sampleIndex<64;sampleIndex++){
   float angle=float(sampleIndex)*2.39996323,spread=sqrt((float(sampleIndex)+.5)/64.)*scale*.13;
   vec3 source=lightPosition+vec3(cos(angle)*spread,sin(angle)*spread,0.);
   float visible=visibility(hit,normal,source,sphere,radius,ow,oh);
   shadow+=visible/64.;lighting+=max(0.,dot(normal,normalize(source-hit)))*visible/64.;
  }
  if(kind==1){
   float edge=min(abs(abs(hit.x)-ow),abs(abs(hit.y)-oh));
   float frame=(abs(hit.x)<ow+12.&&abs(hit.y)<oh+12.&&edge<12.)?1.:0.;
   color=mix(vec3(.34,.325,.30),vec3(.22,.19,.15),frame);
   color*=.16+.84*lighting;
  }else if(kind==2){
   vec3 base=vec3(.055,.32,.39);
   float spec=pow(max(0.,dot(normal,normalize(light-rd))),48.);
   float fresnel=pow(1.-max(0.,dot(normal,-rd)),4.);
   color=base*(.10+.90*lighting)+vec3(.95,.90,.78)*spec*shadow*.8;
   color+=vec3(.10,.15,.18)*fresnel*(.3+.7*max(normal.y,0.));
  }else if(kind==5){
   color=vec3(.18,.13,.08)*(.14+.86*lighting);
  }else{
   vec3 base=kind==3?vec3(.20,.235,.25):vec3(.26,.28,.29);
   float cornerDistance=min(ow-abs(hit.x),min(oh-abs(hit.y),hit.z+depth));
   if(kind==3)cornerDistance=min(ow-abs(hit.x),oh-abs(hit.y));
   else if(abs(normal.x)>.5)cornerDistance=min(oh-abs(hit.y),hit.z+depth);
   else cornerDistance=min(ow-abs(hit.x),hit.z+depth);
   float ambient=mix(.055,.14,smoothstep(0.,scale*.12,max(cornerDistance,0.)));
   color=base*(ambient+.86*lighting);
   if(kind==3){
    vec2 q=hit.xy/100.;vec2 line=abs(fract(q)-.5);
    float grid=smoothstep(.46,.495,max(line.x,line.y));
    color+=vec3(.012,.018,.02)*grid;
   }
  }
 }
 if(uGrid>.5){
  vec2 q=wall/100.;vec2 line=abs(fract(q)-.5);
  float grid=smoothstep(.47,.495,max(line.x,line.y));
  color=mix(color,vec3(.38,.66,.65),grid*.26);
  float axis=(abs(wall.x)<2.||abs(wall.y)<2.)?1.:0.;
  color=mix(color,vec3(.74,.75,.37),axis*.4);
 }
 color=pow(max(color,vec3(0.)),vec3(1./2.2));
 outColor=vec4(color,1.);
}`;
  function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  let program;
  try{program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));}
  catch(error){status.textContent='Shader: '+error.message;window.calibrationStatus={passed:false,error:error.message};return;}
  const uniform=name=>gl.getUniformLocation(program,name);
  const locations={res:uniform('uResolution'),size:uniform('uSize'),eye:uniform('uEyeXY'),distance:uniform('uEyeZ'),grid:uniform('uGrid'),front:uniform('uFront'),motion:uniform('uMotion'),time:uniform('uTime'),cube:uniform('uCube')};
  const read=id=>Number(document.getElementById(id).value);
  let motionSeconds=0,lastTick=0,lastRender=0;
  function draw(){
   const dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(innerWidth*dpr)),h=Math.max(1,Math.floor(innerHeight*dpr));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   const width=read('width')||config.projection.width,enteredHeight=read('height'),height=enteredHeight||width*h/w;
   document.querySelector('#estimate').textContent=enteredHeight?'Altezza misurata: '+enteredHeight+' mm':'Altezza provvisoria dai pixel: '+Math.round(height)+' mm. Inserisci quella misurata.';
   document.querySelector('#measure').textContent='Immagine: '+width/10+' × '+Math.round(height)/10+' cm · distanza approssimativa: '+(read('distance')||config.eye.estimatedWallDistance)/10+' cm · occhi rispetto al centro: '+(read('eyeX')||0)/10+' cm orizzontali, '+(read('eyeY')||0)/10+' cm verticali.';
   gl.viewport(0,0,w,h);gl.useProgram(program);gl.uniform2f(locations.res,w,h);gl.uniform2f(locations.size,width,height);
   gl.uniform2f(locations.eye,read('eyeX')||0,read('eyeY')||0);gl.uniform1f(locations.distance,read('distance')||config.eye.estimatedWallDistance);gl.uniform1f(locations.grid,document.getElementById('grid').checked?1:0);
   gl.uniform1f(locations.front,document.getElementById('front').checked?1:0);
   const motion=document.getElementById('motion').checked;
   document.getElementById('front').disabled=motion;
   gl.uniform1f(locations.motion,motion?1:0);gl.uniform1f(locations.time,motionSeconds);
   gl.uniform1f(locations.cube,document.getElementById('cube').checked?1:0);
   gl.drawArrays(gl.TRIANGLES,0,3);
   const error=gl.getError();window.calibrationStatus={passed:error===gl.NO_ERROR,webgl2:true,renderer:(()=>{const ext=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER)})(),pixelWidth:w,pixelHeight:h,physicalWidthMm:width,physicalHeightMm:height,heightEstimated:!enteredHeight,eyeDistanceMm:read('distance')||config.eye.estimatedWallDistance,error:error||null};
   window.calibrationStatus.motion=motion;
   window.calibrationStatus.motionSeconds=motionSeconds;
   window.calibrationStatus.object=document.getElementById('cube').checked?'cube':'sphere';
   status.textContent=error?'Errore WebGL: '+error:(window.calibrationStatus.object==='cube'?'Cubo e montanti':'Sfera')+(motion?' · avanti/indietro':' · scena ferma')+' · WebGL2';
  }
  for(const input of document.querySelectorAll('input'))input.addEventListener('input',draw);
  document.querySelector('#toggle').onclick=()=>{document.querySelector('#panel').classList.toggle('compact');document.querySelector('#toggle').textContent=document.querySelector('#panel').classList.contains('compact')?'+':'−';};
  addEventListener('resize',draw);draw();
  function tick(now){
   const moving=document.getElementById('motion').checked&&!document.hidden;
   if(lastTick&&moving)motionSeconds+=Math.min((now-lastTick)/1000,.1);
   lastTick=now;
   if(moving&&now-lastRender>=1000/30){draw();lastRender=now;}
   requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
