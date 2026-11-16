// Reconstruct a surface from the actual, immutable grain IDs. This is a finite
// 128^3 density reconstruction, not a UV envelope or a second procedural shape.
// The only GPU readback is the final min/max pair (32 bytes) used to bound the
// number of adjacent slices deposited by every grain. No grains are decimated.
const RESOLUTION=128,COLUMNS=16,ROWS=8,PITCH=RESOLUTION+2;
const screen=`#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;
const precision=`precision highp float;precision highp int;precision highp sampler2D;`;

const sampleFragment=grainGLSL=>`#version 300 es
${precision}
${grainGLSL}
uniform sampler2D uSurfaceSeeds;
uniform ivec2 uSurfaceSampleSize;
uniform int uSurfaceCount;
layout(location=0) out vec4 surfacePosition;
layout(location=1) out vec4 surfaceColor;
void main(){
 ivec2 pixel=ivec2(gl_FragCoord.xy);int id=pixel.x+pixel.y*uSurfaceSampleSize.x;
 surfacePosition=vec4(0.);surfaceColor=vec4(0.);
 if(id>=uSurfaceCount)return;
 vec4 seed=grainSeed(uSurfaceSeeds,id);
 vec3 p=attachedPosition(seed,uPhase);
 float diameter=grainDiameter(seed,id),trueSize=diameter*uResolution.y/1080.;
 float radius=trueSize*mix(max(2.,7.5-p.z)/(2.6*uResolution.y),1.7/min(uResolution.x,uResolution.y),uStudioPerspective);
 if(any(isnan(p))||any(isinf(p))||radius<=0.||p.z< -100.)return;
 surfacePosition=vec4(p,radius);
 surfaceColor=vec4(particleColor(seed,p)*cellLightFactor(seed),1.);
}`;

const reduceFragment=`#version 300 es
${precision}
uniform sampler2D uSurfaceLow,uSurfaceHigh;
uniform ivec2 uSurfaceInputSize;
uniform int uSurfaceFirst;
layout(location=0) out vec4 minimumPoint;
layout(location=1) out vec4 maximumPoint;
void main(){
 ivec2 base=ivec2(gl_FragCoord.xy)*2;
 minimumPoint=vec4(1.e30);maximumPoint=vec4(-1.e30);
 for(int y=0;y<2;y++)for(int x=0;x<2;x++){
  ivec2 p=base+ivec2(x,y);if(any(greaterThanEqual(p,uSurfaceInputSize)))continue;
  vec4 lo=texelFetch(uSurfaceLow,p,0),hi=uSurfaceFirst==1?lo:texelFetch(uSurfaceHigh,p,0);
  if(uSurfaceFirst==1&&lo.w<=0.)continue;
  minimumPoint=min(minimumPoint,lo);maximumPoint=max(maximumPoint,hi);
 }
}`;

const splatVertex=`#version 300 es
${precision}
uniform sampler2D uSurfacePositions,uSurfaceColors;
uniform ivec2 uSurfaceSampleSize;
uniform vec3 uSurfaceMin;
uniform vec4 uSurfaceGrid;
uniform int uSurfaceSliceCount,uSurfaceSliceHalf;
flat out vec3 vCenter,vPigment;
flat out float vRadius;
flat out int vSlice;
void main(){
 int id=gl_InstanceID/uSurfaceSliceCount,offset=gl_InstanceID%uSurfaceSliceCount-uSurfaceSliceHalf;
 ivec2 pixel=ivec2(id%uSurfaceSampleSize.x,id/uSurfaceSampleSize.x);
 vec4 samplePoint=texelFetch(uSurfacePositions,pixel,0);
 vCenter=(samplePoint.xyz-uSurfaceMin)/uSurfaceGrid.x;
 vRadius=max(uSurfaceGrid.y,(samplePoint.w*uSurfaceGrid.z+uSurfaceGrid.w)/uSurfaceGrid.x);
 vSlice=int(floor(vCenter.z))+offset;
 vPigment=texelFetch(uSurfaceColors,pixel,0).rgb;
 int vertex=gl_VertexID%6;
 vec2 corner=vertex==0?vec2(-1.,-1.):vertex==1?vec2(1.,-1.):vertex==2?vec2(-1.,1.):vertex==3?vec2(-1.,1.):vertex==4?vec2(1.,-1.):vec2(1.,1.);
 vec2 tile=vec2(vSlice%${COLUMNS},vSlice/${COLUMNS});
 // Grid samples occupy texel centres; one clear guard texel prevents filtering
 // between unrelated atlas slices. Slice clipping is repeated in the fragment.
 vec2 atlas=tile*${PITCH}.+vec2(1.5)+vCenter.xy+corner*(vRadius+1.);
 gl_Position=vec4(atlas/vec2(${PITCH*COLUMNS}.,${PITCH*ROWS}.)*2.-1.,0.,1.);
 if(samplePoint.w<=0.||vSlice<0||vSlice>=${RESOLUTION}||abs(float(vSlice)-vCenter.z)>vRadius)
  gl_Position=vec4(2.,2.,2.,1.);
}`;

const splatFragment=`#version 300 es
${precision}
flat in vec3 vCenter,vPigment;
flat in float vRadius;
flat in int vSlice;
uniform float uSurfaceDepositScale;
out vec4 color;
void main(){
 vec2 tile=vec2(vSlice%${COLUMNS},vSlice/${COLUMNS});
 vec2 grid=gl_FragCoord.xy-tile*${PITCH}.-vec2(1.5);
 if(any(lessThan(grid,vec2(0.)))||any(greaterThan(grid,vec2(${RESOLUTION-1}.))))discard;
 vec3 d=vec3(grid,float(vSlice))-vCenter;
 float r2=dot(d,d)/(vRadius*vRadius);if(r2>=1.)discard;
 float kernel=pow(1.-r2,3.);
 color=vec4(vPigment*kernel,kernel)*uSurfaceDepositScale;
}`;

// Bridge only short gaps bounded on both sides by projected grains. This fills
// the interior without the outward expansion of a dilation or blur.
const footprintFragment=`#version 300 es
${precision}
uniform sampler2D uFootprintSource;
uniform ivec2 uFootprintStep;
uniform int uFootprintRadius;
uniform float uFootprintRaw,uFootprintGain;
out vec4 color;
vec2 footprint(ivec2 pixel){
 if(any(lessThan(pixel,ivec2(0)))||any(greaterThanEqual(pixel,textureSize(uFootprintSource,0))))return vec2(0.);
 vec4 value=texelFetch(uFootprintSource,pixel,0);
 if(uFootprintRaw<.5)return value.rg;
 float light=max(value.r,max(value.g,value.b));
 float present=smoothstep(.0009,.006,max(light,value.a*.12)*uFootprintGain);
 return vec2(present);
}
void main(){
 ivec2 pixel=ivec2(gl_FragCoord.xy);
 vec2 center=footprint(pixel);
 float left=0.,right=0.,density=center.y*float(uFootprintRadius+1);
 for(int offset=1;offset<=5;offset++){
  if(offset>uFootprintRadius)break;
  vec2 a=footprint(pixel-uFootprintStep*offset),b=footprint(pixel+uFootprintStep*offset);
  left=max(left,a.x);right=max(right,b.x);
  density+=(a.y+b.y)*float(uFootprintRadius+1-offset);
 }
 float width=float(uFootprintRadius+1);
 color=vec4(max(center.x,min(left,right)),density/(width*width),0.,1.);
}`;

const marchFragment=(grainGLSL,linear)=>`#version 300 es
${precision}
${grainGLSL}
uniform sampler2D uSurfaceDensity,uGrainImage,uGrainFootprint;
uniform vec3 uSurfaceMin,uSurfaceMax;
uniform float uSurfaceVoxel,uSurfaceAmount,uSurfaceIso;
uniform float uGrainImageGain;
uniform vec4 uSurfaceViewport;
uniform float uSurfacePass,uSurfaceShadowHeight;
uniform vec3 uSurfaceShadowLight;
out vec4 color;
vec4 surfaceSlice(vec2 xy,int z){
 xy=clamp(xy,vec2(0.),vec2(${RESOLUTION-1}.));z=clamp(z,0,${RESOLUTION-1});
 ivec2 tile=ivec2(z%${COLUMNS},z/${COLUMNS})*${PITCH}+ivec2(1);
 ${linear?`return texture(uSurfaceDensity,(vec2(tile)+xy+.5)/vec2(${PITCH*COLUMNS}.,${PITCH*ROWS}.));`:`ivec2 a=ivec2(floor(xy)),b=min(a+1,ivec2(${RESOLUTION-1}));vec2 f=fract(xy);
 return mix(mix(texelFetch(uSurfaceDensity,tile+a,0),texelFetch(uSurfaceDensity,tile+ivec2(b.x,a.y),0),f.x),mix(texelFetch(uSurfaceDensity,tile+ivec2(a.x,b.y),0),texelFetch(uSurfaceDensity,tile+b,0),f.x),f.y);`}
}
vec4 surfaceField(vec3 p){
 vec3 q=(p-uSurfaceMin)/uSurfaceVoxel;
 if(any(lessThan(q,vec3(0.)))||any(greaterThan(q,vec3(${RESOLUTION-1}.))))return vec4(0.);
 int z=int(floor(q.z));return mix(surfaceSlice(q.xy,z),surfaceSlice(q.xy,z+1),fract(q.z));
}
bool surfaceInterval(vec3 origin,vec3 direction,vec3 low,vec3 high,out vec2 span){
 span=vec2(-1.e30,1.e30);
 for(int axis=0;axis<3;axis++){
  if(abs(direction[axis])<1.e-9){if(origin[axis]<low[axis]||origin[axis]>high[axis])return false;}
  else{vec2 t=vec2(low[axis]-origin[axis],high[axis]-origin[axis])/direction[axis];span.x=max(span.x,min(t.x,t.y));span.y=min(span.y,max(t.x,t.y));}
 }
 span.x=max(0.,span.x);return span.y>=span.x;
}
bool surfaceHit(vec3 origin,vec3 direction,vec3 low,vec3 high,out vec3 hit){
 vec2 span;if(!surfaceInterval(origin,direction,low,high,span))return false;
 // A half-voxel step resolves the compact reconstruction kernel. The longest
 // possible diagonal of this cubic atlas needs fewer than 444 steps.
 float stride=uSurfaceVoxel*.5,last=span.x,t=span.x;
 for(int i=0;i<448;i++){
  if(surfaceField(origin+direction*t).a>=uSurfaceIso){
   float a=last,b=t;for(int refine=0;refine<7;refine++){float m=(a+b)*.5;if(surfaceField(origin+direction*m).a>=uSurfaceIso)b=m;else a=m;}
   hit=origin+direction*((a+b)*.5);return true;
  }
  if(t>=span.y)break;last=t;t=min(span.y,t+stride);
 }
 return false;
}
void cameraRay(vec2 ndc,out vec3 origin,out vec3 direction){
 if(uStudioPerspective>.5){origin=vec3(ndc*uResolution/min(uResolution.x,uResolution.y)*1.7,uSurfaceMax.z+uSurfaceVoxel);direction=vec3(0.,0.,-1.);}
 else{origin=vec3(0.,0.,7.5);direction=normalize(vec3(ndc*vec2(uResolution.x/uResolution.y,1.)/2.6,-1.));}
}
bool primaryHit(vec2 ndc,out vec3 hit){
 vec3 origin,direction;cameraRay(ndc,origin,direction);
 if(uStudioPerspective>.5)return surfaceHit(origin,direction,uSurfaceMin,uSurfaceMax,hit);
 // project() has a constant-depth near segment above z5.5. Respect that exact
 // existing projection instead of dropping samples when the camera is inside.
 if(uSurfaceMax.z>5.5){
  vec3 nearOrigin=vec3(ndc*vec2(uResolution.x/uResolution.y,1.)*(2./2.6),uSurfaceMax.z+uSurfaceVoxel);
  if(surfaceHit(nearOrigin,vec3(0.,0.,-1.),vec3(uSurfaceMin.xy,max(5.5,uSurfaceMin.z)),uSurfaceMax,hit))return true;
 }
 if(uSurfaceMin.z>=5.5)return false;
 return surfaceHit(origin,direction,uSurfaceMin,vec3(uSurfaceMax.xy,min(5.5,uSurfaceMax.z)),hit);
}
void main(){
 vec2 ndc=(gl_FragCoord.xy-uSurfaceViewport.xy)/uSurfaceViewport.zw*2.-1.;vec3 hit;bool found=false;
 vec4 grains=vec4(0.);
 float footprint=1.;
 if(uSurfacePass<.5){
  ivec2 pixel=ivec2(gl_FragCoord.xy-uSurfaceViewport.xy);
  grains=texelFetch(uGrainImage,pixel,0)*uGrainImageGain;
  vec2 support=texelFetch(uGrainFootprint,pixel,0).rg;
  footprint=support.x*smoothstep(.28,.78,support.y);
  if(footprint<=.001){
   if(grains.a<=0.)discard;
   color=grains;gl_FragDepth=1.;return;
  }
 }
 if(uSurfacePass>1.5){
  vec3 origin=uOpticalOrigin+(uOpticalRight*ndc.x+uOpticalUp*ndc.y)*uOpticalView.x;
  found=surfaceHit(origin,normalize(uOpticalForward),uSurfaceMin,uSurfaceMax,hit);
 }else if(uSurfacePass>.5){
  vec3 origin,direction;cameraRay(ndc,origin,direction);
  if(abs(direction.y)<1.e-7)discard;
  float t=(uSurfaceShadowHeight-origin.y)/direction.y;if(t<=0.)discard;
  vec3 receiver=origin+direction*t,lightRay=normalize(receiver-uSurfaceShadowLight);
  found=surfaceHit(uSurfaceShadowLight,lightRay,uSurfaceMin,uSurfaceMax,hit);
  if(found&&(hit.y<=uSurfaceShadowHeight||distance(hit,uSurfaceShadowLight)>=distance(receiver,uSurfaceShadowLight)))found=false;
 }else found=primaryHit(ndc,hit);
 if(!found){
  if(grains.a<=0.)discard;
  color=grains;gl_FragDepth=1.;return;
 }
 float alpha=clamp(uSurfaceAmount*uFinish.z*footprint,0.,1.);
 if(uSurfacePass>1.5){
  float depth=clamp(opticalCoordinate(hit).z,0.,.999999);gl_FragDepth=depth;
  vec3 packed=fract(depth*vec3(1.,255.,65025.));packed-=packed.yzz*vec3(1./255.,1./255.,0.);
  color=vec4(packed,alpha);return;
 }
 gl_FragDepth=footprint<.4?1.:clamp(project(hit).z*.5+.5,0.,1.);
 if(uSurfacePass>.5){float a=1.-exp(-alpha);color=vec4(vec3(a),a);return;}
 vec3 e=vec3(uSurfaceVoxel*.5,0.,0.);
 vec3 gradient=vec3(surfaceField(hit+e.xyy).a-surfaceField(hit-e.xyy).a,surfaceField(hit+e.yxy).a-surfaceField(hit-e.yxy).a,surfaceField(hit+e.yyx).a-surfaceField(hit-e.yyx).a);
 vec3 normal=-gradient/max(1.e-10,length(gradient));
 vec4 field=surfaceField(hit);vec3 base=field.rgb/max(1.e-20,field.a);
 color=grains*(1.-alpha)+vec4(shadeParticle(base,hit,normal)*alpha,alpha);
}`;

// Pure planning helper: no camera-origin guess and no omission of distant jets.
export function particleSurfaceGrid(low,high,maxRadius,state={}){
 const radiusScale=Math.max(.01,Number(state.pSkinScale??1));
 const thickness=Math.max(0,Number(state.pSkinThickness)||0)*Math.abs(Number(state.scale)||1);
 const extent=high.map((v,i)=>Math.max(1.e-7,v-low[i])),span=Math.max(1.e-5,...extent);
 const count=Math.max(1,Math.round(state.pCount||1)),fill=Math.max(0,Math.min(1,state.pFill??1));
 const axes=extent.map(v=>v*.5),power=1.6075;
 const area=4*Math.PI*Math.pow((Math.pow(axes[0]*axes[1],power)+Math.pow(axes[0]*axes[2],power)+Math.pow(axes[1]*axes[2],power))/3,1/power);
 const volume=4*Math.PI*axes[0]*axes[1]*axes[2]/3;
 const spacing=Math.sqrt(area/count)*(1-fill)+Math.cbrt(volume/count)*fill;
 const initialVoxel=Math.max((span+2*(Math.max(0,maxRadius)*radiusScale+thickness))/(RESOLUTION-5),1.e-6);
 // Reconstruction bandwidth follows the actual sample spacing. A compact
 // polynomial kernel needs twice its bandwidth as support radius. Limit only
 // this automatic cohesion, never the authored size/thickness or grain count.
 const cohesion=Math.min(10*initialVoxel,2*.8*spacing*radiusScale);
 const physical=Math.max(Math.max(0,maxRadius)*radiusScale,cohesion)+thickness;
 const voxel=Math.max((span+2*physical)/(RESOLUTION-5),1.e-6);
 const minimumKernelVoxels=Math.max(1.6,(cohesion+thickness)/voxel);
 const support=Math.max(minimumKernelVoxels*voxel,physical),side=voxel*(RESOLUTION-1);
 const center=low.map((v,i)=>(v+high[i])*.5),minimum=center.map(v=>v-side*.5),maximum=center.map(v=>v+side*.5);
 const sliceHalf=Math.ceil(support/voxel)+1,sliceCount=Math.min(RESOLUTION,2*sliceHalf+1);
 return {minimum,maximum,voxel,support,radiusScale,thickness,sliceHalf,sliceCount,minimumKernelVoxels,spacing,cohesion};
}

export class ParticleSurface{
 constructor(owner,grainGLSL){
  this.owner=owner;this.gl=owner.gl;this.targets=[];this.reductions=[];this.samples=null;this.stats=null;
  const g=this.gl;
  if(!owner.float)throw Error('La superficie dei granelli richiede buffer GPU in virgola mobile (EXT_color_buffer_float).');
  this.floatBlend=!!g.getExtension('EXT_float_blend');
  // Half-float blending is available with color-buffer-float. Normalize its
  // deposition and iso value together, avoiding overflow without removing IDs.
  // Its lower precision is reported in stats instead of pretending to be32F.
  this.linear=this.floatBlend?!!g.getExtension('OES_texture_float_linear'):true;
  this.sampleProgram=owner.program(screen,sampleFragment(grainGLSL));
  this.reduceProgram=owner.program(screen,reduceFragment);
  this.splatProgram=owner.program(splatVertex,splatFragment);
  this.footprintProgram=owner.program(screen,footprintFragment);
  this.marchProgram=owner.program(screen,marchFragment(grainGLSL,this.linear),null,true);
 }
 get programs(){return [this.sampleProgram,this.reduceProgram,this.splatProgram,this.footprintProgram,this.marchProgram];}
 prepare(){return this.programs;}
 target(width,height,formats,linear=false){
  const g=this.gl,fbo=g.createFramebuffer(),textures=[];g.bindFramebuffer(g.FRAMEBUFFER,fbo);
  for(let i=0;i<formats.length;i++){
   const texture=g.createTexture();textures.push(texture);g.bindTexture(g.TEXTURE_2D,texture);
   const format=formats[i],type=format===g.RG8?g.UNSIGNED_BYTE:format===g.RGBA16F?g.HALF_FLOAT:g.FLOAT;
   g.texImage2D(g.TEXTURE_2D,0,format,width,height,0,format===g.RG8?g.RG:g.RGBA,type,null);
   for(const key of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,key,linear?g.LINEAR:g.NEAREST);
   for(const key of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,key,g.CLAMP_TO_EDGE);
   g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0+i,g.TEXTURE_2D,texture,0);
  }
  g.drawBuffers(textures.map((_,i)=>g.COLOR_ATTACHMENT0+i));
  if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE){for(const t of textures)g.deleteTexture(t);g.deleteFramebuffer(fbo);throw Error('Buffer superficie dei granelli non disponibile.');}
  const result={fbo,textures,texture:textures[0],w:width,h:height,bytes:width*height*formats.reduce((n,f)=>n+(f===g.RG8?2:f===g.RGBA16F?8:16),0)};this.targets.push(result);return result;
 }
 allocate(count){
  const g=this.gl,width=Math.min(1024,g.getParameter(g.MAX_TEXTURE_SIZE)),height=Math.ceil(count/width);
  if(height>g.getParameter(g.MAX_TEXTURE_SIZE))throw Error('Troppi granelli per la memoria delle coordinate GPU.');
  if(this.sampleTarget?.w===width&&this.sampleTarget?.h===height)return;
  this.release();this.sampleTarget=this.target(width,height,[g.RGBA32F,g.RGBA16F]);
  let w=width,h=height;
  do{w=Math.max(1,Math.ceil(w/2));h=Math.max(1,Math.ceil(h/2));this.reductions.push(this.target(w,h,[g.RGBA32F,g.RGBA32F]));}while(w>1||h>1);
  this.density=this.target(PITCH*COLUMNS,PITCH*ROWS,[this.floatBlend?g.RGBA32F:g.RGBA16F],this.linear);
 }
 projectFootprint(width,height,opacity,drawGrains){
  const o=this.owner,g=this.gl;
  if(!this.grainImage){
   this.grainImage=this.target(width,height,[g.RGBA16F]);
   this.footprintTargets=[this.target(width,height,[g.RG8]),this.target(width,height,[g.RG8])];
  }
  // A small reference opacity keeps the footprint usable for materials whose
  // grain opacity is zero. Only the authored opacity reaches the final image.
  const reference=Math.max(.05,opacity);
  o.bind(this.grainImage);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);
  g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE);
  drawGrains(reference);
  const radius=Math.max(1,Math.min(5,Math.round(Math.min(width,height)/144)));
  const program=this.footprintProgram;
  g.disable(g.BLEND);g.bindVertexArray(o.empty);g.useProgram(program.program);
  for(const [axis,destination] of this.footprintTargets.entries()){
   o.bind(destination);
   o.tex(program,'uFootprintSource',(axis===0?this.grainImage:this.footprintTargets[0]).texture,0);
   g.uniform2i(o.loc(program,'uFootprintStep'),1-axis,axis);
   g.uniform1i(o.loc(program,'uFootprintRadius'),radius);
   o.u(program,'uFootprintRaw',1-axis);o.u(program,'uFootprintGain',1/reference);
   g.drawArrays(g.TRIANGLES,0,3);
  }
  return opacity/reference;
 }
 draw(s,phase,options={},drawGrains){
  const amount=options.particleSurfaceMix??s._cloudSurfaceMix??1,count=Math.max(0,Math.round(s.pCount||0));
  if(!(amount>0)||!count)return false;
  if(options.cancelled?.())return false;
  const o=this.owner,g=this.gl;
  const previous={draw:g.getParameter(g.DRAW_FRAMEBUFFER_BINDING),read:g.getParameter(g.READ_FRAMEBUFFER_BINDING),readBuffer:g.getParameter(g.READ_BUFFER),viewport:g.getParameter(g.VIEWPORT),vao:g.getParameter(g.VERTEX_ARRAY_BINDING),program:g.getParameter(g.CURRENT_PROGRAM),depth:g.isEnabled(g.DEPTH_TEST),depthFunc:g.getParameter(g.DEPTH_FUNC),depthMask:g.getParameter(g.DEPTH_WRITEMASK),blend:g.isEnabled(g.BLEND),srcRGB:g.getParameter(g.BLEND_SRC_RGB),dstRGB:g.getParameter(g.BLEND_DST_RGB),srcAlpha:g.getParameter(g.BLEND_SRC_ALPHA),dstAlpha:g.getParameter(g.BLEND_DST_ALPHA),equationRGB:g.getParameter(g.BLEND_EQUATION_RGB),equationAlpha:g.getParameter(g.BLEND_EQUATION_ALPHA),cull:g.isEnabled(g.CULL_FACE),scissor:g.isEnabled(g.SCISSOR_TEST),mask:g.getParameter(g.COLOR_WRITEMASK),activeTexture:g.getParameter(g.ACTIVE_TEXTURE)};
  const toggle=(cap,on)=>on?g.enable(cap):g.disable(cap);
  try{
   this.allocate(count);g.bindVertexArray(o.empty);g.disable(g.DEPTH_TEST);g.depthMask(false);g.disable(g.BLEND);g.disable(g.CULL_FACE);g.disable(g.SCISSOR_TEST);g.colorMask(true,true,true,true);
   const sample=this.sampleProgram;o.bind(this.sampleTarget);o.settings(sample,s,phase);o.tex(sample,'uSurfaceSeeds',o.seedTexture,2);
   g.uniform2i(o.loc(sample,'uSurfaceSampleSize'),this.sampleTarget.w,this.sampleTarget.h);g.uniform1i(o.loc(sample,'uSurfaceCount'),count);g.drawArrays(g.TRIANGLES,0,3);
   let input=this.sampleTarget;
   const reduce=this.reduceProgram;g.useProgram(reduce.program);
   for(let i=0;i<this.reductions.length;i++){
    const output=this.reductions[i];o.bind(output);o.tex(reduce,'uSurfaceLow',input.textures[0],0);o.tex(reduce,'uSurfaceHigh',input.textures[i===0?0:1],1);
    g.uniform2i(o.loc(reduce,'uSurfaceInputSize'),input.w,input.h);g.uniform1i(o.loc(reduce,'uSurfaceFirst'),i===0?1:0);g.drawArrays(g.TRIANGLES,0,3);input=output;
   }
   const low=new Float32Array(4),high=new Float32Array(4),readStart=performance.now();
   g.bindFramebuffer(g.READ_FRAMEBUFFER,input.fbo);g.readBuffer(g.COLOR_ATTACHMENT0);g.readPixels(0,0,1,1,g.RGBA,g.FLOAT,low);g.readBuffer(g.COLOR_ATTACHMENT1);g.readPixels(0,0,1,1,g.RGBA,g.FLOAT,high);
   const boundsReadbackMs=performance.now()-readStart;
   this.samples={positionTexture:this.sampleTarget.textures[0],colorTexture:this.sampleTarget.textures[1],width:this.sampleTarget.w,height:this.sampleTarget.h,count,bounds:null};
   if(!low.every(Number.isFinite)||!high.every(Number.isFinite))throw Error('Coordinate non finite nella superficie dei granelli.');
   if(high[3]<=0.||low[0]>high[0])return false;
   const grid=particleSurfaceGrid(Array.from(low.slice(0,3)),Array.from(high.slice(0,3)),high[3],s);this.samples.bounds={lo:grid.minimum,hi:grid.maximum,centersLo:Array.from(low.slice(0,3)),centersHi:Array.from(high.slice(0,3))};
   const depositScale=this.floatBlend?1:1/Math.max(1,count);
   const grainImageGain=drawGrains?this.projectFootprint(previous.viewport[2],previous.viewport[3],s._cloudGrainOpacity,drawGrains):0;
   this.stats={count,gridResolution:RESOLUTION,slicesPerGrain:grid.sliceCount,boundsReadbackMs,allocatedBytes:this.targets.reduce((sum,t)=>sum+t.bytes,0),voxelSize:grid.voxel,minimumKernelVoxels:grid.minimumKernelVoxels,estimatedSpacing:grid.spacing,cohesion:grid.cohesion,densityFormat:this.floatBlend?'RGBA32F':'RGBA16F',depositScale,decimated:false};
   if(options.cancelled?.())return false;
   o.bind(this.density);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.enable(g.BLEND);g.blendEquation(g.FUNC_ADD);g.blendFunc(g.ONE,g.ONE);
   const splat=this.splatProgram;g.useProgram(splat.program);o.tex(splat,'uSurfacePositions',this.samples.positionTexture,0);o.tex(splat,'uSurfaceColors',this.samples.colorTexture,1);
   g.uniform2i(o.loc(splat,'uSurfaceSampleSize'),this.samples.width,this.samples.height);o.u(splat,'uSurfaceMin',...grid.minimum);o.u(splat,'uSurfaceGrid',grid.voxel,grid.minimumKernelVoxels,grid.radiusScale,grid.thickness);
   g.uniform1i(o.loc(splat,'uSurfaceSliceCount'),grid.sliceCount);g.uniform1i(o.loc(splat,'uSurfaceSliceHalf'),grid.sliceHalf);
   o.u(splat,'uSurfaceDepositScale',depositScale);
   g.drawArraysInstanced(g.TRIANGLES,0,6,count*grid.sliceCount);
   g.bindFramebuffer(g.DRAW_FRAMEBUFFER,previous.draw);g.viewport(...previous.viewport);g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.depthMask(true);g.disable(g.BLEND);
   const march=this.marchProgram;
   o.settings(march,s,phase);
   o.tex(march,'uSurfaceDensity',this.density.texture,3);
   o.u(march,'uSurfaceMin',...grid.minimum);o.u(march,'uSurfaceMax',...grid.maximum);
   o.u(march,'uSurfaceVoxel',grid.voxel);o.u(march,'uSurfaceAmount',amount);
   // A nearly full kernel contribution is needed to form a surface. Isolated
   // grains remain in the projected grain image instead of becoming spheres.
   o.u(march,'uSurfaceIso',.92*depositScale);
   o.u(march,'uSurfaceViewport',...previous.viewport);
   o.u(march,'uSurfacePass',o.shadowPass?(o.shadowPass.mode||1):0);o.u(march,'uSurfaceShadowHeight',s.pShadowHeight??-1.6);const light=o.shadowPass?.light;o.u(march,'uSurfaceShadowLight',light?.x||0,light?.y||0,light?.z||0);
   o.tex(march,'uGrainImage',this.grainImage?.texture||this.density.texture,0);
   o.tex(march,'uGrainFootprint',this.footprintTargets?.[1].texture||this.density.texture,1);
   o.u(march,'uGrainImageGain',grainImageGain);
   g.drawArrays(g.TRIANGLES,0,3);return true;
  }finally{
   g.bindFramebuffer(g.DRAW_FRAMEBUFFER,previous.draw);g.bindFramebuffer(g.READ_FRAMEBUFFER,previous.read);g.readBuffer(previous.readBuffer);g.viewport(...previous.viewport);g.bindVertexArray(previous.vao);g.useProgram(previous.program);toggle(g.DEPTH_TEST,previous.depth);g.depthFunc(previous.depthFunc);g.depthMask(previous.depthMask);toggle(g.BLEND,previous.blend);g.blendFuncSeparate(previous.srcRGB,previous.dstRGB,previous.srcAlpha,previous.dstAlpha);g.blendEquationSeparate(previous.equationRGB,previous.equationAlpha);toggle(g.CULL_FACE,previous.cull);toggle(g.SCISSOR_TEST,previous.scissor);g.colorMask(...previous.mask);g.activeTexture(previous.activeTexture);
  }
 }
 release(){const g=this.gl;for(const target of this.targets){for(const t of target.textures)g.deleteTexture(t);g.deleteFramebuffer(target.fbo);}this.targets=[];this.reductions=[];this.sampleTarget=this.density=this.samples=this.grainImage=this.footprintTargets=null;}
 dispose(){this.release();for(const p of this.programs){this.owner.pendingPrograms.delete(p);this.gl.deleteProgram(p.program);}}
}
