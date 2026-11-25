// One face of the suspended mesh spans two nodules and an insertion on a
// transverse rib. The attachment IDs stay fixed as the shoot bends.
const pairs=[[0,6,1],[6,8,1],[8,2,1],[2,13,1],[13,15,1],[15,7,1],
 [4,10,1],[10,0,1],[3,11,-1],[11,9,-1],[9,5,-1],[5,1,-1],
 [1,12,-1],[12,14,-1],[14,16,-1],[16,7,-1]];
const faces=pairs.length;
const mix=(a,b,t)=>a+(b-a)*t;

export function slingPose(ends,rank,phase,flex,lag,growth,amount){
 const vertices=[],lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];
 const spine=y=>rank*(-.164*Math.sin(y*2*Math.PI/1.65)-.081*(1-Math.cos(y*2*Math.PI/1.65)));
 for(let i=0;i<faces;i++){
  const [a,b,side]=pairs[i],ai=4*a,bi=4*b;
  // Sew incoming and outgoing fibres on opposite shoulders of a bead.
  // These are fixed points of its skin as it lifts or settles back.
  const contact=(j,azimuth)=>{
   const latitude=-.36-.21*(.5+.5*Math.sin(i*2.31+j*.57));
   const angle=side*azimuth+.29*Math.sin(i*2.39+j*.43);
   const ring=ends[j+3]*.91*Math.sqrt(1-latitude*latitude);
   return [ends[j]+ring*Math.sin(angle),ends[j+1]+latitude*ends[j+3],ends[j+2]+ring*Math.cos(angle)];
  };
  const A=contact(ai,-.91),B=contact(bi,2.14);
  // Choose a fixed material point on the adjacent curved transverse rib.
  const upper=i===3||i===4||i===5||i>=13;
  const t=(.085+.135*(.5+.5*Math.sin((i+.7)*2.36)))*(side>0?1:-1);
  const from=upper?(side>0?1.07:.37+.18*rank):(side>0?.09*rank:-.10*rank);
  const to=upper?(side>0?.37+.18*rank:1.07):-from;
  const y=mix(from,to,Math.abs(t))+(upper?-.105:.07)*Math.sin(Math.abs(t)*Math.PI);
  const x=mix(spine(from),side*1.22+spine(to),Math.abs(t));
  const z=-.009*Math.cos(Math.PI*x/1.22)*Math.cos(Math.PI*y/1.65);
  const span=Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]);
  const strain=Math.max(0,Math.min(1,(span-.10)/.47));
  const tension=strain*strain*(3-2*strain);
  const allowance=.028+.043*(.5+.5*Math.cos(i*2.39));
  const slack=Math.max(.004,allowance*(1-.66*tension)+.009*flex*Math.sin(phase+i*.9)-.023*lag*flex);
  const unfold=Math.sqrt(amount),C=[x,y,z];
  // Pull the edge of the pouch in towards the stem during extension.
  // As it retracts the nodules settle back into a common hammock.
  const midY=(A[1]+B[1])*.5;
  // Upper faces sew onto the median rib. Lower faces sew onto the bridge
  // itself, including its sag. Interpolating between those two curves
  // would leave a pointed corner hanging in an opening.
  if(upper||i%3===1){
   C[1]=midY+(side>0?.064:-.049)*(1-.55*growth);
   C[0]=spine(C[1]);C[2]=.010*Math.cos(Math.PI*C[1]/1.65);
  }
  // A finite veil of silk is carried at each insertion. The longest span
  // takes up that reserve first. Below the natural span both hems stay sewn.
  const freeLength=Math.max(span,Math.hypot(C[0]-A[0],C[1]-A[1],C[2]-A[2]),Math.hypot(C[0]-B[0],C[1]-B[1],C[2]-B[2]));
  const reserve=.30+1.25*(ends[ai+3]+ends[bi+3]);
  const pull=Math.max(0,Math.min(1,(freeLength-reserve)/.25));
  const runout=pull*pull*(3-2*pull);
  for(let k=0;k<3;k++){B[k]=mix(A[k],B[k],unfold);C[k]=mix(A[k],C[k],unfold);}
  for(const q of [A,B,C]){
   lo[0]=Math.min(lo[0],q[0]);lo[1]=Math.min(lo[1],q[1]);hi[0]=Math.max(hi[0],q[0]);hi[1]=Math.max(hi[1],q[1]);
  }
  vertices.push(...A,slack*unfold,...B,runout,...C,(1-.36*growth)*unfold);
 }
 return {vertices:new Float32Array(vertices),bounds:[...lo,...hi]};
}

