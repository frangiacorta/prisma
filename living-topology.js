import {projectTension} from './vendor/xpbd/distance.js?v=de5c2d2312c1';

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

function surfaceEdges(topology,vertices){
 const unique=new Set(),segments=[];
 const {triangles,columns}=topology;
 for(let i=0;i<triangles.length;i+=3){
  for(let j=0;j<3;j++){
   const a=Math.min(triangles[i+j],triangles[i+(j+1)%3]),b=Math.max(triangles[i+j],triangles[i+(j+1)%3]);
   const key=a*vertices+b;
   if(a===b||unique.has(key))continue;
   unique.add(key);
   segments.push({a:a*3,b:b*3,row:Math.floor(a/columns),column:a%columns,tail:b>=vertices-columns});
  }
 }
 return segments;
}

const unitInterval=x=>Math.max(0,Math.min(1,x));

function edgeCorrection(p,rest,corrections,visits,left,right,gap,amount){
 const {a,b}=left,{a:c,b:d}=right;
 const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2];
 const vx=p[d]-p[c],vy=p[d+1]-p[c+1],vz=p[d+2]-p[c+2];
 const wx=p[a]-p[c],wy=p[a+1]-p[c+1],wz=p[a+2]-p[c+2];
 const uu=ux*ux+uy*uy+uz*uz,vv=vx*vx+vy*vy+vz*vz;
 if(Math.min(uu,vv)<1e-12)return false;
 const uv=ux*vx+uy*vy+uz*vz,uw=ux*wx+uy*wy+uz*wz,vw=vx*wx+vy*wy+vz*wz;
 const determinant=uu*vv-uv*uv;
 let s;
 if(determinant>uu*vv*1e-6)s=unitInterval((uv*vw-vv*uw)/determinant);
 else{
  // Centre a parallel contact inside the overlap so each edge shares the load.
  const first=-uw/uu,last=first+uv/uu;
  s=(unitInterval(Math.min(first,last))+unitInterval(Math.max(first,last)))*.5;
 }
 const t=(vw+s*uv)/vv;
 // Vertex contacts already handle the endpoints. This pass acts between edges.
 if(s<=0||s>=1||t<=0||t>=1)return false;
 const dx=wx+s*ux-t*vx,dy=wy+s*uy-t*vy,dz=wz+s*uz-t*vz,distance2=dx*dx+dy*dy+dz*dz;
 if(distance2>=gap*gap)return false;
 const rx=rest[a]*(1-s)+rest[b]*s-rest[c]*(1-t)-rest[d]*t;
 const ry=rest[a+1]*(1-s)+rest[b+1]*s-rest[c+1]*(1-t)-rest[d+1]*t;
 const rz=rest[a+2]*(1-s)+rest[b+2]*s-rest[c+2]*(1-t)-rest[d+2]*t;
 const threshold=Math.min(gap,Math.hypot(rx,ry,rz)*.45),distance=Math.sqrt(distance2);
 if(threshold<1e-6||distance>=threshold)return false;
 let nx=0,ny=0,nz=0;
 const blend=unitInterval(distance/(threshold*.4));
 if(blend<1){
  // At a crossing the closest points coincide. The rest shape supplies a
  // consistent side and the blend avoids a full-strength sign flip.
  if(determinant>uu*vv*1e-6){
   nx=uy*vz-uz*vy;ny=uz*vx-ux*vz;nz=ux*vy-uy*vx;
   if(nx*rx+ny*ry+nz*rz<0){nx=-nx;ny=-ny;nz=-nz;}
  }else{
   const along=(rx*ux+ry*uy+rz*uz)/uu;
   nx=rx-along*ux;ny=ry-along*uy;nz=rz-along*uz;
   if(nx*nx+ny*ny+nz*nz<1e-12){
    if(Math.abs(ux)>Math.abs(uz)){nx=-uy;ny=ux;nz=0;}
    else{nx=0;ny=uz;nz=-uy;}
   }
  }
  const weight=(1-blend)/Math.hypot(nx,ny,nz);
  nx*=weight;ny*=weight;nz*=weight;
 }
 const weight=distance>1e-10?blend/distance:0;
 nx+=dx*weight;ny+=dy*weight;nz+=dz*weight;
 const aWeight=1-s,bWeight=s,cWeight=1-t,dWeight=t;
 const move=(threshold-distance)*amount/(aWeight*aWeight+bWeight*bWeight+cWeight*cWeight+dWeight*dWeight);
 for(let k=0;k<3;k++){
  const shift=(k===0?nx:k===1?ny:nz)*move;
  corrections[a+k]+=shift*aWeight;corrections[b+k]+=shift*bWeight;
  corrections[c+k]-=shift*cWeight;corrections[d+k]-=shift*dWeight;
 }
 if(aWeight>0)visits[a/3]++;
 if(bWeight>0)visits[b/3]++;
 if(cWeight>0)visits[c/3]++;
 if(dWeight>0)visits[d/3]++;
 return true;
}

