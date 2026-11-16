// The orbital envelope uses the same position(), clock, fields and material as
// its grains. No solid-state preset is consulted when changing representation.
export class CloudSurface {
 constructor(owner,common){
  this.owner=owner;const gl=this.gl=owner.gl;
  this.program=owner.program(`#version 300 es
precision highp float;precision highp int;
layout(location=0) in vec2 aUV;
${common}
out vec3 vPosition,vNormal;out vec2 vUV;
vec3 envelope(vec2 uv){
 uv.x=fract(uv.x);uv.y=clamp(uv.y,0.,1.);
 // Weld the latitude poles of a sphere, but keep the minor circle of a torus.
 float ring=smoothstep(0.,.45,uShape.z);
 vec4 seed=vec4(uv,1.,.5);
 if(uv.y<.000001||uv.y>.999999)seed.x=mix(.5,uv.x,ring);
 if(ring>=.99999)seed.y=fract(seed.y);
 return position(seed,uPhase);
}
void main(){
 vUV=aUV;vPosition=envelope(aUV);
 vec2 e=vec2(1./256.,1./192.);
 vec3 du=envelope(aUV+vec2(e.x,0.))-envelope(aUV-vec2(e.x,0.));
 vec3 dv=envelope(aUV+vec2(0.,e.y))-envelope(aUV-vec2(0.,e.y));
 vNormal=normalize(cross(du,dv)+vec3(.0000001));
 gl_Position=project(vPosition);
}`,`#version 300 es
precision highp float;precision highp int;
${common}
in vec3 vPosition,vNormal;in vec2 vUV;out vec4 color;uniform float uEnvelopeOpacity;
void main(){
 vec4 seed=vec4(vUV,1.,.5);
 vec3 barrierPoint=guidePixelPosition(gl_FragCoord.xy,vPosition);
 if(dynamicsBarrier(barrierPoint)>.0001||insideForceCore(barrierPoint)||insideGuideCore(barrierPoint,seed,uPhase)||outsideGuidePixel(gl_FragCoord.xy,vPosition,seed,uPhase))discard;
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 float alpha=uEnvelopeOpacity*uFinish.z;
 color=vec4(shadeParticle(particleColor(seed,vPosition),vPosition,n)*alpha,alpha);
}`,null,true);
  const columns=192,rows=128,uv=new Float32Array((columns+1)*(rows+1)*2),indices=new Uint32Array(columns*rows*6);
  for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++)uv.set([x/columns,y/rows],(y*(columns+1)+x)*2);
  for(let y=0,i=0;y<rows;y++)for(let x=0;x<columns;x++){
   const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;indices.set([a,b,d,a,d,c],i);i+=6;
  }
  this.count=indices.length;this.vao=gl.createVertexArray();this.vertices=gl.createBuffer();this.indices=gl.createBuffer();
  gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.vertices);gl.bufferData(gl.ARRAY_BUFFER,uv,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);gl.bindVertexArray(null);
 }
 draw(s,phase){
  const o=this.owner,g=this.gl;o.settings(this.program,s,phase);o.u(this.program,'uEnvelopeOpacity',s._cloudSurfaceMix);
  g.bindVertexArray(this.vao);g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);
  // One visible skin, including at intermediate opacity. Never add the back wall.
  g.depthMask(true);g.colorMask(false,false,false,false);g.enable(g.POLYGON_OFFSET_FILL);g.polygonOffset(1,1);g.drawElements(g.TRIANGLES,this.count,g.UNSIGNED_INT,0);
  g.disable(g.POLYGON_OFFSET_FILL);g.colorMask(true,true,true,true);g.depthMask(false);o.opticalDrawState();g.drawElements(g.TRIANGLES,this.count,g.UNSIGNED_INT,0);
  g.depthMask(true);g.disable(g.DEPTH_TEST);g.blendFunc(g.ONE,o.shadowPass?g.ONE_MINUS_SRC_ALPHA:g.ONE);
 }
 dispose(){const g=this.gl;this.owner.pendingPrograms.delete(this.program);g.deleteProgram(this.program.program);g.deleteVertexArray(this.vao);g.deleteBuffer(this.vertices);g.deleteBuffer(this.indices);}
}
