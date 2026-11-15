import {projectTension} from './vendor/xpbd/distance.js?v=df84a2af0efa';

function contactCell(x,y,z){
 const stride=262144,limit=stride/2;
 return Math.max(Math.abs(x),Math.abs(y),Math.abs(z))<limit?x+y*stride+z*stride*stride:`${x},${y},${z}`;
}

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
 topology.restPositions=new Float32Array(p);
 topology.edges.forEach(([a,b],i)=>{a*=3;b*=3;topology.rest[i]=Math.hypot(p[a]-p[b],p[a+1]-p[b+1],p[a+2]-p[b+2]);});
 topology.contactScale=Math.max(.0001,topology.rest.reduce((sum,v)=>sum+v,0)/topology.rest.length);
 topology.volume=livingVolume(topology,p);
}
export function separateLivingContacts(topology,positions,amount){
 if(!(amount>0))return;
 const {columns,rows,contactScale,restPositions}=topology,buckets=new Map();
 const cell=contactScale*1.3;
 // The polar rings are welded. Only separate folds that were distinct in the rest shape.
 for(let i=columns;i<(rows-1)*columns;i++){
  const a=i*3,x=Math.floor(positions[a]/cell),y=Math.floor(positions[a+1]/cell),z=Math.floor(positions[a+2]/cell);
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
   const bucket=buckets.get(contactCell(x+dx,y+dy,z+dz));if(!bucket)continue;
   for(const j of bucket){
    const u=Math.abs(i%columns-j%columns),v=Math.abs(Math.floor(i/columns)-Math.floor(j/columns));
    if(Math.min(u,columns-u)<=2&&v<=2)continue;
    const b=j*3,rx=restPositions[a]-restPositions[b],ry=restPositions[a+1]-restPositions[b+1],rz=restPositions[a+2]-restPositions[b+2];
    const original=Math.hypot(rx,ry,rz),minimum=Math.min(cell,original*.55);
    if(minimum<1e-6)continue;
    const px=positions[a]-positions[b],py=positions[a+1]-positions[b+1],pz=positions[a+2]-positions[b+2],distance=Math.hypot(px,py,pz);
    if(distance>=minimum)continue;
    const correction=(minimum-distance)*amount*.5,normal=distance>1e-6?[px/distance,py/distance,pz/distance]:[rx/original,ry/original,rz/original];
    for(let k=0;k<3;k++){const move=normal[k]*correction;positions[a+k]+=move;positions[b+k]-=move;}
   }
  }
  const id=contactCell(x,y,z),bucket=buckets.get(id);
  if(!bucket)buckets.set(id,[i]);else if(bucket.length<12)bucket.push(i);
 }
}

export function separateLivingFaces(topology,positions,amount,clearance=.65){
 if(!(amount>0&&clearance>0))return;
 const {columns,rows,triangles,restPositions,contactScale}=topology;
 const gap=contactScale*clearance,cell=contactScale*2,vertices=positions.length/3;
 const corrections=topology.contactCorrections??=new Float32Array(positions.length);
 const visits=topology.contactVisits??=new Uint16Array(vertices);
 const buckets=new Map(),index=v=>Math.floor(v/cell);
 corrections.fill(0);visits.fill(0);
 for(let vertex=columns;vertex<vertices-columns;vertex++){
  const v=vertex*3,id=contactCell(index(positions[v]),index(positions[v+1]),index(positions[v+2]));
  const bucket=buckets.get(id);
  if(bucket)bucket.push(vertex);else buckets.set(id,[vertex]);
 }
 for(let i=0;i<triangles.length;i+=3){
  const first=triangles[i],row=Math.floor(first/columns),column=first%columns;
  if(row===0||row>=rows-2)continue;
  const a=first*3,b=triangles[i+1]*3,c=triangles[i+2]*3;
  const ax=positions[a],ay=positions[a+1],az=positions[a+2];
  const bx=positions[b]-ax,by=positions[b+1]-ay,bz=positions[b+2]-az;
  const cx=positions[c]-ax,cy=positions[c+1]-ay,cz=positions[c+2]-az;
  const nx=by*cz-bz*cy,ny=bz*cx-bx*cz,nz=bx*cy-by*cx,norm=Math.hypot(nx,ny,nz);
  if(norm<1e-10)continue;
  const xx=bx*bx+by*by+bz*bz,xy=bx*cx+by*cy+bz*cz,yy=cx*cx+cy*cy+cz*cz,denominator=norm*norm;
  const x0=index(ax+Math.min(0,bx,cx)-gap),x1=index(ax+Math.max(0,bx,cx)+gap);
  const y0=index(ay+Math.min(0,by,cy)-gap),y1=index(ay+Math.max(0,by,cy)+gap);
  const z0=index(az+Math.min(0,bz,cz)-gap),z1=index(az+Math.max(0,bz,cz)+gap);
  // A badly stretched face spans many cells. Search only the occupied cells in that case.
  const contact=vertex=>{
   const u=Math.abs(vertex%columns-column),v=Math.abs(Math.floor(vertex/columns)-row);
   if(Math.min(u,columns-u)<=2&&v<=2)return;
   const p=vertex*3,px=positions[p]-ax,py=positions[p+1]-ay,pz=positions[p+2]-az;
   const distance=(px*nx+py*ny+pz*nz)/norm;
   if(Math.abs(distance)>=gap)return;
   const pb=px*bx+py*by+pz*bz,pc=px*cx+py*cy+pz*cz;
   const wb=(pb*yy-pc*xy)/denominator,wc=(pc*xx-pb*xy)/denominator,wa=1-wb-wc;
   if(Math.min(wa,wb,wc)<0)return;
   const rx=restPositions[p]-restPositions[a]*wa-restPositions[b]*wb-restPositions[c]*wc;
   const ry=restPositions[p+1]-restPositions[a+1]*wa-restPositions[b+1]*wb-restPositions[c+1]*wc;
   const rz=restPositions[p+2]-restPositions[a+2]*wa-restPositions[b+2]*wb-restPositions[c+2]*wc;
   const threshold=Math.min(gap,Math.hypot(rx,ry,rz)*.45);
   if(threshold<1e-6||Math.abs(distance)>=threshold)return;
   const side=Math.abs(distance)>1e-7?Math.sign(distance):(rx*nx+ry*ny+rz*nz>=0?1:-1);
   const weight=(side*threshold-distance)*amount/(norm*(1+wa*wa+wb*wb+wc*wc));
   for(let k=0;k<3;k++){
    const shift=(k===0?nx:k===1?ny:nz)*weight;
    corrections[p+k]+=shift;corrections[a+k]-=shift*wa;corrections[b+k]-=shift*wb;corrections[c+k]-=shift*wc;
   }
   visits[vertex]++;visits[first]++;visits[triangles[i+1]]++;visits[triangles[i+2]]++;
  };
  if((x1-x0+1)*(y1-y0+1)*(z1-z0+1)>buckets.size){
   for(const bucket of buckets.values()){
    const v=bucket[0]*3,x=index(positions[v]),y=index(positions[v+1]),z=index(positions[v+2]);
    if(x>=x0&&x<=x1&&y>=y0&&y<=y1&&z>=z0&&z<=z1)bucket.forEach(contact);
   }
  }else for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)buckets.get(contactCell(x,y,z))?.forEach(contact);
 }
 for(let i=0;i<vertices;i++)if(visits[i])for(let axis=0;axis<3;axis++)positions[i*3+axis]+=corrections[i*3+axis]/visits[i];
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
