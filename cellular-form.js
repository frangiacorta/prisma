const TAU=Math.PI*2;
const BUBBLE_MAX=32;
const SPINE_MAX=12;
const GOLDEN_ANGLE=Math.PI*(3-Math.sqrt(5));

export const CELLULAR_SHAPE={
 cellMorph:['Sviluppo cellulare',0,1,.01,0],
 cellCore:['Raggio del nucleo',.35,1.25,.01,.68],
 cellBubbles:['Crescita delle cellule',0,1,.01,1],
 cellCount:['Numero di cellule',3,BUBBLE_MAX,1,26],
 cellSize:['Diametro medio delle cellule',.14,1.4,.01,.51],
 cellSizeVariation:['Variazione delle dimensioni',0,1,.01,.69],
 cellExposure:['Sporgenza delle cellule',0,1,.01,.51],
 cellStretch:['Allungamento radiale',0,1,.01,.15],
 cellSpread:['Distribuzione sulla sfera',0,1,.01,1],
 cellJoin:['Fusione alla base',0,.24,.005,.085],
 cellSpines:['Crescita delle spine',0,1,.01,1],
 cellSpineCount:['Numero di spine',1,SPINE_MAX,1,7],
 cellSpineLength:['Lunghezza delle spine',.06,2.4,.01,1.22],
 cellSpineWidth:['Larghezza alla base',.03,.55,.01,.29],
 cellSpineTaper:['Affusolamento',0,1,.01,.94],
 cellSpineBend:['Curvatura delle spine',0,1,.01,.19],
 cellSpineVariation:['Variazione delle spine',0,1,.01,.66],
 cellSeed:['Variante della distribuzione',0,9999,1,811],
};
export const CELLULAR_POSE={
 cellBreath:['Respiro delle cellule',0,1,.01,.24],
 cellFlex:['Flessione delle spine',0,1,.01,.26],
 cellBreathPhase:['Fase delle cellule',0,1,.01,0],
 cellSpinePhase:['Fase delle spine',0,1,.01,0],
};
export const CELLULAR_MATERIAL={
 cellPearl:['Madreperla',0,1,.01,.96],
 cellFilm:['Spessore della pellicola cellulare',130,900,5,395],
 cellColorSpread:['Variazione cromatica',0,1,.01,.66],
 cellClarity:['Trasparenza delle cellule',0,1,.01,.67],
};
const parameters={...CELLULAR_SHAPE,...CELLULAR_POSE,...CELLULAR_MATERIAL};
export const CELLULAR_DEFAULTS=Object.fromEntries(Object.entries(parameters).map(([key,m])=>[key,m[4]]));
export const CELLULAR_META=Object.fromEntries(Object.entries(parameters).map(([key,m])=>[key,m.slice(0,4)]));
export const CELLULAR_FIELD_KEYS=[...Object.keys(CELLULAR_SHAPE),...Object.keys(CELLULAR_POSE)];
export const CELLULAR_TRACKS=Object.fromEntries([
 'cellMorph','cellBubbles','cellExposure','cellSpines','cellSpineLength','cellSpineBend','cellBreathPhase','cellSpinePhase','cellFilm',
].map(key=>[key,[CELLULAR_META[key][0],0,...CELLULAR_META[key].slice(2)]]));
export const CELLULAR_PHASES=['cellBreathPhase','cellSpinePhase'];

export function animateCellular(s){
 const cycle={enabled:true,mode:'cycle',amplitude:1,cycles:1,phase:0,direction:1,pace:0,hold:0};
 s.cellMorph=.5;
 s.motions.cellMorph={...s.motions.cellMorph,...cycle,mode:'wave',amplitude:.5,phase:270,curve:'sine'};
 for(const key of CELLULAR_PHASES)if(!s.motions[key]?.enabled)s.motions[key]={...s.motions[key],...cycle};
 return s;
}

export function cellularMayChange(s){
 return (s.cellMorph||0)>0||!!(s.motions?.cellMorph?.enabled&&s.motions.cellMorph.amplitude);
}

function hash(seed,index){
 let n=Math.imul(seed^Math.imul(index+1,0x9e3779b1),0x85ebca6b);
 n=Math.imul(n^(n>>>16),0x7feb352d);
 return ((n^(n>>>15))>>>0)/4294967296;
}
function direction(index,count,spread,seed){
 const y=(1-2*(index+.5)/count)*spread;
 const angle=index*GOLDEN_ANGLE+hash(seed,0)*TAU+(hash(seed,index+1)-.5)*.5;
 const radius=Math.sqrt(1-y*y);
 return [radius*Math.cos(angle),y,radius*Math.sin(angle)];
}
const phaseAngle=(value=0)=>(value-Math.floor(value))*TAU;
const mix=(a,b,t)=>a+(b-a)*t;
const smoothMin=(a,b,k)=>Math.min(a,b)-Math.max(k-Math.abs(a-b),0)**2/Math.max(.00001,4*k);
let cachedKey,cachedGeometry;

