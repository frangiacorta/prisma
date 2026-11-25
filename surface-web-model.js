// The integrated tissue already owns its knots, cradles and membranes. As it
// dissolves, the same controls dress the remaining authored body or cloud.
export function surfaceWebWeights(s){
 const supplied=(s.grainSource??(s.engine==='particles'?'cloud':'body'))==='body'&&!(s.pLiving>0);
 if(!supplied&&!(s.pLiving>0)&&s.pCount===0)return [0,0,0];
 const junctions=supplied?(s.structFibres||0)*(s.structWeft||0):0;
 const membrane=junctions*(s.structShell||0);
 const cradle=membrane*(s.structWeaveBranching||0)*(s.structWeaveTension||0);
 return [(s.structWeaveCradle||0)*(1-cradle),(s.structWeaveNodes||0)*(1-junctions),(s.structWeaveMembrane||0)*(1-membrane)];
}
export const surfaceWebStrength=s=>Math.max(...surfaceWebWeights(s));

// Build in rest coordinates, once per topology. Vertex numbers remain
// particle/sample identities as the actual surface and fields move.
export function surfaceWebGraph(rest,count,pitch=1,connect=true){
 const faces=[],edges=[],points=[],faceIndex=new Map(),edgeIndex=new Map();
 const valid=Array.from({length:count},(_,i)=>i).filter(i=>rest[i*8+3]>.5);
 // The fourth component is the branching value where this stitch begins
 // to appear. A shared stitch uses the earliest arrival from either end.
 const stitch=(data,index,key,a,b,c,birth)=>{
  const offset=index.get(key);
  if(offset===undefined){index.set(key,data.length);data.push(a,b,c,birth);}
  else data[offset+3]=Math.min(birth,data[offset+3]);
 };
 for(const a of valid){
  points.push(a,a,a,-1);
  if(!connect)continue;
  const neighbours=[],limit=6;
  for(const b of valid){if(a===b)continue;
   const x=rest[b*8]-rest[a*8],y=(rest[b*8+1]-rest[a*8+1])/pitch,z=rest[b*8+2]-rest[a*8+2];
   const d=x*x+y*y+z*z;if(d<=1e-9||neighbours.length===limit&&d>=neighbours[limit-1].d)continue;
   let j=neighbours.length;while(j>0&&d<neighbours[j-1].d)j--;
   neighbours.splice(j,0,{b,x,y,z,d});if(neighbours.length>limit)neighbours.pop();
  }
  for(let j=0;j<neighbours.length;j++){
   const n=neighbours[j],birth=j<3?-1:(j-3)/3;
   const lo=Math.min(a,n.b),hi=Math.max(a,n.b);
   stitch(edges,edgeIndex,lo*count+hi,lo,hi,hi,birth);
   let chosen=null,best=Infinity;
   for(let k=0;k<Math.min(neighbours.length,Math.max(3,j+1));k++){
    const m=neighbours[k];if(m===n)continue;
    const cos=(n.x*m.x+n.y*m.y+n.z*m.z)/Math.sqrt(n.d*m.d);
    if(cos>.9||cos<-.30)continue;
    const score=Math.abs(cos-.48)+.19*Math.abs(Math.log(n.d/m.d));
    if(score<best){best=score;chosen=m;}
   }
   if(!chosen)continue;
   const tri=[a,n.b,chosen.b].sort((x,y)=>x-y);
   stitch(faces,faceIndex,tri.join(','),...tri,birth);
  }
 }
 return {points:new Float32Array(points),edges:new Float32Array(edges),faces:new Float32Array(faces)};
}
