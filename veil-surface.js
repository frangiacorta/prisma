import {fieldAt} from './solid-renderer.js?v=38e810dd65ce';

// All leaves use the same lattice: adjacent cells share edge intersections,
// including the tetrahedral diagonals. No cracks from mixed octree levels.
const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
const edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
export function extractVeilSurface(state,radius,depth=7){
 const n=2**depth,step=radius*2/n,values=new Map(),crossings=new Map(),positions=[],normals=[],triangles=[];
 const id=(x,y,z)=>(z*(n+1)+y)*(n+1)+x;
 const point=(x,y,z)=>[x*step-radius,y*step-radius,z*step-radius];
 const value=(x,y,z)=>{const k=id(x,y,z);if(!values.has(k))values.set(k,fieldAt(state,point(x,y,z)));return values.get(k);};
 const crossing=(a,b)=>{const ia=id(...a),ib=id(...b),key=ia<ib?ia+':'+ib:ib+':'+ia;if(crossings.has(key))return crossings.get(key);
  const pa=point(...a),pb=point(...b),va=value(...a),vb=value(...b);let lo=0,hi=1,t=va/(va-vb);
  // Refine the isosurface rather than inflating very thin roots to a cell.
  for(let j=0;j<3;j++){const p=pa.map((v,k)=>v+(pb[k]-v)*t),v=fieldAt(state,p);if((v<0)===(va<0))lo=t;else hi=t;t=(lo+hi)/2;}
  // Linear interpolation is exact on a plane; keep the final bracket secant.
  const pl=pa.map((v,k)=>v+(pb[k]-v)*lo),ph=pa.map((v,k)=>v+(pb[k]-v)*hi),vl=fieldAt(state,pl),vh=fieldAt(state,ph);t=lo+(hi-lo)*vl/(vl-vh);
  const p=pa.map((v,k)=>v+(pb[k]-v)*t),epsilon=step*.08,g=p.map((_,k)=>{const l=p.slice(),h=p.slice();l[k]-=epsilon;h[k]+=epsilon;return fieldAt(state,h)-fieldAt(state,l);}),length=Math.hypot(...g)||1,index=positions.length/3;
  positions.push(...p);normals.push(...g.map(v=>v/length));crossings.set(key,index);return index;
 };
 const cell=(x,y,z)=>{const ps=corners.map(c=>[x+c[0],y+c[1],z+c[2]]),vs=ps.map(p=>value(...p));
  for(const tet of tetrahedra){const hits=[];for(const [a,b] of edges)if((vs[tet[a]]<0)!==(vs[tet[b]]<0))hits.push(crossing(ps[tet[a]],ps[tet[b]]));if(hits.length<3)continue;
   const center=[0,0,0],normal=[0,0,0];for(const i of hits)for(let k=0;k<3;k++){center[k]+=positions[i*3+k]/hits.length;normal[k]+=normals[i*3+k];}
   const a=hits[0],axis=[0,1,2].map(k=>positions[a*3+k]-center[k]),cross=[normal[1]*axis[2]-normal[2]*axis[1],normal[2]*axis[0]-normal[0]*axis[2],normal[0]*axis[1]-normal[1]*axis[0]];
   hits.sort((a,b)=>{const angle=i=>{const d=[0,1,2].map(k=>positions[i*3+k]-center[k]);return Math.atan2(d.reduce((s,v,k)=>s+v*cross[k],0)/(Math.hypot(...normal)||1),d.reduce((s,v,k)=>s+v*axis[k],0));};return angle(a)-angle(b);});
   for(let j=1;j<hits.length-1;j++)triangles.push(hits[0],hits[j],hits[j+1]);
  }
 };
 // fieldAt is a conservative distance near unwarped surfaces. The multiplier
 // covers its coordinate warps; signed samples also prevent cavity pruning.
 const distortion=1+Math.abs(state.twist||0)*2+Math.abs(state.asymmetry||0)*2+Math.abs(state.bendX||0)*3+Math.abs(state.bendY||0)*3+Math.abs(state.waves||0)*(state.waveScale||1)+Math.abs(state.deform||0)*3;
 const visit=(x,y,z,size)=>{const samples=corners.map(c=>value(x+c[0]*size,y+c[1]*size,z+c[2]*size));if(size>1)samples.push(value(x+size/2,y+size/2,z+size/2));const same=samples.every(v=>(v<0)===(samples[0]<0));if(same&&Math.min(...samples.map(Math.abs))>size*step*.9*distortion)return;if(size===1){cell(x,y,z);return;}const half=size/2;for(const c of corners)visit(x+c[0]*half,y+c[1]*half,z+c[2]*half,half);};
 visit(0,0,0,n);
 return {positions:new Float32Array(positions),normals:new Float32Array(normals),triangles:new Uint32Array(triangles),step,samples:values.size};
}