export function separateLivingEdges(topology,positions,amount,clearance=.65,weldStart=true){
 if(!(amount>0&&clearance>0))return 0;
 const {columns,restPositions,contactScale}=topology,vertices=positions.length/3;
 const neighborhood=topology.edgeNeighborhood??2;
 const gap=contactScale*clearance,padding=gap*.5,cell=Math.max(gap,contactScale*.85);
 const edges=topology.contactEdges??=surfaceEdges(topology,vertices);
 const corrections=topology.contactCorrections??=new Float32Array(positions.length);
 const visits=topology.contactVisits??=new Uint16Array(vertices);
 const seen=topology.edgeContactSeen??=new Uint32Array(edges.length);
 const bounds=topology.edgeContactBounds??=new Float64Array(edges.length*6);
 const buckets=new Map(),wide=[],inserted=[];
 corrections.fill(0);visits.fill(0);seen.fill(0);
 let count=0;
 for(let i=0;i<edges.length;i++){
  const left=edges[i],{a,b}=left;
  // Leave all segments attached to a welded pole to the existing constraints.
  if(left.tail||(weldStart&&left.row===0))continue;
  const dx=positions[a]-positions[b],dy=positions[a+1]-positions[b+1],dz=positions[a+2]-positions[b+2];
  if(dx*dx+dy*dy+dz*dz<1e-12)continue;
  const x0=Math.min(positions[a],positions[b])-padding,x1=Math.max(positions[a],positions[b])+padding;
  const y0=Math.min(positions[a+1],positions[b+1])-padding,y1=Math.max(positions[a+1],positions[b+1])+padding;
  const z0=Math.min(positions[a+2],positions[b+2])-padding,z1=Math.max(positions[a+2],positions[b+2])+padding;
  const offset=i*6;
  bounds[offset]=x0;bounds[offset+1]=x1;bounds[offset+2]=y0;bounds[offset+3]=y1;bounds[offset+4]=z0;bounds[offset+5]=z1;
  const span=Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz));
  const parts=Math.max(1,Math.ceil(span/(2*cell)));
  const test=j=>{
   if(seen[j]===i+1)return;
   seen[j]=i+1;
   const offset=j*6;
   if(x0>bounds[offset+1]||x1<bounds[offset]||y0>bounds[offset+3]||y1<bounds[offset+2]||z0>bounds[offset+5]||z1<bounds[offset+4])return;
   const right=edges[j],u=Math.abs(left.column-right.column);
   if(Math.min(u,columns-u)<=neighborhood&&Math.abs(left.row-right.row)<=neighborhood)return;
   if(edgeCorrection(positions,restPositions,corrections,visits,left,right,gap,amount))count++;
  };
  if(parts>128){
   // Keep exceptional spans out of the grid without dropping their contacts.
   for(const j of inserted)test(j);
   wide.push(i);
  }else{
   for(const j of wide)test(j);
   // Follow long diagonals in pieces so their boxes stay close to the edge.
   let px=positions[a],py=positions[a+1],pz=positions[a+2];
   for(let k=1;k<=parts;k++){
    const t=k/parts,qx=positions[a]-dx*t,qy=positions[a+1]-dy*t,qz=positions[a+2]-dz*t;
    const gx=Math.floor((Math.min(px,qx)-padding)/cell),endX=Math.floor((Math.max(px,qx)+padding)/cell);
    const gy=Math.floor((Math.min(py,qy)-padding)/cell),endY=Math.floor((Math.max(py,qy)+padding)/cell);
    const gz=Math.floor((Math.min(pz,qz)-padding)/cell),endZ=Math.floor((Math.max(pz,qz)+padding)/cell);
    for(let x=gx;x<=endX;x++)for(let y=gy;y<=endY;y++)for(let z=gz;z<=endZ;z++){
     const key=contactCell(x,y,z),bucket=buckets.get(key);
     if(!bucket)buckets.set(key,[i]);
     else if(bucket[bucket.length-1]!==i){for(const j of bucket)test(j);bucket.push(i);}
    }
    px=qx;py=qy;pz=qz;
   }
  }
  inserted.push(i);
 }
 for(let i=0;i<vertices;i++)if(visits[i])for(let axis=0;axis<3;axis++)positions[i*3+axis]+=corrections[i*3+axis]/visits[i];
 return count;
}

