(() => {
  const canvas=document.querySelector('#scene'),status=document.querySelector('#status');
  const config=window.prismaCalibration;
  document.querySelector('#width').value=config.projection.estimatedWidth;
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
uniform float uEyeZ,uGrid;
out vec4 outColor;
const float INF=1.e20;
float sphereHit(vec3 ro,vec3 rd,vec3 c,float r){vec3 o=ro-c;float b=dot(o,rd),q=b*b-dot(o,o)+r*r;if(q<0.)return INF;float s=sqrt(q),a=-b-s;return a>.01?a:(-b+s>.01?-b+s:INF);}
void main(){
 vec2 uv=gl_FragCoord.xy/uResolution;
 vec2 wall=(uv-.5)*uSize;
 vec3 ro=vec3(uEyeXY,uEyeZ),rd=normalize(vec3(wall,0.)-ro);
 float ow=uSize.x*.36,oh=uSize.y*.34,depth=min(uSize.x,uSize.y)*.72;
 vec3 sphere=vec3(0.,-uSize.y*.045,-min(uSize.x,uSize.y)*.13);
 float radius=min(uSize.x,uSize.y)*.275;
 float best=INF;int kind=0;vec3 normal=vec3(0.,0.,1.),hit=vec3(0.);
 float ts=sphereHit(ro,rd,sphere,radius);
 if(ts<best){best=ts;kind=2;hit=ro+rd*ts;normal=normalize(hit-sphere);}
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
 vec3 light=normalize(vec3(-.48,.72,.52));
 if(kind>0){
  float diffuse=max(0.,dot(normal,light));
  if(kind==1){
   float edge=min(abs(abs(hit.x)-ow),abs(abs(hit.y)-oh));
   float frame=(abs(hit.x)<ow+24.&&abs(hit.y)<oh+24.&&edge<24.)?1.:0.;
   color=mix(vec3(.19,.205,.21),vec3(.39,.31,.22),frame);
   color*=.88+.12*diffuse;
  }else if(kind==2){
   vec3 base=mix(vec3(.13,.42,.53),vec3(.65,.29,.33),clamp(hit.y/max(radius,1.)*.55+.5,0.,1.));
   float spec=pow(max(0.,dot(reflect(-light,normal),-rd)),24.);
   color=base*(.25+.75*diffuse)+vec3(.7,.85,.91)*spec*.55;
  }else{
   vec3 base=kind==3?vec3(.13,.18,.22):vec3(.16,.20,.23);
   float shadow=sphereHit(hit+normal*2.,light,sphere,radius)<INF?.42:1.;
   color=base*(.28+.72*diffuse*shadow);
   if(kind==3){
    vec2 q=hit.xy/100.;vec2 line=abs(fract(q)-.5);
    float grid=smoothstep(.46,.495,max(line.x,line.y));
    color+=vec3(.025,.045,.055)*grid;
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
  const locations={res:uniform('uResolution'),size:uniform('uSize'),eye:uniform('uEyeXY'),distance:uniform('uEyeZ'),grid:uniform('uGrid')};
  const read=id=>Number(document.getElementById(id).value);
  function draw(){
   const dpr=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(innerWidth*dpr)),h=Math.max(1,Math.floor(innerHeight*dpr));
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   const width=read('width')||config.projection.estimatedWidth,enteredHeight=read('height'),height=enteredHeight||width*h/w;
   document.querySelector('#estimate').textContent=enteredHeight?'Altezza misurata: '+enteredHeight+' mm':'Altezza provvisoria dai pixel: '+Math.round(height)+' mm. Inserisci quella misurata.';
   gl.viewport(0,0,w,h);gl.useProgram(program);gl.uniform2f(locations.res,w,h);gl.uniform2f(locations.size,width,height);
   gl.uniform2f(locations.eye,read('eyeX')||0,read('eyeY')||0);gl.uniform1f(locations.distance,read('distance')||1000);gl.uniform1f(locations.grid,document.getElementById('grid').checked?1:0);
   gl.drawArrays(gl.TRIANGLES,0,3);
   const error=gl.getError();window.calibrationStatus={passed:error===gl.NO_ERROR,webgl2:true,renderer:(()=>{const ext=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER)})(),pixelWidth:w,pixelHeight:h,physicalWidthMm:width,physicalHeightMm:height,heightEstimated:!enteredHeight,eyeDistanceMm:read('distance')||1000,error:error||null};
   status.textContent=error?'Errore WebGL: '+error:'WebGL2 attivo · scena di controllo';
  }
  for(const input of document.querySelectorAll('input'))input.addEventListener('input',draw);
  document.querySelector('#toggle').onclick=()=>{document.querySelector('#panel').classList.toggle('compact');document.querySelector('#toggle').textContent=document.querySelector('#panel').classList.contains('compact')?'+':'−';};
  addEventListener('resize',draw);draw();
})();