// Distances in barycentric coordinates are converted back into tissue units.
// The normal displacement is zero along all three sewn edges.
export function slingDistance(x,y,z,v,i,finesse,web){
 const o=12*i;
 const ax=v[o],ay=v[o+1],az=v[o+2],bx=v[o+4]-ax,by=v[o+5]-ay,bz=v[o+6]-az;
 const cx=v[o+8]-ax,cy=v[o+9]-ay,cz=v[o+10]-az,slack=v[o+3];
 const px=x-ax,py=y-ay,pz=z-az;
 const box=Math.max(Math.min(0,bx,cx)-px,px-Math.max(0,bx,cx),Math.min(0,by,cy)-py,py-Math.max(0,by,cy),Math.min(0,bz,cz)-pz,pz-Math.max(0,bz,cz))-slack-.007;
 if(box>.012)return box;
 const nx=by*cz-bz*cy,ny=bz*cx-bx*cz,nz=bx*cy-by*cx,area=Math.max(.000001,Math.hypot(nx,ny,nz));
 const bb=bx*bx+by*by+bz*bz,cc=cx*cx+cy*cy+cz*cz,bc=bx*cx+by*cy+bz*cz;
 const pb=px*bx+py*by+pz*bz,pc=px*cx+py*cy+pz*cz;
 const u=(pb*cc-pc*bc)/(area*area),t=(pc*bb-pb*bc)/(area*area),a=1-u-t;
 const hu=area/Math.max(.001,Math.sqrt(cc)),ht=area/Math.max(.001,Math.sqrt(bb)),ha=area/Math.max(.001,Math.hypot(bx-cx,by-cy,bz-cz));
 const edge=Math.max((-u+.23*t*a)*hu,(-t+.12*u*a)*ht,(-a+.20*t*u)*ha);
 if(edge>.012)return edge;
 // A hanging sheet cups more deeply on the unloaded side. The deflection
 // and its fine folds vanish at every seam, including when two beads meet.
 const phase=i*.633;
 const belly=Math.max(0,27*a*u*t),skew=.81+.26*Math.sin(5*u-3*t+phase);
 const sag=slack*belly*skew,plane=(px*nx+py*ny+pz*nz)/area+(nz<0?-1:1)*sag;
 const bend=a*t*(.48+.22*Math.sin(6*u+phase));
 // Filaments are sewn at rest. Stretching changes the weave spacing, never
 // the number of strands already holding a bead.
 const m=(5.1+2.4*Math.cos(i*2.31))*finesse,n=(8.3+3.6*Math.sin(i*1.87))*finesse;
 const wave=Math.sin(14*u+3*t+phase)+Math.sin(7*u-13*t);
 const fan=Math.max(.19,.25+u+t);
 const tuck=belly*.035*Math.sin(11*u+5*t+phase);
 const g=(u/fan+bend+.17*a*t*wave+tuck)*n,h=(t+.28*u*a+.16*a*u*wave-.69*tuck)*m;
 const gi=Math.round(g),hi=Math.round(h),f=Math.abs(g-gi-.26*Math.sin(gi*9.31+phase))*hu*fan/n;
 const cross=Math.abs(h-hi-.32*Math.sin(hi*7.81+1.17*phase+u*5))*ht/m;
 const diagonal=(g*.49+h*.66+.34*Math.sin(8*u+12*t+phase));
 const diagonalGap=Math.abs(diagonal-Math.round(diagonal))*Math.min(hu/n,ht/m);
 // Paired fibres thicken along the load-bearing spokes. Oblique stitches
 // taper between them, leaving irregular windows where the gauze is slack.
 const vein=.5+.5*Math.sin(gi*4.31+phase);
 const stitch=.5+.5*Math.sin(hi*3.1+phase+7*u);
 const width=.00074+.00125*web,thread=Math.min(f/(.77+.42*vein),cross*1.42,diagonalGap*(1.35+2.4*stitch),-edge*.76);
 // The free silk withdraws towards its three contacts under tension.
 // Squared distance keeps a soft round cuff of fibres on each nodule.
 const p2=px*px+py*py+pz*pz,d2=p2+Math.min(0,bb-2*pb,cc-2*pc);
 const fade=Math.max(0,Math.min(1,(d2-.0025)/.031));
 return Math.max(edge-.0015,Math.hypot(thread,plane*.75)-width*v[o+11]+.023*v[o+7]*fade*fade*(3-2*fade));
}

