import {projectDistance} from './vendor/xpbd/distance.js?v=02b214873299';
import {samplePath} from './particle-paths.js?v=02b214873299';
// A deformable simulation cage, shared by implicit surfaces and explicit geometry.
// The cage carries inertia; it is not per-grain or strand/strand self-collision.
export const DYNAMICS_DEFAULTS={dynAmount:0,dynMass:1,dynStiffness:.5,dynDamping:.45,dynCoupling:.6,dynGravity:.35,dynWind:.7,dynWindAngle:0,dynGust:.5,dynFrequency:.6,dynTurbulence:.45,dynPin:0,dynExtent:2.4,dynFields:0,dynFloor:0,dynFloorY:-1.4,dynBounce:.15,dynFriction:.3,dynObstacle:0,dynObstacleX:.8,dynObstacleY:0,dynObstacleZ:0,dynObstacleSize:.55,dynObstacleAspect:1,dynMargin:.02};
export const DYNAMICS_META={
 dynAmount:['Influenza fisica',0,1,.01],dynMass:['Massa',.2,5,.05],dynStiffness:['Ritorno alla forma',0,1,.01],dynDamping:['Smorzamento',0,1,.01],dynCoupling:['Coesione',0,1,.01],
 dynGravity:['Gravità',-2,2,.01],dynWind:['Vento',0,3,.01],dynWindAngle:['Direzione del vento',-180,180,1],dynGust:['Raffiche',0,1,.01],dynFrequency:['Frequenza raffiche · Hz',.05,3,.05],dynTurbulence:['Turbolenza',0,1,.01],dynPin:['Ancoraggio superiore',0,1,.01],dynExtent:['Estensione della simulazione',1,6,.1],dynFields:['Risposta ai campi',0,2,.01],
 dynFloor:['Contatto con il piano',0,1,1],dynFloorY:['Altezza del piano',-4,4,.02],dynBounce:['Rimbalzo',0,1,.01],dynFriction:['Attrito',0,1,.01],dynObstacle:['Ostacolo',0,3,1],dynObstacleX:['Posizione X',-4,4,.02],dynObstacleY:['Posizione Y',-4,4,.02],dynObstacleZ:['Profondità Z',-4,4,.02],dynObstacleSize:['Raggio / semilato',.1,2,.02],dynObstacleAspect:['Altezza relativa',.25,3,.05],dynMargin:['Distanza di contatto',0,.2,.005]
};
const N=7,COUNT=N*N*N,DT=1/120,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const DRIVE_KEYS=['positionX','positionY','scale','rotateX','rotateY','rotateZ','stretchX','stretchY','stretchZ','volume'];
function gridSample(data,extent,p){const q=p.map(v=>clamp((v/extent*.5+.5)*(N-1),0,N-1)),low=q.map(v=>Math.min(N-2,Math.floor(v))),f=q.map((v,i)=>v-low[i]),out=[0,0,0];for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){const index=((low[2]+z)*N*N+(low[1]+y)*N+low[0]+x)*4,w=(x?f[0]:1-f[0])*(y?f[1]:1-f[1])*(z?f[2]:1-f[2]);for(let k=0;k<3;k++)out[k]+=data[index+k]*w;}return out;}
function affine(s,p){let [x,y,z]=p;const scale=s.scale??1;x*=scale*(s.stretchX??1);y*=scale*(s.stretchY??1);z*=scale*(s.stretchZ??1)*(s.volume??1);for(const [a,b,degrees]of [[1,2,s.rotateX||0],[0,2,s.rotateY||0],[0,1,s.rotateZ||0]]){const v=[x,y,z],r=degrees*Math.PI/180,c=Math.cos(r),n=Math.sin(r),q=v[a]*c-v[b]*n;v[b]=v[a]*n+v[b]*c;v[a]=q;[x,y,z]=v;}return [x+(s.positionX||0),y+(s.positionY||0),z];}
export function colliderDistance(s,p){
 const type=Math.round(s.dynObstacle||0),r=s.dynObstacleSize??.55,aspect=s.dynObstacleAspect??1;
 const x=p[0]-(s.dynObstacleX??.8),y=p[1]-(s.dynObstacleY||0),z=p[2]-(s.dynObstacleZ||0);
 if(type===1){const d=Math.hypot(x,y,z);return {d:d-r,n:d>1e-9?[x/d,y/d,z/d]:[1,0,0]};}
 if(type===2){const q=[Math.abs(x)-r,Math.abs(y)-r*aspect,Math.abs(z)-r],v=q.map(a=>Math.max(0,a)),d=Math.hypot(...v);if(d>1e-9)return {d,n:v.map((a,i)=>a/d*Math.sign([x,y,z][i]))};let k=q.indexOf(Math.max(...q)),n=[0,0,0];n[k]=Math.sign([x,y,z][k])||1;return {d:q[k],n};}
 if(type===3){const yy=y-clamp(y,-r*aspect,r*aspect),d=Math.hypot(x,yy,z);return {d:d-r,n:d>1e-9?[x/d,yy/d,z/d]:[1,0,0]};}
 return {d:1e6,n:[0,1,0]};
}
export function projectDynamicsContact(s,p){
 const q=p.slice(),margin=s.dynMargin||0;
 if(s.dynObstacle){const c=colliderDistance(s,q);if(c.d<margin)for(let k=0;k<3;k++)q[k]+=(margin-c.d)*c.n[k];}
 if(s.dynFloor>.5)q[1]=Math.max(q[1],s.dynFloorY+margin);
 return q;
}
export class DynamicsSolver{
 constructor(s,drive){this.s={...DYNAMICS_DEFAULTS,...s};this.drive=drive;this.paths=(s.forcePaths||[]).filter(p=>p.enabled&&p.mode!=='contain').slice(0,4).map(p=>({...p,samples:samplePath(p,24)}));this.extent=this.s.dynExtent;this.rest=new Float32Array(COUNT*3);this.p=new Float32Array(COUNT*3);this.v=new Float32Array(COUNT*3);this.old=new Float32Array(COUNT*3);this.edges=[];this.tick=0;this.checkpoints=new Map();
  const id=(x,y,z)=>x+N*(y+N*z),h=2*this.extent/(N-1);
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=id(x,y,z);this.rest.set([(x-3)*h,(y-3)*h,(z-3)*h],i*3);for(const [dx,dy,dz]of [[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,-1,0],[1,0,1],[1,0,-1],[0,1,1],[0,1,-1]])if(x+dx<N&&y+dy>=0&&y+dy<N&&z+dz>=0&&z+dz<N)this.edges.push([i,id(x+dx,y+dy,z+dz),Math.hypot(dx,dy,dz)*h]);}
  this.p.set(this.rest);
  // Resolve initial penetration before the first displayed frame, rather than
  // pushing the cage out of the floor/obstacle on the next frame in one jump.
  if(this.s.dynFloor>.5||this.s.dynObstacle){const origin=[this.s.positionX||0,this.s.positionY||0,0];for(let i=0;i<COUNT;i++){const q=projectDynamicsContact(this.s,[this.p[i*3]+origin[0],this.p[i*3+1]+origin[1],this.p[i*3+2]]);for(let c=0;c<3;c++)this.p[i*3+c]=q[c]-origin[c];}}
  this.lambda=new Float32Array(this.edges.length);this.save();
 }
 save(){this.checkpoints.set(this.tick,{p:this.p.slice(),v:this.v.slice()});if(this.checkpoints.size>18){const key=[...this.checkpoints.keys()].find(k=>k!==0);this.checkpoints.delete(key);}}
 restore(tick){let best=0;for(const k of this.checkpoints.keys())if(k<=tick&&k>best)best=k;const c=this.checkpoints.get(best);this.p.set(c.p);this.v.set(c.v);this.tick=best;}
 step(){const s=this.s,p=this.p,v=this.v,old=this.old,rest=this.rest,t=this.tick*DT,m=s.dynMass,k=2+70*s.dynStiffness**2,damping=Math.exp(-(0.15+8*s.dynDamping)*DT),a=s.dynWindAngle*Math.PI/180,wind=[Math.cos(a),0,Math.sin(a)],origin=[s.positionX||0,s.positionY||0,0],drivers=this.drive?[-DT,0,DT].map(d=>this.drive(t+d)):null;old.set(p);
  for(let i=0;i<COUNT;i++){const j=i*3,x=rest[j],y=rest[j+1],z=rest[j+2],phase=t*s.dynFrequency*6.28318530718;
   const gust=1+s.dynGust*(.6*Math.sin(phase)+.4*Math.sin(phase*1.618+.7)),turb=s.dynTurbulence;
   const f=[s.dynWind*(wind[0]*gust+turb*Math.sin(y*1.7+z*.9+phase*.81)), -s.dynGravity+s.dynWind*turb*.55*Math.sin(x*1.3-z+phase*.73),s.dynWind*(wind[2]*gust+turb*Math.cos(x*1.4+y+phase*.91))];
   if(drivers){const targets=drivers.map(d=>affine(d,[x,y,z]));for(let c=0;c<3;c++)f[c]-=m*clamp((targets[0][c]-2*targets[1][c]+targets[2][c])/(DT*DT),-12,12);}
   if(s.dynFields>0){const fields=[...(s.forcePoints||[])];for(const path of this.paths){let best=Infinity,point;for(let q=0;q<path.samples.length-(path.closed?0:1);q++){const a=path.samples[q],b=path.samples[(q+1)%path.samples.length],dx=b.x-a.x,dy=b.y-a.y,u=clamp(((p[j]+origin[0]-a.x)*dx+(p[j+1]+origin[1]-a.y)*dy)/Math.max(1e-8,dx*dx+dy*dy),0,1),x=a.x+u*dx,y=a.y+u*dy,dist=(p[j]+origin[0]-x)**2+(p[j+1]+origin[1]-y)**2;if(dist<best){best=dist;point={enabled:true,x,y,z:path.z,radius:path.radius,strength:path.strength*(path.mode==='avoid'?-1:1)};}}if(point)fields.push(point);}for(const point of fields){if(!point.enabled)continue;const d=[point.x-p[j]-origin[0],point.y-p[j+1]-origin[1],point.z-p[j+2]],len=Math.hypot(...d),w=Math.max(0,1-len/Math.max(.05,point.radius));for(let c=0;c<3;c++)f[c]+=d[c]*point.strength*w*w*s.dynFields*8;f[0]-=d[1]*(point.swirl||0)*w*s.dynFields;f[1]+=d[0]*(point.swirl||0)*w*s.dynFields;}}
   for(let c=0;c<3;c++){v[j+c]=(v[j+c]+(f[c]-k*(p[j+c]-rest[j+c]))/m*DT)*damping;p[j+c]+=v[j+c]*DT;}
  }
  this.lambda.fill(0);const alpha=(1-s.dynCoupling)**3*.02*m/(DT*DT);
  if(s.dynCoupling>0)for(let pass=0;pass<3;pass++)for(let n=0;n<this.edges.length;n++){const e=pass%2?this.edges.length-1-n:n,[a,b,len]=this.edges[e];projectDistance(p,a,b,len,alpha,this.lambda,e);}
  for(let i=0;i<COUNT;i++){const j=i*3,pin=s.dynPin>0&&rest[j+1]>=this.extent*(1-s.dynPin*1.8);if(pin){for(let c=0;c<3;c++){p[j+c]=rest[j+c];v[j+c]=0;}continue;}
   // Bound deformation relative to the cage. This is a reduced physical model,
   // with no unconstrained escape or explosive accumulation at large forces.
   for(let c=0;c<3;c++)p[j+c]=clamp(p[j+c],rest[j+c]-1.4,rest[j+c]+1.4);
   // Limit impulses from competing distance/contact constraints. This bounds
   // per-step travel, not the accumulated deformation or the collision radius.
   const travel=Math.hypot(p[j]-old[j],p[j+1]-old[j+1],p[j+2]-old[j+2]),maxTravel=6*DT;
   if(travel>maxTravel)for(let c=0;c<3;c++)p[j+c]=old[j+c]+(p[j+c]-old[j+c])*maxTravel/travel;
   const world=[p[j]+origin[0],p[j+1]+origin[1],p[j+2]],contact=projectDynamicsContact(s,world),delta=contact.map((x,c)=>x-world[c]),depth=Math.hypot(...delta);
   for(let c=0;c<3;c++)v[j+c]=(p[j+c]-old[j+c])/DT;
   if(depth>1e-9){const n=delta.map(x=>x/depth),vn=v[j]*n[0]+v[j+1]*n[1]+v[j+2]*n[2];for(let c=0;c<3;c++){p[j+c]+=delta[c];v[j+c]=(v[j+c]-n[c]*Math.min(0,vn)*(1+s.dynBounce))*(1-s.dynFriction*.25);}}
  }
  this.tick++;if(this.tick%120===0)this.save();
 }
 advance(seconds,budget=Infinity){const target=Math.floor(Math.max(0,seconds)/DT+1e-7);if(this.tick>target)this.restore(target);let n=0;while(this.tick<target&&n++<budget)this.step();return this.tick===target;}
 frame(seconds,amount=1){if(this.lastFrame?.seconds===seconds&&this.lastFrame?.amount===amount)return this.lastFrame;const fraction=clamp(seconds/DT-this.tick,0,1),data=new Float32Array(COUNT*8);let max=0;for(let i=0;i<COUNT;i++)for(let c=0;c<3;c++){const d=(this.p[i*3+c]+fraction*DT*this.v[i*3+c]-this.rest[i*3+c])*amount;data[i*4+c]=d;max=Math.max(max,Math.abs(d));}for(let i=0;i<COUNT;i++){const p=Array.from(this.rest.subarray(i*3,i*3+3));let q=p.slice();for(let j=0;j<12;j++){const d=gridSample(data,this.extent,q);q=q.map((v,k)=>v*.25+(p[k]-d[k])*.75);}for(let c=0;c<3;c++)data[(COUNT+i)*4+c]=q[c]-p[c];}return this.lastFrame={data,amount,extent:this.extent,max,seconds,n:N,center:[this.s.positionX||0,this.s.positionY||0,0]};}
}
export class Dynamics{
 constructor(sample,live=false){this.sample=sample;this.live=live;}
 reset(){this.solver=null;this.key=null;}
 updateLive(s,drive,seconds){
  const previous=this.solver,next=new DynamicsSolver(s,drive);
  next.tick=Math.floor(Math.max(0,seconds)/DT+1e-7);
  if(previous){
   if(previous.extent===next.extent){next.p.set(previous.p);next.v.set(previous.v);next.tick=previous.tick;}
   else{
    const field=previous.frame(previous.tick*DT,1),velocity=new Float32Array(COUNT*4);
    for(let i=0;i<COUNT;i++)velocity.set(previous.v.subarray(i*3,i*3+3),i*4);
    for(let i=0;i<COUNT;i++){const rest=Array.from(next.rest.subarray(i*3,i*3+3)),delta=gridSample(field.data,previous.extent,rest),v=gridSample(velocity,previous.extent,rest);for(let c=0;c<3;c++){next.p[i*3+c]=rest[c]+delta[c];next.v[i*3+c]=v[c];}}
    next.tick=previous.tick;
   }
  }
  next.checkpoints.clear();next.save();this.solver=next;
 }
 state(s,seconds,budget=16){if(!(s.dynAmount>0)){if(this.live)this.reset();return s;}if(this.live&&this.solver&&seconds+1e-7<this.solver.tick*DT)this.reset();const animated=DRIVE_KEYS.some(k=>s.motions?.[k]?.enabled),period=s.keepMotionSpeed!==false&&s.motionPeriod>0?s.motionPeriod:s.duration||12,key=JSON.stringify([...Object.keys(DYNAMICS_DEFAULTS).filter(k=>k!=='dynAmount').map(k=>s[k]??DYNAMICS_DEFAULTS[k]),...DRIVE_KEYS.map(k=>[s[k],s.motions?.[k]]),s.motion,s.perfectLoop,period,s.dynFields>0?[s.forcePoints,s.forcePaths]:null]);if(key!==this.key){this.key=key;const drive=animated&&this.sample?t=>this.sample(s,t/period*Math.PI*2):null;if(this.live)this.updateLive(s,drive,seconds);else this.solver=new DynamicsSolver(s,drive);}if(!this.solver.advance(seconds,budget))return null;return {...s,_dynamics:this.solver.frame(seconds,s.dynAmount)};}
 async stateAsync(s,seconds,o={}){let frame;while(!(frame=this.state(s,seconds,48))){if(o.cancelled?.())return null;o.onStage?.('preparing');await new Promise(r=>setTimeout(r,0));}return o.cancelled?.()?null:frame;}
}
// Packed forward/inverse grids. Manual interpolation keeps subpixel normals smooth; hardware linear filtering quantizes interpolation weights.
export const DYNAMICS_GLSL=`
uniform int uDynIterations;uniform highp sampler2D uDynField;uniform vec4 uDynDomain;uniform float uDynAmount;
uniform vec4 uDynContact,uDynObstacle;uniform vec3 uDynCenter;
vec3 dynamicsCell(ivec3 i,int bank){return texelFetch(uDynField,ivec2(i.x,i.y+i.z*7+bank*49),0).xyz;}
vec3 dynamicsGrid(vec3 p,float bank){vec3 q=clamp((p-uDynDomain.xyz)/(2.*uDynDomain.w)+.5,0.,1.)*6.;ivec3 i=min(ivec3(floor(q)),ivec3(5));vec3 t=q-vec3(i);int b=int(bank);return mix(mix(mix(dynamicsCell(i,b),dynamicsCell(i+ivec3(1,0,0),b),t.x),mix(dynamicsCell(i+ivec3(0,1,0),b),dynamicsCell(i+ivec3(1,1,0),b),t.x),t.y),mix(mix(dynamicsCell(i+ivec3(0,0,1),b),dynamicsCell(i+ivec3(1,0,1),b),t.x),mix(dynamicsCell(i+ivec3(0,1,1),b),dynamicsCell(i+ivec3(1,1,1),b),t.x),t.y),t.z);}
vec3 dynamicsInverse(vec3 p){if(uDynAmount<=0.)return p;return p+dynamicsGrid(p,1.);}
float dynamicsObstacle(vec3 p){vec3 v=p-uDynCenter;float r=uDynObstacle.y;vec3 q=abs(v)-vec3(r,r*uDynObstacle.z,r);float sphere=length(v)-r,box=length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);v.y-=clamp(v.y,-r*uDynObstacle.z,r*uDynObstacle.z);float capsule=length(v)-r;return mix(1e6,mix(mix(sphere,box,step(1.5,uDynObstacle.x)),capsule,step(2.5,uDynObstacle.x)),step(.5,uDynObstacle.x));}
float dynamicsBarrier(vec3 p){float obstacle=uDynContact.z-dynamicsObstacle(p),floorD=mix(-1e6,uDynContact.y+uDynContact.z-p.y,step(.5,uDynContact.x));return mix(-1e6,max(obstacle,floorD),step(.00001,uDynAmount));}
vec3 dynamicsContact(vec3 p){if(uDynAmount<=0.)return p;if(uDynObstacle.x>.5){float d=dynamicsObstacle(p);if(d<uDynContact.z){vec2 e=vec2(.001,0);vec3 n=vec3(dynamicsObstacle(p+e.xyy)-dynamicsObstacle(p-e.xyy),dynamicsObstacle(p+e.yxy)-dynamicsObstacle(p-e.yxy),dynamicsObstacle(p+e.yyx)-dynamicsObstacle(p-e.yyx));n=length(n)>.00001?normalize(n):vec3(1,0,0);p+=n*(uDynContact.z-d);}}if(uDynContact.x>.5)p.y=max(p.y,uDynContact.y+uDynContact.z);return p;}
vec3 dynamicsForward(vec3 p){return uDynAmount>0.?dynamicsContact(p+dynamicsGrid(p,0.)):p;}
`;
const resources=new WeakMap();
export function bindDynamics(gl,program,s){let r=resources.get(gl);if(!r){const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE15);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA32F,N,N*N*2);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.NEAREST);for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);r={texture,programs:new WeakMap()};resources.set(gl,r);}let l=r.programs.get(program);if(!l){l={};for(const k of ['uDynIterations','uDynField','uDynAmount','uDynDomain','uDynContact','uDynObstacle','uDynCenter'])l[k]=gl.getUniformLocation(program,k);r.programs.set(program,l);}const f=s._dynamics;gl.uniform1i(l.uDynIterations,3);gl.uniform1f(l.uDynAmount,f?s.dynAmount:0);gl.activeTexture(gl.TEXTURE15);gl.bindTexture(gl.TEXTURE_2D,r.texture);if(f&&r.frame!==f){gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,N,N*N*2,gl.RGBA,gl.FLOAT,f.data);r.frame=f;}gl.uniform1i(l.uDynField,15);gl.uniform4f(l.uDynDomain,...(f?.center||[0,0,0]),f?.extent||2.4);gl.uniform4f(l.uDynContact,s.dynFloor||0,s.dynFloorY??-1.4,s.dynMargin||0,0);gl.uniform4f(l.uDynObstacle,s.dynObstacle||0,s.dynObstacleSize||.55,s.dynObstacleAspect||1,0);gl.uniform3f(l.uDynCenter,s.dynObstacleX??.8,s.dynObstacleY||0,s.dynObstacleZ||0);gl.activeTexture(gl.TEXTURE0);}
export function disposeDynamics(gl){const r=resources.get(gl);if(r&&!gl.isContextLost())gl.deleteTexture(r.texture);resources.delete(gl);}