function cellularGeometry(s){
 const key=CELLULAR_FIELD_KEYS.map(key=>s[key]??CELLULAR_DEFAULTS[key]).join('|');
 if(key===cachedKey)return cachedGeometry;
 const v={...CELLULAR_DEFAULTS,...s},seed=v.cellSeed>>>0;
 const morph=v.cellMorph,core=mix(1,v.cellCore,morph);
 const growth=v.cellBubbles*morph,spineGrowth=v.cellSpines*morph;
 const cells=[],spines=[];
 let radius=core;
 if(growth>.000001){
  const count=Math.round(v.cellCount),phase=phaseAngle(v.cellBreathPhase);
  for(let i=0;i<count;i++){
   const axis=direction(i,count,v.cellSpread,seed),noise=hash(seed,i+41),offset=hash(seed,i+83);
   const rest=v.cellSize*.5*mix(1,.36+noise**1.3*1.34,v.cellSizeVariation);
   const breathing=1+v.cellBreath*.32*Math.sin(phase+i*GOLDEN_ANGLE);
   const width=rest*growth*breathing,elongation=1+v.cellStretch*(.66+offset*1.85)*growth;
   const center=core+rest*growth*(mix(-.88,.49,v.cellExposure)+(offset-.5)*.62*v.cellSizeVariation);
   cells.push({axis,center:axis.map(n=>n*center),width,elongation});
   radius=Math.max(radius,center+width*elongation);
  }
 }
 if(spineGrowth>.000001){
  const count=Math.round(v.cellSpineCount),phase=phaseAngle(v.cellSpinePhase),spineSeed=seed^0x1ae9a31;
  for(let i=0;i<count;i++){
   const axis=direction(i,count,v.cellSpread,spineSeed);
   const tangentScale=Math.hypot(axis[0],axis[2]);
   const tangent=[-axis[2]/tangentScale,0,axis[0]/tangentScale];
   const cross=[axis[1]*tangent[2],tangentScale,-axis[1]*tangent[0]];
   const angle=hash(spineSeed,i+24)*TAU,offset=i*GOLDEN_ANGLE;
   const length=v.cellSpineLength*spineGrowth*mix(1,.37+hash(spineSeed,i+38)*.95,v.cellSpineVariation)
     *(1+v.cellFlex*.30*Math.sin(phase+offset));
   const bend=length*(v.cellSpineBend*(.23+hash(spineSeed,i+56)*.44)+v.cellFlex*.23*Math.cos(phase+offset));
   const deflection=tangent.map((n,k)=>(n*Math.cos(angle)+cross[k]*Math.sin(angle))*bend);
   const width=v.cellSpineWidth*spineGrowth*mix(1,.57+hash(spineSeed,i+69)*.69,v.cellSpineVariation);
   spines.push({axis,deflection,length,width});
   radius=Math.max(radius,Math.hypot(core+length,Math.abs(bend))+width);
  }
 }
 cachedKey=key;
 return cachedGeometry={cells,spines,core,morph,join:v.cellJoin*morph,taper:v.cellSpineTaper,radius};
}

export function cellularBounds(s){
 if(!(s.cellMorph>0))return 1;
 const g=cellularGeometry(s);
 return Math.max(1,g.radius+g.join+.035);
}

// Local signed distance for CPU field queries and the matching GLSL below.
export function cellularField(s,base,p){
 if(!(s.cellMorph>0))return base;
 const g=cellularGeometry(s);
 let d=base+1-g.core;
 for(const {axis,center,width,elongation} of g.cells){
  const x=p[0]-center[0],y=p[1]-center[1],z=p[2]-center[2];
  const axial=x*axis[0]+y*axis[1]+z*axis[2];
  const bubble=Math.sqrt(Math.max(0,x*x+y*y+z*z-axial*axial*(1-1/elongation**2)))-width;
  d=smoothMin(d,bubble,g.join);
 }
 for(const {axis,deflection,length,width} of g.spines){
  const axial=p[0]*axis[0]+p[1]*axis[1]+p[2]*axis[2]-g.core;
  const t=Math.max(0,Math.min(1,axial/Math.max(.0001,length)));
  const u=1-t,bend=t*t,start=g.core+t*length;
  const profile=width*mix(.48+.52*u,.055+.945*u*u*u,g.taper);
  const spine=Math.hypot(p[0]-axis[0]*start-deflection[0]*bend,p[1]-axis[1]*start-deflection[1]*bend,p[2]-axis[2]*start-deflection[2]*bend)-profile;
  const slope=2*Math.hypot(...deflection)/Math.max(.01,length)+3*width/Math.max(.01,length);
  d=smoothMin(d,spine/Math.hypot(1,slope),g.join*.65);
 }
 return d;
}

