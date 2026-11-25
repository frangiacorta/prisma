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
export function surfaceWebGraph(rest,count,branching,pitch=1,connect=true){
 const faces=[],edges=[],points=[],faceSeen=new Set(),edgeSeen=new Set();
 const valid=Array.from({length:count},(_,i)=>i).filter(i=>rest[i*8+3]>.5);
 const edge=(a,b)=>{if(a>b)[a,b]=[b,a];const k=a*count+b;if(!edgeSeen.has(k)){edgeSeen.add(k);edges.push(a,b,b);}};
 for(const a of valid){
  points.push(a,a,a);
  if(!connect)continue;
  const neighbours=[],limit=3+Math.round(3*branching);
  for(const b of valid){if(a===b)continue;
   const x=rest[b*8]-rest[a*8],y=(rest[b*8+1]-rest[a*8+1])/pitch,z=rest[b*8+2]-rest[a*8+2];
   const d=x*x+y*y+z*z;if(d<=1e-9||neighbours.length===limit&&d>=neighbours[limit-1].d)continue;
   let j=neighbours.length;while(j>0&&d<neighbours[j-1].d)j--;
   neighbours.splice(j,0,{b,x,y,z,d});if(neighbours.length>limit)neighbours.pop();
  }
  for(const n of neighbours)edge(a,n.b);
  for(let j=0;j<neighbours.length;j++){
   const n=neighbours[j];let chosen=null,best=Infinity;
   for(const m of neighbours){if(m===n)continue;
    const cos=(n.x*m.x+n.y*m.y+n.z*m.z)/Math.sqrt(n.d*m.d);
    if(cos>.9||cos<-.30)continue;
    const score=Math.abs(cos-.48)+.19*Math.abs(Math.log(n.d/m.d));
    if(score<best){best=score;chosen=m;}
   }
   if(!chosen)continue;
   const tri=[a,n.b,chosen.b].sort((x,y)=>x-y),k=tri.join(',');
   if(!faceSeen.has(k)){faceSeen.add(k);faces.push(...tri);}
  }
 }
 return {points:new Float32Array(points),edges:new Float32Array(edges),faces:new Float32Array(faces)};
}
