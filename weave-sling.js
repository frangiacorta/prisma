// One face of the suspended mesh spans two nodules and an insertion on a
// transverse rib. The attachment IDs stay fixed as the shoot bends.
const pairs=[[0,6,1],[6,8,1],[8,2,1],[2,13,1],[13,15,1],[15,7,1],
 [4,10,1],[10,0,1],[3,11,-1],[11,9,-1],[9,5,-1],[5,1,-1],
 [1,12,-1],[12,14,-1],[14,16,-1],[16,7,-1]];
const faces=pairs.length;
const mix=(a,b,t)=>a+(b-a)*t;
// As fruit spreads out the silk opens into adjoining gores. Each triple
// names permanent nodes of the whorl; the first bears the long warp fibres.
const pouchGores=[
 [7,14,1],[15,13,14],[1,14,16],[1,13,6],[2,6,13],[5,1,6],
 [12,1,5],[9,12,5],[17,5,6],[9,5,17],[2,6,8],[0,2,8],
 [10,0,17],[11,17,10],[4,10,11],[3,11,4]
];
// The hem continues around the junction after the last row of beads.
// Indices 18–23 follow its upper catenary, the remaining pins share the
// transverse and axial rib past the left insertion and the foot.
const hemGores=[
 [7,18,19],[7,19,20],[14,20,21],[14,21,22],[15,22,23],
 [14,7,20],[14,22,15],[1,18,7],[12,7,1],[12,24,1],
 [9,24,12],[11,12,9],[3,25,11],[4,26,3],[2,23,15],
 [1,16,13],[14,13,16],
 // The last row retains a loose backing between its two lower sockets.
 // Individual strands can be seen through it from the opposite face.
 [9,17,11]
];
// Silk coming off the transverse rib doubles back into the side seam.
// Yarn redistribution tapers continuously to a single ply at the free edge.
const seamPlies={1:.03,5:.28,6:.03,9:.75,11:.15,12:.72,17:.03,24:.35,25:.08};
// A loose facing is caught on the outward shoulders of the fruit. It spans
// the air between them and can obscure fruit lying farther down the pocket.
const frontGores=[[7,14,1],[1,14,16],[14,13,16],[14,15,13],[1,16,13],
 [1,13,6],[13,2,6],[1,6,5],[12,1,5],[9,12,5],[5,6,17],[9,5,17]];
const plyWeights=[...pouchGores,...hemGores].map(ids=>'vec3('+ids.map(id=>(seamPlies[id]||0).toFixed(2)).join(',')+')').join(',');
// Only a free edge loses optical density. A sewn internal edge continues
// through the neighbouring panel with the same areal mass.
const edgeKey=(a,b)=>a<b?a+','+b:b+','+a;
const edgeCounts=new Map();
for(const ids of frontGores)for(let j=0;j<3;j++){
 const edge=edgeKey(ids[j],ids[(j+1)%3]);
 edgeCounts.set(edge,(edgeCounts.get(edge)||0)+1);
}
const freeEdges=frontGores.map(([a,b,c])=>[edgeCounts.get(edgeKey(b,c)),edgeCounts.get(edgeKey(c,a)),edgeCounts.get(edgeKey(a,b))]
 .map(count=>count===1?'1.':'0.').join(',')).map(values=>'vec3('+values+')').join(',');

function hemPins(ends) {
 const pins=Array.from(ends),left=7*4,right=15*4,stem=12*4,foot=3*4,outer=4*4;
 const breadth=.85+.30*Math.max(.18,ends[right]-ends[left]);
 const height=Math.max(.35,(ends[left+1]-ends[foot+1])/1.06);
 // The lip belongs to the oblique transverse rib. Its low shoulder is not
 // dragged down when the free upper-right seed slides deeper into the pouch.
 const shoulder=[[-.33,.28],[-.17,.15],[0,.14],[.14,.085],[.26,-.017],[.39,-.084]];
 for(let i=0;i<shoulder.length;i++){
  const [x,y]=shoulder[i],sag=Math.sin(Math.PI*i/(shoulder.length-1));
  pins.push(ends[left]+breadth*x,ends[left+1]+height*y,-.012-.012*sag,0);
 }
 const footX=.5*(ends[foot]+ends[outer]),footY=.5*(ends[foot+1]+ends[outer+1]);
 pins.push(.68*ends[left]+.32*ends[stem]-.18*breadth,.25*ends[stem+1],-.018,0,
           footX-.125*breadth,footY-.105*height,-.01,0,
           footX-.06*breadth,footY-.27*height,-.018,0);
 return pins;
}