export function uploadCellular(s,gl,locations,geometry){
 const morph=s.cellMorph||0;
 if(locations.uCellOptics)gl.uniform4fv(locations.uCellOptics,[
  morph*(s.cellPearl??CELLULAR_DEFAULTS.cellPearl),s.cellFilm??CELLULAR_DEFAULTS.cellFilm,
  s.cellColorSpread??CELLULAR_DEFAULTS.cellColorSpread,morph*(s.cellClarity??CELLULAR_DEFAULTS.cellClarity),
 ]);
 if(locations.uCellCore)gl.uniform1f(locations.uCellCore,mix(1,s.cellCore??CELLULAR_DEFAULTS.cellCore,morph));
 if(locations.uCellMorph)gl.uniform1f(locations.uCellMorph,morph);
 if(!locations.uCellBubbles&&!locations.uCellGeometry)return;
 if(!morph){
  gl.uniform2i(locations.uCellCounts,0,0);
  return;
 }
 const g=cellularGeometry(s);
 gl.uniform2i(locations.uCellCounts,g.cells.length,g.spines.length);
 if(g.cells.length){
  gl.uniform4fv(locations.uCellBubbles,g.cells.flatMap(c=>[...c.center,c.width]));
  gl.uniform4fv(locations.uCellAxes,g.cells.flatMap(c=>[...c.axis,1-1/c.elongation**2]));
 }
 if(!geometry||!locations.uCellGeometry)return;
 gl.uniform2f(locations.uCellGeometry,g.join,g.taper);
 if(g.spines.length){
  gl.uniform4fv(locations.uCellSpines,g.spines.flatMap(c=>[...c.axis,c.length]));
  gl.uniform4fv(locations.uCellBends,g.spines.flatMap(c=>[...c.deflection,c.width]));
 }
}

export const CELLULAR_GLSL=`
uniform float uCellCore,uCellMorph;
uniform vec4 uCellOptics;
uniform ivec2 uCellCounts;
uniform vec4 uCellBubbles[${BUBBLE_MAX}],uCellAxes[${BUBBLE_MAX}];
#if CELLULAR_GEOMETRY
uniform vec2 uCellGeometry;
uniform vec4 uCellSpines[${SPINE_MAX}],uCellBends[${SPINE_MAX}];
float cellularField(float base,vec3 p){
 if(uCellMorph<=0.)return base;
 float join=uCellGeometry.x,d=base+1.-uCellCore;
 for(int i=0;i<uCellCounts.x;i++){
  vec4 bubble=uCellBubbles[i],axis=uCellAxes[i];
  vec3 q=p-bubble.xyz;
  float axial=dot(q,axis.xyz);
  float distance=sqrt(max(0.,dot(q,q)-axial*axial*axis.w))-bubble.w;
  d=-smax(-d,-distance,join);
 }
 for(int i=0;i<uCellCounts.y;i++){
  vec4 spine=uCellSpines[i],bend=uCellBends[i];
  float axial=dot(p,spine.xyz)-uCellCore;
  float t=clamp(axial/max(.0001,spine.w),0.,1.),u=1.-t;
  float width=bend.w*mix(.48+.52*u,.055+.945*u*u*u,uCellGeometry.y);
  float slope=(2.*length(bend.xyz)+3.*bend.w)/max(.01,spine.w);
  vec3 q=p-spine.xyz*(uCellCore+t*spine.w)-bend.xyz*(t*t);
  float distance=(length(q)-width)*inversesqrt(1.+slope*slope);
  d=-smax(-d,-distance,join*.65);
 }
 return d;
}
#else
float cellularField(float base,vec3 p){return base;}
#endif

// Three broad, overlapping wavelengths model a soft film response. The
// coloured lobe strengthens towards grazing angles on each rounded cell.
vec3 cellularInterference(vec3 p,float facing){
 float variation=sin(dot(p,vec3(7.3,3.4,-4.8))+1.6*sin(p.z*7.1+p.y*2.2));
 float thickness=uCellOptics.y+uCellOptics.z*(115.*variation+35.*sin(p.x*13.-p.y*9.));
 float incidence=sqrt(max(.001,1.-(1.-facing*facing)/(1.34*1.34)));
 vec3 wave=cos(4.*PI*1.34*max(40.,thickness)*incidence/vec3(625.,535.,450.)+PI);
 return mix(vec3(.35),.5+.5*wave,.55+uCellOptics.z*.45);
}

// A cheap single-scatter approximation adds the contours of the other
// cells along the view ray. The intersected ellipsoids are the actual volumes.
vec3 cellularInterior(vec3 p,vec3 ray){
 vec3 scattered=vec3(0.);
 for(int i=0;i<uCellCounts.x;i++){
  vec4 bubble=uCellBubbles[i],axis=uCellAxes[i];
  vec3 q=p-bubble.xyz;
  float qr=dot(q,axis.xyz),vr=dot(ray,axis.xyz);
  float a=1.-axis.w*vr*vr,b=dot(q,ray)-axis.w*qr*vr;
  float depth=-b/a;
  if(depth<.09)continue;
  float distance=sqrt(max(0.,dot(q,q)-axis.w*qr*qr+b*depth))/max(.001,bubble.w);
  if(distance>1.05)continue;
  float contour=smoothstep(.68,.96,distance)*(1.-smoothstep(.96,1.05,distance));
  float body=(1.-smoothstep(.3,1.,distance))*.16;
  vec3 tint=cellularInterference(bubble.xyz,.22+max(0.,1.-distance)*.4);
  scattered+=(contour*.63+body)*mix(vec3(.86,.93,1.),tint,.53)*exp(-depth*1.24);
 }
 return scattered/(1.+scattered);
}
`;

