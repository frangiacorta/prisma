import {LivingStructures} from './living-structures.js?v=448bee33b8b9';
import {VEIL_SOURCE_KEYS,extractVeilSource,makeSourceVeilMesh,updateSourceVeilMesh,sampleLivingVeilSource} from './veil-source.js?v=448bee33b8b9';
import {makeVeilMesh,updateVeilMesh} from './veil-geometry.js?v=448bee33b8b9';
export class LayeredVeils{
 constructor(owner,common){this.common=common;this.owner=owner;const gl=this.gl=owner.gl;this.program=owner.program(`#version 300 es
precision highp float;precision highp int;
${common}
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec3 aUV;layout(location=3) in float aValid;
out vec3 vPosition,vNormal,vUV;out float vValid;uniform float uVeilMorph;uniform float uVeilSourceKind;
void main(){vValid=aValid;vPosition=dynamicsForward(aPosition);vec3 axis=abs(aNormal.y)<.9?vec3(0,1,0):vec3(1,0,0),u=normalize(cross(aNormal,axis)),v=cross(aNormal,u);vec3 warpedNormal=cross(dynamicsForward(aPosition+u*.002)-vPosition,dynamicsForward(aPosition+v*.002)-vPosition);vNormal=uDynAmount>0.&&length(warpedNormal)>.00000001?normalize(warpedNormal):aNormal;vUV=aUV;gl_Position=project(vPosition);vec2 original=vPosition.xy*min(uResolution.x,uResolution.y)/uResolution/1.7;if(uShadowPass<.5)gl_Position.xy=mix(original,gl_Position.xy,uVeilSourceKind>0.?1.:uVeilMorph);}`,`#version 300 es
precision highp float;precision highp int;
${common}
in vec3 vPosition,vNormal,vUV;in float vValid;out vec4 color;
uniform float uVeilMorph;
uniform float uVeilDetails;
uniform vec4 uVeilMaterial;uniform vec4 uVeilColor;
void main(){
 if(dynamicsBarrier(vPosition)>.0001)discard;
 if(vUV.z<0.){if(uVeilColor.z<=0.)discard;float a=uVeilColor.z;float shade=.012+.012*abs(normalize(vNormal).z);color=vec4(vec3(shade)*a,a);return;}
 float radial=1.-vUV.y,side=min(radial,min(vUV.x,1.-vUV.x));float border=mix(side,radial,1.-abs(uVeilColor.x-1.));
 float feather=max(fwidth(border),uVeilMaterial.z),coverage=smoothstep(0.,feather,border);
 coverage=mix(1.,coverage,uVeilMorph);
 vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
 float grazing=pow(1.-abs(dot(n,normalize(vec3(0,0,7.5)-vPosition))),2.);
 float rim=exp(-border*80.);
 float density=uVeilMaterial.x*(1.+uVeilMaterial.y*(grazing*1.2+rim*2.));
 float core=uVeilColor.w>0.?1.-smoothstep(0.,uVeilColor.w*2.,vUV.y):0.;
 float alpha=clamp(density+core*uVeilColor.z*.85,0.,.98)*coverage*uFinish.z;
 float handover=smoothstep(.15,.8,uVeilMorph);
 float surface=vValid<-.5?1.:0.;
 float weight=uVeilDetails>.5?mix(handover,1.-handover,surface):1.;
 alpha=mix(uFinish.z,alpha,uVeilMorph)*mix(abs(vValid),1.,uVeilMorph)*weight;
 vec3 coord=vec3((vUV.y-.5)*4.+vUV.z*uVeilColor.y,0.,0.);
 vec3 base=prismaPalette(coord,vec3(1.));base*=1.-core*uVeilColor.z*.995*uVeilMorph;
 base=mix(prismaPalette(vPosition,vec3(1.)),base,uVeilMorph);
 vec3 lit=shadeParticle(base,vPosition,n)*(1.-uVeilMaterial.y*rim*.3);
 color=vec4(lit*alpha,alpha);
}`,null,true);this.vao=gl.createVertexArray();this.buffer=gl.createBuffer();this.indices=gl.createBuffer();this.validBuffer=gl.createBuffer();gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(let k=0;k<3;k++){gl.enableVertexAttribArray(k);gl.vertexAttribPointer(k,3,gl.FLOAT,false,36,k*12);}gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);gl.bindVertexArray(null);}
 draw(s,phase,options={}){const gl=this.gl,o=this.owner,p=this.program,layers=Math.round(s.pVeilLayers),start=performance.now();if(!o.shadowPass&&!o.reuseGeometry){const low=options.preview&&Math.min(o.width,o.height)<700,columns=low?64:96,rows=low?28:40;if(!s.pVeilFromForm&&(this.mesh?.source||this.mesh?.layers!==layers||this.mesh?.columns!==columns)){this.mesh=makeVeilMesh(layers,columns,rows);this.key='';}
 if(s.pVeilFromForm&&s.pVeilSourceKind>0){this.sourceLiving??=new LivingStructures(o,this.common);const base={...s,pLiving:s.pVeilSourceKind===4?3:s.pVeilSourceKind};for(const k of Object.keys(base))if(k.startsWith('pVeil'))delete base[k];this.sourceLiving.sample({...base,dynAmount:0,_dynamics:null},phase);if(!this.liveMesh||this.liveMesh.layers!==layers||this.liveMesh.columns!==columns){this.liveMesh=makeVeilMesh(layers,columns,rows);this.liveMesh.source=true;this.liveMesh.origins=new Float32Array(this.liveMesh.coords.length);this.liveMesh.valid=new Float32Array(this.liveMesh.coords.length/3).fill(1);}sampleLivingVeilSource(this.liveMesh,this.sourceLiving);this.mesh=this.liveMesh;this.key='';}

 else if(s.pVeilFromForm){
  const details=s.pVeilMorph<.8,sourceKey=JSON.stringify([!!options.preview,...VEIL_SOURCE_KEYS.map(k=>s[k])]);
  if(sourceKey!==this.sourceKey){this.source=extractVeilSource(s,options.preview?24:40);this.sourceKey=sourceKey;this.sourceMeshes=new Map();}
  const meshKey=[layers,columns,rows,details].join(':');
  if(!this.sourceMeshes.has(meshKey)){if(this.sourceMeshes.size>=4)this.sourceMeshes.delete(this.sourceMeshes.keys().next().value);this.sourceMeshes.set(meshKey,makeSourceVeilMesh(this.source,layers,s.pVeilStyle,columns,rows,details));}
  const next=this.sourceMeshes.get(meshKey);if(this.mesh!==next)this.key='';this.mesh=next;
 }

 const key=JSON.stringify([phase,s.pVeilFromForm?this.sourceKey:'',...Object.entries(s).filter(([k])=>k.startsWith('pVeil')||['scale','volume','stretchX','stretchY','stretchZ','positionX','positionY','rotateX','rotateY','rotateZ'].includes(k))]);
 gl.bindVertexArray(this.vao);if(s.pVeilFromForm){gl.enableVertexAttribArray(3);gl.bindBuffer(gl.ARRAY_BUFFER,this.validBuffer);if(this.validMesh!==this.mesh){gl.bufferData(gl.ARRAY_BUFFER,this.mesh.valid,gl.STATIC_DRAW);this.validMesh=this.mesh;}gl.vertexAttribPointer(3,1,gl.FLOAT,false,4,0);}else{gl.disableVertexAttribArray(3);gl.vertexAttrib1f(3,1);}
 if(key!==this.key){if(s.pVeilFromForm)updateSourceVeilMesh(this.mesh,s,phase);else updateVeilMesh(this.mesh,s,phase);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.mesh.vertices,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,this.mesh.indices,gl.DYNAMIC_DRAW);this.key=key;}
 }
 gl.bindVertexArray(this.vao);o.settings(p,{...s,transparency:0},phase);o.u(p,'uVeilDetails',this.mesh.detailStart!==undefined?1:0);o.u(p,'uVeilSourceKind',s.pVeilSourceKind||0);o.u(p,'uVeilMorph',s.pVeilFromForm?s.pVeilMorph:1);o.u(p,'uVeilMaterial',s.pVeilOpacity,s.pVeilEdge,s.pVeilFeather,0);o.u(p,'uVeilColor',s.pVeilStyle,s.pVeilLayerColor,s.pVeilCoreRadius>0?s.pVeilCoreDark:0,s.pVeilCoreRadius);
 gl.disable(gl.CULL_FACE);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);o.opticalDrawState?.();gl.drawElements(gl.TRIANGLES,this.mesh.indices.length,gl.UNSIGNED_INT,0);gl.depthMask(true);gl.blendFunc(gl.ONE,o.shadowPass?gl.ONE_MINUS_SRC_ALPHA:gl.ONE);this.milliseconds=performance.now()-start;
 }
 dispose(){this.sourceLiving?.dispose();const g=this.gl;g.deleteProgram(this.program.program);g.deleteBuffer(this.buffer);g.deleteBuffer(this.indices);g.deleteBuffer(this.validBuffer);g.deleteVertexArray(this.vao);}
}