function seatGore(pins,ids,corners,pocket) {
 const [a,b,c]=ids.map(id=>4*id);
 const centreX=(pins[a]+pins[b]+pins[c])/3,centreY=(pins[a+1]+pins[b+1]+pins[c+1])/3;
 // The stitch takes up its slack before the membrane is fully taut.
 // Zero slope at full load keeps it seated as the web starts to relax.
 const seated=pocket+pocket*pocket*(1-pocket);
 for(let n=0;n<3;n++){
  const j=4*ids[n],v=corners[n],r=pins[j+3];
  const dx=centreX-pins[j],dy=centreY-pins[j+1],span=Math.max(.0001,Math.hypot(dx,dy));
  // The common insertion sits inside the socket. Each fibre emerges at
  // its intersection with the curved skin, including when a bead swells.
  const latitude=-.81+.09*Math.sin(.93*ids[n]),ring=.29*r;
  v[0]=mix(v[0],pins[j]+ring*dx/span,seated);
  v[1]=mix(v[1],pins[j+1]+ring*dy/span,seated);
  v[2]=mix(v[2],pins[j+2]+r*latitude,seated);
 }
}

export function slingPose(ends,rank,phase,flex,lag,growth,amount,pocket=0){
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
  if(pocket>0){
   // Sew around the back shoulders so the face of each bead stays round.
   seatGore(ends,pouchGores[i],[A,B,C],pocket);
  }
  const span=Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]);
  const strain=Math.max(0,Math.min(1,(span-.10)/.47));
  const tension=strain*strain*(3-2*strain);
  const allowance=.028+.043*(.5+.5*Math.cos(i*2.39));
  const slack=Math.max(.004,allowance*(1-.66*tension)+.009*flex*Math.sin(phase+i*.9)-.023*lag*flex);
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
  vertices.push(...A,slack*(1-.64*pocket)*unfold,...B,runout*(1-pocket),...C,(1-.36*growth)*unfold);
 }
 if(pocket>0){
  const pins=hemPins(ends);
  for(let i=0;i<hemGores.length;i++){
   const [A,B,C]=[[0,0,0],[0,0,0],[0,0,0]];
   seatGore(pins,hemGores[i],[A,B,C],1);
   // The loose roll feeds out of the first socket; no full-size membrane
   // can appear while its load is still zero.
   for(const v of [B,C])for(let d=0;d<3;d++)v[d]=mix(A[d],v[d],pocket);
   for(const v of [A,B,C])for(let d=0;d<2;d++){
    lo[d]=Math.min(lo[d],v[d]);hi[d]=Math.max(hi[d],v[d]);
   }
   const backing=i===hemGores.length-1;
   vertices.push(...A,(backing?.033:.014)*pocket,...B,0,...C,(backing?.70:1.)*(1-.36*growth)*Math.sqrt(amount)*pocket);
  }
 }
 return {vertices:new Float32Array(vertices),bounds:[...lo,...hi],pocket};
}

