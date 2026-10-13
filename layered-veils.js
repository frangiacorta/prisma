import {makeVeilMesh,updateVeilMesh} from './veil-geometry.js?v=9259421b472f';
export class LayeredVeils{
 constructor(owner,common){this.owner=owner;const gl=this.gl=owner.gl;this.program=owner.program(`#version 300 es
precision highp float;precision highp int;
${common}
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec3 aUV;
out vec3 vPosition,vNormal,vUV;
void main(){vPosition=aPosition;vNormal=aNormal;vUV=aUV;gl_Position=project(aPosition);}`,`#version 300 es
precision highp float;precision highp int;
${common}
in vec3 vPosition,vNormal,vUV;out vec4 color;
uniform vec4 uVeilMaterial;uniform vec4 uVeilColor;
void main(){
 if(vUV.z<0.){if(uVeilColor.z<=0.)discard;float a=uVeilColor.z;float shade=.012+.012*abs(normalize(vNormal).z);color=vec4(vec3(shade)*a,a);return;}
 float border=1.-vUV.y;if(uVeilColor.x<.5||uVeilColor.x>1.5)border=min(border,min(vUV.x,1.-vUV.x));
 float feather=max(fwidth(border),uVeilMaterial.z),coverage=smoothstep(0.,feather,border);
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 float grazing=pow(1.-abs(dot(n,normalize(vec3(0,0,7.5)-vPosition))),2.);
 float rim=exp(-border*80.);
 float density=uVeilMaterial.x*(1.+uVeilMaterial.y*(grazing*1.2+rim*2.));
 float core=uVeilColor.w>0.?1.-smoothstep(0.,uVeilColor.w*2.,vUV.y):0.;
 float alpha=clamp(density+core*uVeilColor.z*.85,0.,.98)*coverage*uFinish.z;
 vec3 coord=vec3((vUV.y-.5)*4.+vUV.z*uVeilColor.y,0.,0.);
 vec3 base=prismaPalette(coord,vec3(1.));base*=1.-core*uVeilColor.z*.995;
 vec3 lit=shadeParticle(base,vPosition,n)*(1.-uVeilMaterial.y*rim*.3);
 color=vec4(lit*alpha,alpha);
}`);this.vao=gl.createVertexArray();this.buffer=gl.createBuffer();this.indices=gl.createBuffer();gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(let k=0;k<3;k++){gl.enableVertexAttribArray(k);gl.vertexAttribPointer(k,3,gl.FLOAT,false,36,k*12);}gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);gl.bindVertexArray(null);}
 draw(s,phase,options={}){const gl=this.gl,o=this.owner,p=this.program,layers=Math.round(s.pVeilLayers),start=performance.now();const low=options.preview&&Math.min(o.width,o.height)<700,columns=low?64:96,rows=low?28:40;if(this.mesh?.layers!==layers||this.mesh?.columns!==columns){this.mesh=makeVeilMesh(layers,columns,rows);this.key='';}
 const key=JSON.stringify([phase,...Object.entries(s).filter(([k])=>k.startsWith('pVeil')||['scale','volume','stretchX','stretchY','stretchZ','positionX','positionY','rotateX','rotateY','rotateZ'].includes(k))]);
 gl.bindVertexArray(this.vao);if(key!==this.key){updateVeilMesh(this.mesh,s,phase);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.mesh.vertices,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.mesh.indices,gl.DYNAMIC_DRAW);this.key=key;}
 o.settings(p,s,phase);o.u(p,'uVeilMaterial',s.pVeilOpacity,s.pVeilEdge,s.pVeilFeather,0);o.u(p,'uVeilColor',s.pVeilStyle,s.pVeilLayerColor,s.pVeilCoreRadius>0?s.pVeilCoreDark:0,s.pVeilCoreRadius);
 gl.disable(gl.CULL_FACE);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawElements(gl.TRIANGLES,this.mesh.indices.length,gl.UNSIGNED_INT,0);gl.depthMask(true);gl.blendFunc(gl.ONE,gl.ONE);this.milliseconds=performance.now()-start;
 }
 dispose(){const g=this.gl;g.deleteProgram(this.program.program);g.deleteBuffer(this.buffer);g.deleteBuffer(this.indices);g.deleteVertexArray(this.vao);}
}