export const SLING_COUNT=faces;
export const SLING_GLSL=`
uniform vec4 uTissueSling[${faces*3}];
float tissueSling(vec3 q,int i,float fine,float web){
 vec4 A=uTissueSling[3*i],B=uTissueSling[3*i+1],C=uTissueSling[3*i+2];
 vec3 b=B.xyz-A.xyz,c=C.xyz-A.xyz,p=q-A.xyz;
 vec3 box=max(min(min(vec3(0.),b),c)-p,p-max(max(vec3(0.),b),c));
 float bound=max(box.x,max(box.y,box.z))-A.w-.007;
 if(bound>.012)return bound;
 vec3 normal=cross(b,c);float area=max(.000001,length(normal));
 float bb=dot(b,b),cc=dot(c,c),bc=dot(b,c),pb=dot(p,b),pc=dot(p,c);
 float u=(pb*cc-pc*bc)/(area*area),t=(pc*bb-pb*bc)/(area*area),a=1.-u-t;
 float hu=area/max(.001,sqrt(cc)),ht=area/max(.001,sqrt(bb)),ha=area/max(.001,length(b-c));
 float edge=max((-u+.23*t*a)*hu,max((-t+.12*u*a)*ht,(-a+.20*t*u)*ha));
 if(edge>.012)return edge;
 float phase=float(i)*.633;
 float belly=max(0.,27.*a*u*t),skew=.81+.26*sin(5.*u-3.*t+phase);
 float sag=A.w*belly*skew,plane=dot(p,normal)/area+(normal.z<0.?-1.:1.)*sag;
 float bend=a*t*(.48+.22*sin(6.*u+phase));
 vec2 counts=vec2(8.3+3.6*sin(float(i)*1.87),5.1+2.4*cos(float(i)*2.31))*fine;
 float wave=sin(14.*u+3.*t+phase)+sin(7.*u-13.*t);
 float fan=max(.19,.25+u+t);
 float tuck=belly*.035*sin(11.*u+5.*t+phase);
 vec2 cells=vec2(u/fan+bend+.17*a*t*wave+tuck,t+.28*u*a+.16*a*u*wave-.69*tuck)*counts;
 vec2 site=floor(cells+.5);
 vec2 jitter=vec2(.26*sin(site.x*9.31+phase),.32*sin(site.y*7.81+1.17*phase+u*5.));
 vec2 lines=abs(cells-site-jitter)*vec2(hu*fan,ht)/counts;
 float diagonal=dot(cells,vec2(.49,.66))+.34*sin(8.*u+12.*t+phase);
 float diaGap=abs(diagonal-floor(diagonal+.5))*min(hu/counts.x,ht/counts.y);
 float vein=.5+.5*sin(site.x*4.31+phase),stitch=.5+.5*sin(site.y*3.1+phase+7.*u);
 float thread=min(min(lines.x/(.77+.42*vein),lines.y*1.42),min(diaGap*(1.35+2.4*stitch),-edge*.76));
 float support2=dot(p,p)+min(0.,min(bb-2.*pb,cc-2.*pc));
 float taper=.023*B.w*smoothstep(.0025,.0335,support2);
 return max(edge-.0015,length(vec2(thread,plane*.75))-(.00074+.00125*web)*C.w+taper);
}
`;