// Distances in barycentric coordinates are converted back into tissue units.
// The normal displacement is zero along all three sewn edges.
function pouchThread(u,t,a,bb,bc,cc,area,ha,fine,phase,i){
 const radial=Math.max(.04,u+t),across=u/radial;
 const bow=a*t*u*(1.18+.38*Math.sin(6*t+phase));
 // Measure the width perpendicular to this fan. A fixed count would fill
 // every gap when a gore is narrow or two berries catch up with each other.
 const chord=Math.max(.001,Math.sqrt(Math.max(0.,u*u*bb+2*u*t*bc+t*t*cc)));
 const fanWidth=area*2/Math.max(.001,Math.sqrt(Math.max(0.,bb+2*bc+cc)));
 const ends=Math.max(2.8,Math.min(64.,fanWidth*(65.+17.*Math.cos(1.87*i))*fine));
 const warp=(across+bow+.024*Math.sin(13*t-7*u+phase)+.007*Math.sin(37*t+13*u+phase))*ends;
 const id=Math.round(warp),group=.5+.5*Math.sin(Math.floor(id*.5)*2.39+phase);
 const wander=.21*Math.sin(id*3.11+phase)+.16*Math.sin(radial*7+id*1.31+phase);
 const along=Math.abs(warp-id-wander)*area*radial*radial/(chord*ends);
 // Sparse knotted ties join the long strands. Their curvature increases
 // towards the hanging centre while the load-bearing outside stays taut.
 const picks=Math.max(1.5,Math.min(22.,ha*(20.+7.*Math.sin(2.73*i))*fine));
 const cross=(radial+.22*u*t-.065*Math.sin(6*across+phase)*radial)*picks;
 const gap=Math.abs(cross-Math.round(cross)-.19*Math.sin(across*6+phase))*ha/picks;
 return Math.min(along/(.41+.98*group*group),gap*(2.6+1.15*Math.cos(3*across+phase)));
}
export function slingDistance(x,y,z,v,i,finesse,web,pocket=0){
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
 const lip=i>=faces&&i<faces+5;
 const scallop=1-.80*pocket;
 const selvedge=i===faces+10?.72*pocket:.12*scallop;
 const edge=Math.max((-u+.23*scallop*t*a)*hu,(-t+selvedge*u*a)*ht,(-a+(lip?.022:.20*scallop)*t*u)*ha);
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
 const width=(.00074+.00125*web)*(1-.40*pocket);
 let thread=Math.min(f/(.77+.42*vein),cross*1.42,diagonalGap*(1.35+2.4*stitch),-edge*.76);
 if(pocket>0)thread=Math.min(thread+.007*pocket,pouchThread(u,t,a,bb,bc,cc,area,ha,finesse,phase,i)+.007*(1-pocket));
 // The free silk withdraws towards its three contacts under tension.
 // Squared distance keeps a soft round cuff of fibres on each nodule.
 const p2=px*px+py*py+pz*pz,d2=p2+Math.min(0,bb-2*pb,cc-2*pc);
 const fade=Math.max(0,Math.min(1,(d2-.0025)/.031));
 let d=Math.max(edge-.0015,Math.hypot(thread,plane*.75)-width*v[o+11]+.023*v[o+7]*fade*fade*(3-2*fade));
 if(pocket>0){
  // Fine fibres also entangle into patches of gauze behind the stronger
  // warps. Open windows, individual strands and the rim are separate depths.
  const across=u/Math.max(.05,u+t);
  const wave=.5+.25*Math.cos(14*across+6*t+1.5*Math.sin(7*t+phase))+.18*Math.sin(17*t-6*u+phase)+.07*Math.sin(42*t+19*u+phase);
  const binding=i<8||i>=faces&&i<faces+12;
  const seam=i===6||i===7||i>=faces+8&&i<=faces+11;
  // Curl and fray coincide with low yarn density. There is no taut cord
  // along an interior triangle edge unless its strands actually meet there.
  const backing=i===faces+hemGores.length-1;
  // At the two middle stitches beneath the lip the warp is pulled taut,
  // leaving a gauzy window between the outer hem and the nearby sockets.
  const crown=i===faces+1||i===faces+2||i===faces+5;
  const depth=(lip?a:1-t)-.41;
  const opening=crown?Math.exp(-22*depth*depth):0;
  const threshold=(seam?.028:binding?.10:backing?.35:.22)+.60*opening;
  const fuzz=.004*Math.sin(37*u+19*t+phase)*Math.sin(23*t-41*u);
  const drift=belly*(.004+.002*Math.cos(18*t-9*u+phase));
  const veil=Math.max(edge+fuzz-.002,Math.abs(plane+.003+drift)-.00105*pocket,(threshold-wave)*.042+.014*(1-pocket));
  d=Math.min(d,veil);
  if(lip){
   const hem=Math.hypot(ha*(a-.022*t*u),plane*.83)-(.004+.0024*web)*pocket;
   d=Math.min(d,Math.max(hem,Math.max(-u*hu,-t*ht)-.003));
  }
 }
 return d;
}

