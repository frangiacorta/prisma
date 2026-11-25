import profiles from './weave-strain-profiles.js?v=c820880a7bd1';

// Cubic deformation of the material coordinates on the near and far sides
// of a growing tissue. The surface still lives on the underlying 3D form.
// Poses are driven by tissue parameters and load, independently of the clock.
export function strainPose(s,amount,roots,ends){
 if(amount<=0)return null;
 const drive=[s.structWeaveGrowth,s.structWeaveFront,s.structWeaveRelease,s.structFlowPhase,s._weaveLag||0];
 const range=[.29,.16,.075,.14,.18];
 const distances=profiles.map(p=>p.drive.reduce((sum,value,i)=>{
  let d=drive[i]-value;if(i===3)d-=Math.round(d);
  return sum+(d/range[i])**2;
 },0));
 const nearest=Math.min(...distances),weights=distances.map(d=>Math.exp(-.72*(d-nearest)));
 const scale=.78*amount*Math.exp(-.12*nearest)/weights.reduce((a,b)=>a+b,0);
 const cage=new Float32Array(64);
 for(let i=0;i<weights.length;i++){
  const weight=weights[i]*scale;
  if(weight>1e-6)for(let j=0;j<cage.length;j++)cage[j]+=profiles[i].points[j]*weight;
 }
 // Away from the sampled material poses, interpolate displacement from the
 // actual nearby junctions. A long shoot pulls the adjacent sheet in its own
 // direction; front and back react to the shoots on their respective sides.
 const distance=Math.min(1,Math.max(0,(nearest-9)/15));
 const elastic=distance*distance*(3-2*distance)*amount;
 if(elastic>0&&roots?.length&&ends?.length){
  for(let row=0;row<4;row++)for(let col=0;col<4;col++)for(let side=0;side<2;side++){
   const x=(col/3-.5)*1.46,y=(row/3-.5)*1.68,z=side?-.26:.26;
   let dx=0,dy=0,total=.035;
   for(let i=0;i<roots.length;i+=4){
    const ex=ends[i]-roots[i],ey=ends[i+1]-roots[i+1];
    const sx=x-(roots[i]+.6*ex),sy=y-(roots[i+1]+.6*ey),sz=z-ends[i+2];
    const w=Math.exp(-4*sx*sx-5*sy*sy-3*sz*sz);
    dx+=w*ex;dy+=w*ey;total+=w;
   }
   const j=(row*4+col)*4+side*2;
   cage[j]+=.38*elastic*Math.tanh(dx/total);cage[j+1]+=.38*elastic*Math.tanh(dy/total);
  }
 }
 return cage;
}
function weights(v){
 const x=Math.max(0,Math.min(3,v)),i=Math.floor(x),u=x-i,a=1-u,result=[0,0,0,0];
 const b=[a*a*a,(4-6*u*u+3*u*u*u),(1+3*u+3*u*u-3*u*u*u),u*u*u];
 for(let j=0;j<4;j++)result[Math.min(3,Math.max(0,i+j-1))]+=b[j]/6;
 return result;
}
export function strainPoint(p,cage){
 const x=weights((p[0]+.73)*3/1.46),y=weights((p[1]+.84)*3/1.68);
 const f=Math.max(0,Math.min(1,(.36-p[2])/.72)),back=f*f*(3-2*f);
 let du=0,dv=0;
 for(let j=0;j<4;j++)for(let i=0;i<4;i++){
  const k=(4*j+i)*4,w=x[i]*y[j];
  du+=w*((1-back)*cage[k]+back*cage[k+2]);
  dv+=w*((1-back)*cage[k+1]+back*cage[k+3]);
 }
 return [p[0]+du,p[1]+dv,p[2]];
}
export const STRAIN_GLSL=`
uniform vec4 uTissueCage[16];
vec4 tissueBasis(float v){
 float x=clamp(v,0.,3.),u=fract(x),a=1.-u;
 vec4 b=vec4(a*a*a,4.-6.*u*u+3.*u*u*u,1.+3.*u+3.*u*u-3.*u*u*u,u*u*u)/6.;
 if(x<1.)return vec4(b.x+b.y,b.z,b.w,0.);
 if(x<2.)return b;
 if(x<3.)return vec4(0.,b.x,b.y,b.z+b.w);
 return vec4(0.,0.,1./6.,5./6.);
}
vec2 tissueStrain(vec3 p){
 vec4 x=tissueBasis((p.x+.73)*(3./1.46)),y=tissueBasis((p.y+.84)*(3./1.68));
 vec4 uv=vec4(0.);
 for(int j=0;j<4;j++)uv+=y[j]*(x.x*uTissueCage[j*4]+x.y*uTissueCage[j*4+1]+x.z*uTissueCage[j*4+2]+x.w*uTissueCage[j*4+3]);
 return mix(uv.xy,uv.zw,1.-smoothstep(-.36,.36,p.z));
}
`;
