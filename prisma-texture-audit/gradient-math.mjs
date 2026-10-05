import assert from 'node:assert/strict';
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0),add=(...v)=>[0,1,2].map(i=>v.reduce((n,a)=>n+a[i],0)),mul=(a,s)=>a.map(x=>x*s);
function layers(q,organic,weights){
 const ka=[3.1,2.3,1.7],kb=[-1.8,3.7,2.9],kc=[2.7,-1.5,4.1],seed=.75,a=dot(q,ka)+seed,b=dot(q,kb)-seed*.7,c=dot(q,kc)+.4,sa=Math.sin(a),sb=Math.sin(b),sc=Math.sin(c),ca=Math.cos(a),cb=Math.cos(b),cc=Math.cos(c),warp=.55*sa+.3*sb+.15*sc,dw=add(mul(ka,.55*ca),mul(kb,.3*cb),mul(kc,.15*cc));
 let h=0,g=[0,0,0];
 for(const [index,k,w,amp] of [[0,[4,32,3],5,.045],[1,[1,8,1.3],2.6,.08],[3,[2,15,4],3.6,.05]]){
  const phase=dot(q,k)+organic*w*warp,derivative=add(k,mul(dw,organic*w));let val=Math.sin(phase),der=Math.cos(phase);
  if(index===0){const r=.5+.5*val;val=r**4;der=2*r**3*Math.cos(phase);}
  h+=val*amp*weights[index];g=add(g,mul(derivative,der*amp*weights[index]));
 }
 const natural=.5+.5*sa*sb*cc,regular=.5+.5*Math.sin(q[1]*9),patch=regular*(1-organic)+natural*organic,pg=add([0,4.5*Math.cos(q[1]*9)*(1-organic),0],mul(add(mul(ka,ca*sb*cc),mul(kb,sa*cb*cc),mul(kc,-sa*sb*sc)),.5*organic)),k=[57,3,7],phase=dot(q,k)+organic*3*warp,derivative=add(k,mul(dw,organic*3));
 h+=(.044*patch+.007*patch*Math.sin(phase))*weights[2];g=add(g,mul(add(mul(pg,.044+.007*Math.sin(phase)),mul(derivative,.007*patch*Math.cos(phase))),weights[2]));return {h,g};
}
let seed=682;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);let maxError=0;
for(let n=0;n<1000;n++){const q=[rand()*4-2,rand()*4-2,rand()*4-2],organic=rand(),weights=[rand(),rand(),rand(),rand()],g=layers(q,organic,weights).g;for(let i=0;i<3;i++){const a=[...q],b=[...q],epsilon=1e-5;a[i]+=epsilon;b[i]-=epsilon;const numeric=(layers(a,organic,weights).h-layers(b,organic,weights).h)/(2*epsilon);maxError=Math.max(maxError,Math.abs(g[i]-numeric));}}
assert(maxError<2e-7);console.log(JSON.stringify({samples:1000,derivatives:3000,maxError,check:'Analytic layered relief gradients match independent central finite differences'}));