export const SLING_BASE_COUNT=faces;
export const SLING_COUNT=faces+hemGores.length;
export const SLING_GLSL=`
uniform vec4 uTissueSling[${SLING_COUNT*3}];
uniform float uTissueSlingLoad;
const vec3 tissueSeamPlies[${SLING_COUNT}]=vec3[${SLING_COUNT}](${plyWeights});

#ifdef WEAVE_HIT_TAG
// Expected coverage of crimped fibres across a pixel. Fibre diameters and
// spacing vary independently. Distant pieces retain their integrated mass.
float tissueBatt(vec2 uv,float footprint){
 float first=floor(uv.x),mass=0.;
 for(int k=-1;k<=1;k++){
  float id=first+float(k);
  vec2 seed=fract(sin(id*vec2(12.49,29.36)+vec2(3.11,7.3))*vec2(1513.71,3098.93));
  float crimp=(.12+.21*seed.y)*sin((1.+.81*seed.x)*uv.y+id*3.42)+.09*cos(2.58*uv.y+id*2.11);
  float dx=uv.x-id-(.08+.84*seed.x)-crimp;
  float r=.031+.118*seed.y*seed.y,variance=r*r+footprint*footprint*.08333;
  mass+=r*inversesqrt(variance)*exp(-.5*dx*dx/variance);
 }
 return mix(mass,.18,smoothstep(.65,1.6,footprint));
}
#endif
float tissuePouchThread(float u,float t,float a,float bb,float bc,float cc,float area,float ha,float fine,float phase,float i){
 float radial=max(.04,u+t),across=u/radial;
 float bow=a*t*u*(1.18+.38*sin(6.*t+phase));
 float chord=max(.001,sqrt(max(0.,u*u*bb+2.*u*t*bc+t*t*cc)));
 float fanWidth=area*2./max(.001,sqrt(max(0.,bb+2.*bc+cc)));
 float ends=clamp(fanWidth*(65.+17.*cos(1.87*i))*fine,2.8,64.);
 float warp=(across+bow+.024*sin(13.*t-7.*u+phase)+.007*sin(37.*t+13.*u+phase))*ends;
 float id=floor(warp+.5),group=.5+.5*sin(floor(id*.5)*2.39+phase);
 float wander=.21*sin(id*3.11+phase)+.16*sin(radial*7.+id*1.31+phase);
 float along=abs(warp-id-wander)*area*radial*radial/(chord*ends);
 float picks=clamp(ha*(20.+7.*sin(2.73*i))*fine,1.5,22.);
 float weft=(radial+.22*u*t-.065*sin(6.*across+phase)*radial)*picks;
 float gap=abs(weft-floor(weft+.5)-.19*sin(across*6.+phase))*ha/picks;
 return min(along/(.41+.98*group*group),gap*(2.6+1.15*cos(3.*across+phase)));
}
float tissueSling(vec3 q,int i,float fine,float web,out float silkMaterial){
 silkMaterial=.91;
 vec4 A=uTissueSling[3*i],B=uTissueSling[3*i+1],C=uTissueSling[3*i+2];
 vec3 b=B.xyz-A.xyz,c=C.xyz-A.xyz,p=q-A.xyz;
 vec3 box=max(min(min(vec3(0.),b),c)-p,p-max(max(vec3(0.),b),c));
 float bound=max(box.x,max(box.y,box.z))-A.w-.007;
 if(bound>.012)return bound;
 vec3 normal=cross(b,c);float area=max(.000001,length(normal));
 float bb=dot(b,b),cc=dot(c,c),bc=dot(b,c),pb=dot(p,b),pc=dot(p,c);
 float u=(pb*cc-pc*bc)/(area*area),t=(pc*bb-pb*bc)/(area*area),a=1.-u-t;
 float hu=area/max(.001,sqrt(cc)),ht=area/max(.001,sqrt(bb)),ha=area/max(.001,length(b-c));
 bool lip=i>=${faces}&&i<${faces+5};
 float scallop=1.-.80*uTissueSlingLoad;
 float selvedge=i==${faces+10}?.72*uTissueSlingLoad:.12*scallop;
 float edge=max((-u+.23*scallop*t*a)*hu,max((-t+selvedge*u*a)*ht,(-a+(lip?.022:.20*scallop)*t*u)*ha));
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
 if(uTissueSlingLoad>0.)thread=min(thread+.007*uTissueSlingLoad,tissuePouchThread(u,t,a,bb,bc,cc,area,ha,fine,phase,float(i))+.007*(1.-uTissueSlingLoad));
 float support2=dot(p,p)+min(0.,min(bb-2.*pb,cc-2.*pc));
 float taper=.023*B.w*smoothstep(.0025,.0335,support2);
 float d=max(edge-.0015,length(vec2(thread,plane*.75))-(.00074+.00125*web)*(1.-.40*uTissueSlingLoad)*C.w+taper);
 if(uTissueSlingLoad>0.){
  float across=u/max(.05,u+t);
  float density=.5+.25*cos(14.*across+6.*t+1.5*sin(7.*t+phase))+.18*sin(17.*t-6.*u+phase)+.07*sin(42.*t+19.*u+phase);
  bool binding=i<8||i>=${faces}&&i<${faces+12},seam=i==6||i==7||i>=${faces+8}&&i<=${faces+11};
  bool backing=i==${faces+hemGores.length-1};
  bool crown=i==${faces+1}||i==${faces+2}||i==${faces+5};
  float depth=(lip?a:1.-t)-.41;
  float opening=crown?exp(-22.*depth*depth):0.;
  float threshold=(seam?.028:binding?.10:backing?.35:.22)+.60*opening;
  float fuzz=.004*sin(37.*u+19.*t+phase)*sin(23.*t-41.*u);
  float drift=belly*(.004+.002*cos(18.*t-9.*u+phase));
  float veil=max(edge+fuzz-.002,max(abs(plane+.003+drift)-.00105*uTissueSlingLoad,(threshold-density)*.042+.014*(1.-uTissueSlingLoad)));
  if(veil<d){
   d=veil;
   float mass=smoothstep(threshold-.03,threshold+.53,density)*mix(.20,1.,smoothstep(-.003,.033,-edge-fuzz));
   silkMaterial=.39+.06*mass*(backing?.75:1.);
  }
  if(lip){
   float hem=length(vec2(ha*(a-.022*t*u),plane*.83))-(.004+.0024*web)*uTissueSlingLoad;
   hem=max(hem,max(-u*hu,-t*ht)-.003);
   if(hem<d){d=hem;silkMaterial=.91;}
  }
  float fold=clamp(dot(vec3(a,u,t),tissueSeamPlies[i]),0.,1.);
  if(fold>.015){
   // Separate material coordinates preserve the pores and the underlying
   // beads; only light crossing doubled silk sees the extra optical depth.
   silkMaterial=silkMaterial<.48?.49+.065*fold:.565+.065*fold;
  }
 }
 return d;
}
`;