export function separateLivingSurfaceEdges(topology,positions,amount,clearance,weldStart){
 if(!(amount>0&&clearance>0))return 0;
 const {columns,rows,restPositions,contactScale}=topology;
 if(columns%2!==0||rows%2!==1||columns<32||rows<25)return separateLivingEdges(topology,positions,amount,clearance,weldStart);
 // Solve edge pairs on a coarser copy. Vertex and face contacts still use the
 // fine mesh, and the displacement is spread across it without changing its tessellation.
 const cols=columns/2,lines=(rows+1)/2,size=cols*lines*3;
 const mesh=topology.edgeContactMesh??={grid:makeLivingTopology(cols,lines,3),before:new Float32Array(size),after:new Float32Array(size)};
 const {grid,before,after}=mesh;
 const gather=(source,target)=>{
  for(let y=0;y<lines;y++)for(let x=0;x<cols;x++){
   const src=(y*columns+x)*6,dst=(y*cols+x)*3;
   for(let axis=0;axis<3;axis++)target[dst+axis]=source[src+axis];
  }
 };
 if(mesh.restSource!==restPositions){
  grid.restPositions??=new Float32Array(size);
  gather(restPositions,grid.restPositions);mesh.restSource=restPositions;
 }
 grid.contactScale=contactScale;grid.edgeNeighborhood=1;
 gather(positions,before);after.set(before);
 const contacts=separateLivingEdges(grid,after,amount,clearance,weldStart);
 if(!contacts)return 0;
 for(let i=0;i<size;i++)after[i]-=before[i];
 for(let y=0;y<rows;y++){
  if((weldStart&&y===0)||y===rows-1)continue;
  const top=Math.floor(y/2),bottom=Math.min(lines-1,top+1),mixY=(y%2)*.5;
  for(let x=0;x<columns;x++){
   const left=Math.floor(x/2),right=(left+1)%cols,mixX=(x%2)*.5;
   const a=(top*cols+left)*3,b=(top*cols+right)*3,c=(bottom*cols+left)*3,d=(bottom*cols+right)*3;
   for(let axis=0;axis<3;axis++){
    const upper=after[a+axis]*(1-mixX)+after[b+axis]*mixX,lower=after[c+axis]*(1-mixX)+after[d+axis]*mixX;
    positions[(y*columns+x)*3+axis]+=upper*(1-mixY)+lower*mixY;
   }
  }
 }
 return contacts;
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
