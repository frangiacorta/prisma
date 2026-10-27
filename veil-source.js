import {fieldAt,geometryRadius} from './solid-renderer.js?v=4dc6c236c2ac';
import {extractVeilSurface} from './veil-surface.js?v=4dc6c236c2ac';
import {makeVeilMesh,veilPoint} from './veil-geometry.js?v=4dc6c236c2ac';
// A regular sheet atlas receives the full source surface during opening.
// The atlas alone retains the outer profile at the completely open endpoint.
export const VEIL_SOURCE_KEYS=['seed','renderVersion','deform','asymmetry','twist','waves','waveScale','hole','holeX','holeY','holeShape','holeAspect','cut','cutX','cutY','cutAspect','rimRound','roundness','taper','bendX','bendY','lobeAmount','lobes','pinch','petalAmount','petalCount','petalOpen','petalCurl','petalLength','petalWidth','petalInflate','petalSharp','petalCoverage','petalRows','petalPhase','petalBlend','petalRoot','petalRandom','petalGrowth','petalWander','petalCoil','petalReentry','petalKnots','petalRidges','petalDisorder','petalDirectionSpread','petalWeave','petalWeaveTurns','petalFlow','petalFlowPhase','petalOrbitPhase','petalCollision','petalSphereCollision','petalContactGap','petalContactStiffness','petalContactPasses','stemAmount','stemRadius','stemBend'];
const TAU=Math.PI*2;
const localState=s=>({...s,scale:1,volume:1,stretchX:1,stretchY:1,stretchZ:1,positionX:0,positionY:0,rotateX:0,rotateY:0,rotateZ:0});
export function extractVeilSource(s,resolution=32){
 const local=localState(s),columns=resolution*3,rows=resolution*2,radii=new Float32Array((columns+1)*(rows+1)),valid=new Float32Array(radii.length);
 const radius=Math.max(1.7,geometryRadius(local)),steps=64;
 for(let y=0;y<=rows;y++)for(let x=0;x<columns;x++){
  const theta=x/columns*TAU,phi=y/rows*Math.PI,d=[Math.sin(phi)*Math.cos(theta),Math.sin(phi)*Math.sin(theta),Math.cos(phi)],at=r=>fieldAt(local,d.map(v=>v*r)),index=y*(columns+1)+x;
  let outer=radius,previous=at(outer),hit=false;
  for(let k=1;k<=steps;k++){const inner=radius*(1-k/steps),value=at(inner);if(previous>=0&&value<0){let a=inner,b=outer;for(let n=0;n<9;n++){const mid=(a+b)/2;if(at(mid)<0)a=mid;else b=mid;}radii[index]=(a+b)/2;valid[index]=1;hit=true;break;}outer=inner;previous=value;}
  if(!hit)radii[index]=0;
 }
 for(let y=0;y<=rows;y++){radii[y*(columns+1)+columns]=radii[y*(columns+1)];valid[y*(columns+1)+columns]=valid[y*(columns+1)];}
 return {radii,valid,columns,rows,radius,resolution,local};
}
export function makeSourceVeilMesh(source,layers,style,columns=64,rows=32,details=false){
 const mesh=makeVeilMesh(layers,columns,rows),origins=new Float32Array(mesh.coords.length),valid=new Float32Array(mesh.coords.length/3);
 for(let i=0;i<valid.length;i++){
  const q=i*3,u=mesh.coords[q],v=mesh.coords[q+1],l=mesh.coords[q+2],a=(l+u)/layers,theta=a*TAU,phi=v*Math.PI;
  const fx=a*source.columns,fy=v*source.rows,x=Math.min(source.columns-1,Math.floor(fx)),y=Math.min(source.rows-1,Math.floor(fy)),tx=fx-x,ty=fy-y;
  const ids=[y*(source.columns+1)+x,y*(source.columns+1)+x+1,(y+1)*(source.columns+1)+x,(y+1)*(source.columns+1)+x+1],weights=[(1-tx)*(1-ty),tx*(1-ty),(1-tx)*ty,tx*ty];
  const coverage=ids.reduce((sum,id,j)=>sum+source.valid[id]*weights[j],0),r=coverage>0?ids.reduce((sum,id,j)=>sum+source.radii[id]*weights[j],0)/coverage:0;
  origins.set([Math.sin(phi)*Math.cos(theta)*r,Math.sin(phi)*Math.sin(theta)*r,Math.cos(phi)*r],q);valid[i]=coverage;
 }
 Object.assign(mesh,{source,origins,valid,style});
 if(details){source.surface??=extractVeilSurface(source.local,source.radius,(source.resolution<=24?6:7)+(source.radius>3.5?1:0));attachSurface(mesh,source.surface);}
 return mesh;
}
export function updateSourceVeilMesh(mesh,s,phase){
 const {vertices,origins,coords,triangles,order,depths,indices}=mesh,m=Math.max(0,Math.min(1,s.pVeilMorph)),smooth=m*m*(3-2*m),local=localState(s);
 const world=s.pVeilSourceKind>0;
 const rad=Math.PI/180,cx=Math.cos(s.rotateX*rad),sx=Math.sin(s.rotateX*rad),cy=Math.cos(s.rotateY*rad),sy=Math.sin(s.rotateY*rad),cz=Math.cos(s.rotateZ*rad),sz=Math.sin(s.rotateZ*rad);
 for(let i=0;i<origins.length/3;i++){
  const q=i*3,j=i*9,u=coords[q],v=coords[q+1],l=coords[q+2],target=veilPoint(world?s:local,u,v,l,phase),source=origins.subarray(q,q+3),radius=Math.hypot(...source)||1,memory=(s.pVeilMemory||0)*(radius-1)*Math.abs(mesh.valid[i]);
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
 if(mesh.detailStart!==undefined){
  const start=mesh.detailStart;for(let i=start;i<vertices.length/9;i++)vertices.fill(0,i*9+3,i*9+6);
  for(let q=mesh.detailTriangleStart;q<triangles.length;q+=3){const a=triangles[q]*9,b=triangles[q+1]*9,c=triangles[q+2]*9,ax=vertices[b]-vertices[a],ay=vertices[b+1]-vertices[a+1],az=vertices[b+2]-vertices[a+2],bx=vertices[c]-vertices[a],by=vertices[c+1]-vertices[a+1],bz=vertices[c+2]-vertices[a+2],n=[ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx];for(const i of [a,b,c])for(let k=0;k<3;k++)vertices[i+3+k]+=n[k];}
  for(let i=start;i<vertices.length/9;i++){const j=i*9,len=Math.hypot(vertices[j+3],vertices[j+4],vertices[j+5])||1;for(let k=0;k<3;k++)vertices[j+3+k]/=len;
   let x=mesh.sourceNormals[i*3]/s.stretchX,y=mesh.sourceNormals[i*3+1]/s.stretchY,z=mesh.sourceNormals[i*3+2]/Math.max(.06,s.volume*s.stretchZ),a=y*cx-z*sx;z=y*sx+z*cx;y=a;a=x*cy-z*sy;z=x*sy+z*cy;x=a;a=x*cz-y*sz;y=x*sz+y*cz;x=a;const originalLength=Math.hypot(x,y,z)||1;
   const original=[x/originalLength,y/originalLength,z/originalLength];for(let k=0;k<3;k++)vertices[j+3+k]=original[k]*(1-smooth)+vertices[j+3+k]*smooth;const mixedLength=Math.hypot(vertices[j+3],vertices[j+4],vertices[j+5])||1;for(let k=0;k<3;k++)vertices[j+3+k]/=mixedLength;}
 }
 for(let i=0;i<order.length;i++)depths[i]=(vertices[triangles[i*3]*9+2]+vertices[triangles[i*3+1]*9+2]+vertices[triangles[i*3+2]*9+2])/3;
 order.sort((a,b)=>depths[a]-depths[b]||a-b);for(let i=0;i<order.length;i++)for(let j=0;j<3;j++)indices[i*3+j]=triangles[order[i]*3+j];return mesh;
}

export function sampleLivingVeilSource(mesh,living){const t=living.topology,p=living.positions;for(let i=0;i<mesh.coords.length/3;i++){const q=i*3,x=(mesh.coords[q+2]+mesh.coords[q])/mesh.layers*t.columns,y=mesh.coords[q+1]*(t.rows-1),ix=Math.floor(x)%t.columns,iy=Math.min(t.rows-2,Math.floor(y)),fx=x-Math.floor(x),fy=y-iy,ids=[iy*t.columns+ix,iy*t.columns+(ix+1)%t.columns,(iy+1)*t.columns+ix,(iy+1)*t.columns+(ix+1)%t.columns],w=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];for(let k=0;k<3;k++)mesh.origins[q+k]=ids.reduce((sum,id,j)=>sum+p[id*3+k]*w[j],0);}}