// The web has loose surface fibres above the stronger yarn. They contribute
// optical depth at nearby surfaces, independently of their solid intersection.
export const FACING_GLSL=`
#ifdef WEAVE_HIT_TAG
const ivec3 facingTips[${frontGores.length}]=ivec3[${frontGores.length}](${frontGores.map(ids=>'ivec3('+ids.join(',')+')').join(',')});
const vec3 facingHems[${frontGores.length}]=vec3[${frontGores.length}](${freeEdges});
vec3 silkShoulder(int id){
 vec4 tip=uTissueEnd[id];
 return tip.xyz+tip.w*vec3(-.22,.25,1.08+.24*cos(float(id)*2.4));
}
float tissueFacing(vec3 q){
 float coverage=0.;
 for(int i=0;i<${frontGores.length};i++){
  ivec3 ids=facingTips[i];vec3 a=silkShoulder(ids.x),b=silkShoulder(ids.y),c=silkShoulder(ids.z);
  vec2 outside=max(min(a.xy,min(b.xy,c.xy))-q.xy,q.xy-max(a.xy,max(b.xy,c.xy)));
  if(max(outside.x,outside.y)>.045)continue;
  vec2 ab=b.xy-a.xy,ac=c.xy-a.xy,ap=q.xy-a.xy;
  float det=ab.x*ac.y-ab.y*ac.x;
  if(abs(det)<.00001)continue;
  float u=(ap.x*ac.y-ap.y*ac.x)/det,v=(ab.x*ap.y-ab.y*ap.x)/det;
  vec3 bary=vec3(1.-u-v,u,v);
  vec3 inset=bary*abs(det)/max(vec3(.001),vec3(length(c.xy-b.xy),length(ac),length(ab)));
  vec3 hem=inset+.15*(1.-facingHems[i]);
  float silhouette=smoothstep(-.044,.063,min(hem.x,min(hem.y,hem.z)));
  float seat=smoothstep(-.036,.001,min(inset.x,min(inset.y,inset.z)));
  float gap=dot(bary,vec3(a.z,b.z,c.z))-q.z;
  float thickness=smoothstep(-.038,.030,gap)*(1.-smoothstep(.09,.32,gap));
  coverage=max(coverage,seat*silhouette*thickness);
 }
 // Loose silk is gathered at the upper attachments. The facing thins
 // down the hanging pocket, exposing the fruit against the darker yarn.
 float foot=.5*(uTissueEnd[3].y+uTissueEnd[4].y);
 float crown=.5*(uTissueEnd[7].y+uTissueEnd[14].y);
 float height=(q.y-foot)/max(.045,crown-foot);
 return coverage*mix(.16,1.,smoothstep(.54,.91,height));
}
#endif
`;
