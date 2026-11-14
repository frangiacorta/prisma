export const FRACTAL_FORMULAS=['Mandelbulb','Menger','Mandelbox'];
export const FRACTAL_META={
 fractalAmount:['Intensità del frattale',0,1,.01],
 fractalKind:['Formula frattale',0,2,1],
 fractalPower:['Potenza Mandelbulb',2,14,.01],
 fractalLevels:['Iterazioni',3,14,1],
 fractalFold:['Ampiezza delle pieghe',.55,1.45,.01],
 fractalDetail:['Spessore dei dettagli',0,.045,.001],
};
export const FRACTAL_DEFAULTS={fractalAmount:0,fractalKind:0,fractalPower:8,fractalLevels:9,fractalFold:1,fractalDetail:.005};
export const FRACTAL_KEYS=Object.keys(FRACTAL_META);
export const FRACTAL_TRACKS={
 fractalAmount:['Intensità del frattale',0,1,.01],
 fractalPower:['Potenza Mandelbulb',0,6,.01],
 fractalFold:['Ampiezza delle pieghe',0,.45,.01],
};
export const FRACTAL_HELP={
 fractalAmount:'Trasforma gradualmente la forma di base. A zero ritrovi la figura di partenza.',
 fractalPower:'Cambia il numero e la distribuzione dei lobi nella formula Mandelbulb. Si può animare.',
 fractalLevels:'Aumenta i livelli di ricorsione. In Menger il dettaglio geometrico arriva al quinto livello.',
 fractalFold:'Modifica apertura dei tunnel in Menger e soglia di ripiegamento in Mandelbox.',
 fractalDetail:'Allarga le strutture più sottili e riduce le cavità più minute.',
};

const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const bounds=[[.75,1.43],[.79,1.39],[.58,1.58]];
export function fractalBounds(s){
 const amount=s.fractalAmount||0;
 return amount>0?bounds[s.fractalKind||0][1]+(s.fractalDetail??.005):1;
}

function bulb(c,power,levels){
 let [x,y,z]=c,dr=1,r=0;
 for(let i=0;i<=levels;i++){
  r=Math.hypot(x,y,z);
  if(r>2.5)return Math.log(r)*r/(2*dr);
  if(i===levels)break;
  const theta=Math.acos(clamp(z/Math.max(r,1e-8),-1,1))*power;
  const phi=Math.atan2(y,x)*power;
  const zr=r**power,radial=zr*Math.sin(theta);
  dr=power*r**(power-1)*dr+1;
  x=radial*Math.cos(phi)+c[0];y=radial*Math.sin(phi)+c[1];z=zr*Math.cos(theta)+c[2];
 }
 return -Math.max(.002,Math.min(.08,(2.5-r)/Math.max(1,dr)));
}

function menger(p,levels,fold){
 const half=.79;
 const q=p.map(x=>x/half);
 let d=Math.max(...q.map(Math.abs))-1,scale=1;
 for(let i=0;i<Math.min(levels-2,5);i++){
  const a=q.map(x=>1-Math.abs(((x*scale+1)%2+2)%2-1)*3);
  const cross=Math.min(Math.max(a[0],a[1]),Math.max(a[1],a[2]),Math.max(a[2],a[0]));
  scale*=3;
  d=Math.max(d,(cross+fold-1)/scale);
 }
 return d*half;
}

function box(c,levels,fold){
 let [x,y,z]=c,dr=1;
 for(let i=0;i<levels;i++){
  const r=Math.hypot(x,y,z);
  if(r>8)return (r-4)/dr;
  x=2*clamp(x,-fold,fold)-x;y=2*clamp(y,-fold,fold)-y;z=2*clamp(z,-fold,fold)-z;
  const gain=clamp(1/Math.max(.25,x*x+y*y+z*z),1,4);
  x=-2.18*x*gain+c[0];y=-2.18*y*gain+c[1];z=-2.18*z*gain+c[2];
  dr=2.18*gain*dr+1;
 }
 return (Math.hypot(x,y,z)-4)/dr;
}