export const CELLULAR_HELP={
 cellMorph:'A zero mantiene la forma di base. Aumentandolo crescono cellule e spine e si riduce il nucleo. Puoi animare l’intero passaggio in Movimento.',
 cellCore:'Dimensione del corpo centrale da cui crescono cellule e spine, rispetto alla forma di partenza.',
 cellBubbles:'Fa emergere gradualmente le cellule dal nucleo.',
 cellCount:'Numero di volumi cellulari distribuiti intorno al nucleo.',
 cellSize:'Dimensione media delle cellule rispetto al raggio della forma di partenza.',
 cellSizeVariation:'Distribuisce cellule piccole e grandi nella stessa struttura.',
 cellExposure:'Sposta le cellule verso l’esterno e rende più leggibili i loro profili.',
 cellStretch:'Allunga le cellule nella direzione in cui crescono, verso l’esterno.',
 cellSpread:'A zero concentra le cellule e le spine in una corona; al massimo le distribuisce su tutto il volume.',
 cellJoin:'Arrotonda l’incontro fra nucleo, cellule e radici delle spine.',
 cellSpines:'Estende progressivamente le spine dal nucleo.',
 cellSpineCount:'Numero di spine distribuite intorno al nucleo.',
 cellSpineLength:'Estensione delle spine a partire dal nucleo.',
 cellSpineWidth:'Apre la base della spina, da un ago a una radice larga.',
 cellSpineTaper:'Affila le punte e riduce progressivamente lo spessore verso l’esterno.',
 cellSpineBend:'Piega le spine in direzioni diverse.',
 cellSpineVariation:'Varia lunghezza e larghezza tra le spine.',
 cellSeed:'Cambia la disposizione e le variazioni delle cellule e delle spine conservando le altre impostazioni.',
 cellBreath:'Ampiezza con cui le singole cellule si gonfiano e si contraggono. Anima Fase delle cellule per vederle respirare.',
 cellFlex:'Ampiezza con cui le spine si piegano e cambiano lunghezza. Anima Fase delle spine per muoverle.',
 cellBreathPhase:'Posa del respiro lungo un ciclo. Anima la fase in Scorrimento per ripeterlo.',
 cellSpinePhase:'Posa della flessione lungo un ciclo. Anima la fase in Scorrimento per ripeterla.',
 cellPearl:'Miscela riflessi iridescenti e riflessi lattiginosi alla materia attuale, man mano che la struttura cresce.',
 cellFilm:'Spessore in nanometri della pellicola che produce i riflessi colorati.',
 cellColorSpread:'Varia lo spessore della pellicola lungo la superficie e differenzia il colore dei riflessi.',
 cellClarity:'Lascia passare più sfondo nelle zone esterne delle cellule. La trasparenza della materia continua a regolare la rifrazione dell’intera forma.',
};
