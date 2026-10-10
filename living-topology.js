import {projectTension} from './vendor/xpbd/distance.js?v=b18a20e380e3';

// Persistent material coordinates: every fibre, pore and triangle keeps its identity.
export function makeLivingTopology(columns=64,rows=49,mode=1,bundles=8){
 const seeds=new Float32Array(columns*rows*4),edges=[],triangles=[];
 const id=(x,y)=>y*columns+(x+columns)%columns;
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  seeds.set([x/columns,y/(rows-1),.5,.5],id(x,y)*4);
  if(y+1<rows)edges.push([id(x,y),id(x,y+1),0]);
  if(y+2<rows)edges.push([id(x,y),id(x,y+2),1]);
  const sameBundle=Math.floor(x*bundles/columns)===Math.floor(((x+1)%columns)*bundles/columns);
  if(mode!==1||sameBundle){
   edges.push([id(x,y),id(x+1,y),0]);
   if(y+1<rows){edges.push([id(x,y),id(x+1,y+1),0]);edges.push([id(x+1,y),id(x,y+1),0]);}
  }
  if(y+1<rows)triangles.push(id(x,y),id(x+1,y),id(x+1,y+1),id(x,y),id(x+1,y+1),id(x,y+1));
 }
 return {columns,rows,seeds,edges,triangles:new Uint32Array(triangles),lambda:new Float32Array(edges.length),rest:new Float32Array(edges.length)};
}
export function setLivingRest(topology,p){
 topology.edges.forEach(([a,b],i)=>{a*=3;b*=3;topology.rest[i]=Math.hypot(p[a]-p[b],p[a+1]-p[b+1],p[a+2]-p[b+2]);});
 topology.volume=livingVolume(topology,p);
}
// Signed tetrahedra around the centroid, with virtual end caps for open skins.
export function livingVolume(t,p){
 const c=[0,0,0],n=p.length/3;for(let i=0;i<n;i++)for(let k=0;k<3;k++)c[k]+=p[i*3+k]/n;
 const point=i=>[p[i*3]-c[0],p[i*3+1]-c[1],p[i*3+2]-c[2]];
 const triple=(a,b,d)=>a[0]*(b[1]*d[2]-b[2]*d[1])+a[1]*(b[2]*d[0]-b[0]*d[2])+a[2]*(b[0]*d[1]-b[1]*d[0]);
 let v=0;for(let i=0;i<t.triangles.length;i+=3)v+=triple(point(t.triangles[i]),point(t.triangles[i+1]),point(t.triangles[i+2]));
 for(const row of [0,t.rows-1]){const center=[0,0,0];for(let x=0;x<t.columns;x++){const q=point(row*t.columns+x);for(let k=0;k<3;k++)center[k]+=q[k]/t.columns;}for(let x=0;x<t.columns;x++){const a=point(row*t.columns+x),b=point(row*t.columns+(x+1)%t.columns);v+=(row===0?-1:1)*triple(center,a,b);}}
 return Math.abs(v/6);
}
export function preserveLivingVolume(t,p,amount){
 if(amount<=0)return;
 const volume=livingVolume(t,p);if(volume<1e-8||t.volume<1e-8)return;
 const scale=1+amount*(Math.max(.4,Math.min(2.5,Math.cbrt(t.volume/volume)))-1),c=[0,0,0],n=p.length/3;
 for(let i=0;i<n;i++)for(let k=0;k<3;k++)c[k]+=p[i*3+k]/n;
 for(let i=0;i<n;i++)for(let k=0;k<3;k++)p[i*3+k]=c[k]+(p[i*3+k]-c[k])*scale;
}
export function relaxLiving(topology,target,elastic,bend,iterations=10){
 const p=new Float32Array(target);topology.lambda.fill(0);
 if(elastic<=0&&bend<=0)return p;
 for(let pass=0;pass<iterations;pass++){
  // Reverse sweep removes a preferred direction. Start from the same target for
  // every phase, so seeking, reverse playback and video export are deterministic.
  for(let j=0;j<topology.edges.length;j++){
   const i=pass%2?topology.edges.length-1-j:j,[a,b,kind]=topology.edges[i],strength=kind?bend:elastic;
   if(strength<=0)continue;
   const alpha=12*(1-strength)**3/Math.max(.001,strength);
   projectTension(p,a,b,topology.rest[i],alpha,topology.lambda,i);
  }
 }
 return p;
}