// Keep cavities and branches as actual surface triangles while they open.
// Split only at sheet boundaries; shared source vertices remain shared inside
// each strip. These triangles hand over to the regular sheets before they fold
// onto the same UV space, avoiding the tangled endpoint of raw mesh unfolding.
function attachSurface(mesh,surface){
 const coords=Array.from(mesh.coords),origins=Array.from(mesh.origins),valid=Array.from(mesh.valid),triangles=Array.from(mesh.triangles),normals=new Array(origins.length).fill(0),map=new Map();
 mesh.detailStart=valid.length;mesh.detailTriangleStart=triangles.length;
 const angle=p=>(Math.atan2(p[1],p[0])/TAU+1)%1;
 const clip=(polygon,bound,lower)=>{const result=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],inside=lower?a.u>=bound:a.u<=bound,next=lower?b.u>=bound:b.u<=bound;if(inside)result.push(a);if(inside!==next){const t=(bound-a.u)/(b.u-a.u);result.push({u:bound,v:a.v+(b.v-a.v)*t,p:a.p.map((v,k)=>v+(b.p[k]-v)*t),n:a.n.map((v,k)=>v+(b.n[k]-v)*t)});}}return result;};
 for(let q=0;q<surface.triangles.length;q+=3){const polygon=Array.from(surface.triangles.subarray(q,q+3),id=>{const p=Array.from(surface.positions.subarray(id*3,id*3+3)),n=Array.from(surface.normals.subarray(id*3,id*3+3)),r=Math.hypot(...p)||1;return {p,n,u:angle(p),v:Math.acos(Math.max(-1,Math.min(1,p[2]/r)))/Math.PI};});
  if(Math.max(...polygon.map(v=>v.u))-Math.min(...polygon.map(v=>v.u))>.5)for(const v of polygon)if(v.u<.5)v.u+=1;
  const first=Math.floor(Math.min(...polygon.map(v=>v.u))*mesh.layers),last=Math.floor(Math.max(...polygon.map(v=>v.u))*mesh.layers);
  for(let layer=first;layer<=last;layer++){const piece=clip(clip(polygon,layer/mesh.layers,true),(layer+1)/mesh.layers,false);if(piece.length<3)continue;const ids=[];
   for(const v of piece){const key=layer+':'+v.p.map(x=>Math.round(x*1e7)).join(',');let index=map.get(key);if(index===undefined){index=valid.length;map.set(key,index);coords.push(Math.max(0,Math.min(1,v.u*mesh.layers-layer)),v.v,layer%mesh.layers);origins.push(...v.p);normals.push(...v.n);valid.push(-1);}ids.push(index);}
   for(let j=1;j<ids.length-1;j++)if(ids[0]!==ids[j]&&ids[j]!==ids[j+1]&&ids[0]!==ids[j+1])triangles.push(ids[0],ids[j],ids[j+1]);
  }
 }
 mesh.sourceNormals=new Float32Array(normals);mesh.coords=new Float32Array(coords);mesh.origins=new Float32Array(origins);mesh.valid=new Float32Array(valid);mesh.triangles=new Uint32Array(triangles);mesh.indices=new Uint32Array(triangles.length);mesh.vertices=new Float32Array(valid.length*9);mesh.order=Array.from({length:triangles.length/3},(_,i)=>i);mesh.depths=new Float32Array(mesh.order.length);
}