export function fractalField(s,base,p){
 const amount=s.fractalAmount||0;
 if(amount<=0)return base;
 const kind=s.fractalKind||0,levels=s.fractalLevels??9,fold=s.fractalFold??1;
 const [size,limit]=bounds[kind],q=p.map(x=>x/size),radius=Math.hypot(...p);
 if(radius>limit+.14)return base*(1-amount)+(radius-limit-(s.fractalDetail??.005))*amount;
 const d=kind===1?menger(p,levels,fold):kind===2?box(q,levels,fold)*size:bulb(q,s.fractalPower??8,levels)*size;
 const bounding=kind===2?Math.max(...p.map(Math.abs))-.9:radius-limit;
 const field=Math.max(d,bounding)-(s.fractalDetail??.005);
 return base*(1-amount)+field*amount;
}

export function uploadFractal(s,u){
 u('uFractal',[s.fractalAmount||0,s.fractalKind||0,s.fractalPower??8,s.fractalLevels??9]);
 u('uFractalDetail',[s.fractalFold??1,s.fractalDetail??.005]);
}

export const FRACTAL_GLSL=`
uniform vec4 uFractal;
uniform vec2 uFractalDetail;
#if FRACTAL_ENABLED
float bulbDistance(vec3 c,float power,int levels){
 vec3 z=c;float dr=1.,r=0.;
 for(int i=0;i<=levels;i++){
  r=length(z);
  if(r>2.5)return log(r)*r/(2.*dr);
  if(i==levels)break;
  float theta=acos(clamp(z.z/max(r,1e-8),-1.,1.))*power;
  float phi=atan(z.y,z.x)*power;
  float zr=pow(r,power),radial=zr*sin(theta);
  dr=power*pow(r,power-1.)*dr+1.;
  z=c+vec3(radial*cos(phi),radial*sin(phi),zr*cos(theta));
 }
 return -max(.002,min(.08,(2.5-r)/max(1.,dr)));
}
float mengerDistance(vec3 p,int levels,float fold){
 vec3 q=p/.79,a=abs(q);
 float d=max(max(a.x,a.y),a.z)-1.,scale=1.;
 for(int i=0;i<min(levels-2,5);++i){
  a=1.-3.*abs(mod(q*scale+1.,2.)-1.);
  float crossField=min(min(max(a.x,a.y),max(a.y,a.z)),max(a.z,a.x));
  scale*=3.;
  d=max(d,(crossField+fold-1.)/scale);
 }
 return d*.79;
}
float boxFractalDistance(vec3 c,int levels,float fold){
 vec3 z=c;float dr=1.;
 for(int i=0;i<levels;i++){
  float r=length(z);
  if(r>8.)return (r-4.)/dr;
  z=2.*clamp(z,-fold,fold)-z;
  float gain=clamp(1./max(.25,dot(z,z)),1.,4.);
  z=z*(-2.18*gain)+c;
  dr=2.18*gain*dr+1.;
 }
 return (length(z)-4.)/dr;
}
float fractalField(float base,vec3 p){
 float amount=uFractal.x;
 if(amount<=0.)return base;
 int kind=int(uFractal.y+.5),levels=int(uFractal.w+.5);
 float radius=length(p),limit=kind==1?1.39:(kind==2?1.58:1.43);
 if(radius>limit+.14)return mix(base,radius-limit-uFractalDetail.y,amount);
 float d=kind==1?mengerDistance(p,levels,uFractalDetail.x):(kind==2?
  .58*boxFractalDistance(p/.58,levels,uFractalDetail.x):.75*bulbDistance(p/.75,uFractal.z,levels));
 vec3 a=abs(p);
 float bounding=kind==2?max(max(a.x,a.y),a.z)-.9:radius-limit;
 return mix(base,max(d,bounding)-uFractalDetail.y,amount);
}
#else
float fractalField(float base,vec3 p){return base;}
#endif
`;
