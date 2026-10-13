import {fieldAt} from './solid-renderer.js?v=3a151b6e1c4a';
import {makeVeilMesh,veilPoint} from './veil-geometry.js?v=3a151b6e1c4a';
// Persistent material coordinates on the outer skin. Inner cavities and
// multiple intersections along the same ray are not a volumetric simulation.
export const VEIL_SOURCE_KEYS=['seed','renderVersion','deform','asymmetry','twist','waves','waveScale','hole','holeX','holeY','holeShape','holeAspect','cut','cutX','cutY','cutAspect','rimRound','roundness','taper','bendX','bendY','lobeAmount','lobes','pinch','petalAmount','petalCount','petalOpen','petalCurl','petalLength','petalWidth','petalInflate','petalSharp','petalCoverage','petalRows','petalPhase','petalBlend','petalRoot','petalRandom','petalGrowth','petalWander','petalCoil','petalReentry','petalKnots','petalRidges','petalDisorder','petalDirectionSpread','petalWeave','petalWeaveTurns','petalFlow','petalFlowPhase','petalOrbitPhase','petalCollision','petalSphereCollision','petalContactGap','petalContactStiffness','petalContactPasses','stemAmount','stemRadius','stemBend'];
const TAU=Math.PI*2;
const localState=s=>({...s,scale:1,volume:1,stretchX:1,stretchY:1,stretchZ:1,positionX:0,positionY:0,rotateX:0,rotateY:0,rotateZ:0});
export function extractVeilSource(s,resolution=32){
 const local=localState(s),columns=resolution*3,rows=resolution*2,radii=new Float32Array((columns+1)*(rows+1)),valid=new Float32Array(radii.length);
 const radius=Math.max(2,1.5+(s.petalAmount||0)*(s.petalLength||1)*1.6,(s.stemAmount||0)*3.5),steps=64;
 for(let y=0;y<=rows;y++)for(let x=0;x<columns;x++){
  const theta=x/columns*TAU,phi=y/rows*Math.PI,d=[Math.sin(phi)*Math.cos(theta),Math.sin(phi)*Math.sin(theta),Math.cos(phi)],at=r=>fieldAt(local,d.map(v=>v*r)),index=y*(columns+1)+x;
  let outer=radius,previous=at(outer),hit=false;
  for(let k=1;k<=steps;k++){const inner=radius*(1-k/steps),value=at(inner);if(previous>=0&&value<0){let a=inner,b=outer;for(let n=0;n<9;n++){const mid=(a+b)/2;if(at(mid)<0)a=mid;else b=mid;}radii[index]=(a+b)/2;valid[index]=1;hit=true;break;}outer=inner;previous=value;}
  if(!hit)radii[index]=0;
 }
 for(let y=0;y<=rows;y++){radii[y*(columns+1)+columns]=radii[y*(columns+1)];valid[y*(columns+1)+columns]=valid[y*(columns+1)];}
 return {radii,valid,columns,rows,radius,resolution};
}
export function makeSourceVeilMesh(source,layers,style,columns=64,rows=32){
 const mesh=makeVeilMesh(layers,columns,rows),origins=new Float32Array(mesh.coords.length),valid=new Float32Array(mesh.coords.length/3);
 for(let i=0;i<valid.length;i++){
  const q=i*3,u=mesh.coords[q],v=mesh.coords[q+1],l=mesh.coords[q+2],a=(l+u)/layers,theta=a*TAU,phi=v*Math.PI;
  const fx=a*source.columns,fy=v*source.rows,x=Math.min(source.columns-1,Math.floor(fx)),y=Math.min(source.rows-1,Math.floor(fy)),tx=fx-x,ty=fy-y;
  const ids=[y*(source.columns+1)+x,y*(source.columns+1)+x+1,(y+1)*(source.columns+1)+x,(y+1)*(source.columns+1)+x+1],weights=[(1-tx)*(1-ty),tx*(1-ty),(1-tx)*ty,tx*ty];
  const coverage=ids.reduce((sum,id,j)=>sum+source.valid[id]*weights[j],0),r=coverage>0?ids.reduce((sum,id,j)=>sum+source.radii[id]*weights[j],0)/coverage:0;
  origins.set([Math.sin(phi)*Math.cos(theta)*r,Math.sin(phi)*Math.sin(theta)*r,Math.cos(phi)*r],q);valid[i]=coverage;
 }
 return Object.assign(mesh,{source,origins,valid,style});
}
export function updateSourceVeilMesh(mesh,s,phase){
 const {vertices,origins,coords,triangles,order,depths,indices}=mesh,m=Math.max(0,Math.min(1,s.pVeilMorph)),smooth=m*m*(3-2*m),local=localState(s);
 const world=s.pVeilSourceKind>0;
 const rad=Math.PI/180,cx=Math.cos(s.rotateX*rad),sx=Math.sin(s.rotateX*rad),cy=Math.cos(s.rotateY*rad),sy=Math.sin(s.rotateY*rad),cz=Math.cos(s.rotateZ*rad),sz=Math.sin(s.rotateZ*rad);
 for(let i=0;i<origins.length/3;i++){
  const q=i*3,j=i*9,u=coords[q],v=coords[q+1],l=coords[q+2],target=veilPoint(world?s:local,u,v,l,phase),source=origins.subarray(q,q+3),radius=Math.hypot(...source)||1,memory=(s.pVeilMemory||0)*(radius-1)*mesh.valid[i];
  if(world){for(let k=0;k<3;k++)vertices[j+k]=source[k]*(1-smooth)+target[k]*smooth;vertices[j+6]=u;vertices[j+7]=v;vertices[j+8]=l/Math.max(1,mesh.layers-1);continue;}
  let x=(source[0]*(1-smooth)+target[0]*(1+memory)*smooth)*s.scale*s.stretchX,y=(source[1]*(1-smooth)+target[1]*(1+memory)*smooth)*s.scale*s.stretchY,z=(source[2]*(1-smooth)+target[2]*(1+memory)*smooth)*s.scale*Math.max(.06,s.volume*s.stretchZ);
  let a=y*cx-z*sx;z=y*sx+z*cx;y=a;a=x*cy-z*sy;z=x*sy+z*cy;x=a;a=x*cz-y*sz;y=x*sz+y*cz;x=a;
  vertices[j]=x+s.positionX;vertices[j+1]=y+s.positionY;vertices[j+2]=z;vertices[j+6]=u;vertices[j+7]=v;vertices[j+8]=l/Math.max(1,mesh.layers-1);
 }
 const n=mesh.columns,rows=mesh.rows,stride=n+1,perLayer=stride*(rows+1);
 for(let l=0;l<mesh.layers;l++)for(let y=0;y<=rows;y++)for(let x=0;x<=n;x++){
  const at=(a,b)=>(l*perLayer+b*stride+a)*9,i=at(x,y),left=at(Math.max(0,x-1),y),right=at(Math.min(n,x+1),y),down=at(x,Math.max(0,y-1)),up=at(x,Math.min(rows,y+1));
  const ax=vertices[right]-vertices[left],ay=vertices[right+1]-vertices[left+1],az=vertices[right+2]-vertices[left+2],bx=vertices[up]-vertices[down],by=vertices[up+1]-vertices[down+1],bz=vertices[up+2]-vertices[down+2],nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,len=Math.hypot(nx,ny,nz)||1;vertices[i+3]=nx/len;vertices[i+4]=ny/len;vertices[i+5]=nz/len;
 }
 for(let i=0;i<order.length;i++)depths[i]=(vertices[triangles[i*3]*9+2]+vertices[triangles[i*3+1]*9+2]+vertices[triangles[i*3+2]*9+2])/3;
 order.sort((a,b)=>depths[a]-depths[b]||a-b);for(let i=0;i<order.length;i++)for(let j=0;j<3;j++)indices[i*3+j]=triangles[order[i]*3+j];return mesh;
}

export function sampleLivingVeilSource(mesh,living){const t=living.topology,p=living.positions;for(let i=0;i<mesh.coords.length/3;i++){const q=i*3,x=(mesh.coords[q+2]+mesh.coords[q])/mesh.layers*t.columns,y=mesh.coords[q+1]*(t.rows-1),ix=Math.floor(x)%t.columns,iy=Math.min(t.rows-2,Math.floor(y)),fx=x-Math.floor(x),fy=y-iy,ids=[iy*t.columns+ix,iy*t.columns+(ix+1)%t.columns,(iy+1)*t.columns+ix,(iy+1)*t.columns+(ix+1)%t.columns],w=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];for(let k=0;k<3;k++)mesh.origins[q+k]=ids.reduce((sum,id,j)=>sum+p[id*3+k]*w[j],0);}}
