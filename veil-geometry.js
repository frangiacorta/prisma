const TAU=Math.PI*2,rad=Math.PI/180;
// Persistent UV coordinates, analytic periodic motion: no frame-history or random remeshing.
export function makeVeilMesh(layers,columns=96,rows=40){
 const coords=[],triangles=[];
 function grid(layer,n,m){const start=coords.length/3;for(let j=0;j<=m;j++)for(let i=0;i<=n;i++)coords.push(i/n,j/m,layer);for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=start+j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;triangles.push(a,b,d,a,d,c);}}
 for(let l=0;l<layers;l++)grid(l,columns,rows);
 return {layers,columns,rows,coords:new Float32Array(coords),triangles:new Uint32Array(triangles),vertices:new Float32Array(coords.length*3),indices:new Uint32Array(triangles.length),order:Array.from({length:triangles.length/3},(_,i)=>i),depths:new Float32Array(triangles.length/3)};
}
export function veilPoint(s,u,v,layer,phase){
 const style=Math.max(0,Math.min(2,s.pVeilStyle));if(style!==Math.floor(style)){const low=Math.floor(style),f=style-low,a=veilPoint({...s,pVeilStyle:low},u,v,layer,phase),b=veilPoint({...s,pVeilStyle:low+1},u,v,layer,phase);return a.map((v,i)=>v+(b[i]-v)*f);}
 const t=TAU*phase*s.pVeilCycles,clock=t-s.pVeilRhythm*Math.sin(t),l=layer,shift=l*2.39996323;
 let x,y,z;
 if(l<0){const a=u*TAU,b=v*Math.PI,r=s.pVeilCoreRadius;x=r*Math.sin(b)*Math.cos(a);y=r*Math.sin(b)*Math.sin(a);z=r*Math.cos(b);}
 else{
  const lag=clock-l*s.pVeilDelay,open=.035+s.pVeilSpread*(1+s.pVeilBreath*Math.sin(lag)),wave=s.pVeilFlow*Math.sin(lag-v*TAU),a=(u-.5)*TAU;
  if(s.pVeilStyle===1){
   const angle=u*TAU+s.pVeilTwist*v*1.8+shift*.12;
   const r=v*(.62+open*.72)*(1-l/Math.max(1,s.pVeilLayers)*.34)*(1+s.pVeilAsymmetry*(.2*Math.sin(angle+shift)+.1*Math.sin(3*angle-shift)));
   const ripple=s.pVeilRipple*Math.sin(angle*s.pVeilFolds+lag+v*4.)*v*v;
   x=r*Math.cos(angle);y=r*Math.sin(angle);z=(l-(s.pVeilLayers-1)/2)*s.pVeilSpacing*v+.16*Math.sin(v*Math.PI)+ripple+wave*.1*v;
   z+=s.pVeilAsymmetry*.2*Math.sin(angle+shift)*v;
  }else{
   const width=(s.pVeilStyle===2?.8:.38)+open*(s.pVeilStyle===2?1.15:1.45);
   const angle=shift+a*width*.42+s.pVeilTwist*(1-v)*2+wave*.18*v;
   const radius=(v*(.75+open*.8))*(1+s.pVeilAsymmetry*.2*Math.sin(shift));
   const rib=Math.sin(a*s.pVeilFolds+v*5-lag);
   const taper=Math.pow(Math.max(0,Math.cos((u-.5)*Math.PI)),.8);
   const r=radius*(.25+.75*taper)*(1+s.pVeilRipple*.5* Math.sin(a*s.pVeilFolds-lag)*v*v);
   x=r*Math.cos(angle);y=r*Math.sin(angle);
   z=(1-open)*v*v*.7+(l-(s.pVeilLayers-1)/2)*s.pVeilSpacing*.35*v+s.pVeilRipple*rib*v*v+.25*Math.sin(v*Math.PI+shift)*v+wave*.14*v;
   z+=s.pVeilTwist*.16*Math.sin(a)*v;
  }
 }
 const size=s.scale*Math.cbrt(Math.max(.001,s.volume));x*=size*s.stretchX;y*=size*s.stretchY;z*=size*s.stretchZ;
 let c=Math.cos(s.rotateX*rad),n=Math.sin(s.rotateX*rad),q=y*c-z*n;z=y*n+z*c;y=q;
 c=Math.cos(s.rotateY*rad);n=Math.sin(s.rotateY*rad);q=x*c+z*n;z=-x*n+z*c;x=q;
 c=Math.cos(s.rotateZ*rad);n=Math.sin(s.rotateZ*rad);q=x*c-y*n;y=x*n+y*c;x=q;
 return [x+s.positionX,y+s.positionY,z];
}
export function updateVeilMesh(mesh,s,phase){
 const {coords,vertices,triangles,indices,order,depths}=mesh;
 const n=mesh.columns,m=mesh.rows,stride=n+1,perLayer=stride*(m+1);
 for(let i=0;i<coords.length/3;i++){const u=coords[i*3],v=coords[i*3+1],l=coords[i*3+2],p=veilPoint(s,u,v,l,phase),j=i*9;vertices[j]=p[0];vertices[j+1]=p[1];vertices[j+2]=p[2];vertices[j+6]=u;vertices[j+7]=v;vertices[j+8]=l/Math.max(1,mesh.layers-1);}
 for(let l=0;l<mesh.layers;l++)for(let y=0;y<=m;y++)for(let x=0;x<=n;x++){
  const start=l*perLayer,at=(a,b)=>(start+b*stride+a)*9,i=at(x,y),left=at(s.pVeilStyle===1?(x===0?n-1:x-1):Math.max(0,x-1),y),right=at(s.pVeilStyle===1?(x===n?1:x+1):Math.min(n,x+1),y),down=at(x,Math.max(0,y-1)),up=at(x,Math.min(m,y+1));
  const ax=vertices[right]-vertices[left],ay=vertices[right+1]-vertices[left+1],az=vertices[right+2]-vertices[left+2],bx=vertices[up]-vertices[down],by=vertices[up+1]-vertices[down+1],bz=vertices[up+2]-vertices[down+2];const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,len=Math.hypot(nx,ny,nz)||1;vertices[i+3]=nx/len;vertices[i+4]=ny/len;vertices[i+5]=nz/len;
 }
 for(let i=0;i<order.length;i++)depths[i]=(vertices[triangles[i*3]*9+2]+vertices[triangles[i*3+1]*9+2]+vertices[triangles[i*3+2]*9+2])/3;
 // Back-to-front triangle sorting (not only sheet centres), stable at equal depth.
 order.sort((a,b)=>depths[a]-depths[b]||a-b);for(let i=0;i<order.length;i++){const j=order[i]*3;indices[i*3]=triangles[j];indices[i*3+1]=triangles[j+1];indices[i*3+2]=triangles[j+2];}
 return mesh;
}
