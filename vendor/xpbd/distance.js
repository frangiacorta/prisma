// MIT: PositionBasedDynamics contributors, 2015-present. See LICENSE and NOTICE.txt.
// Port of XPBD::solve_DistanceConstraint, equal inverse masses, dt = 1.
export function projectDistance(p,a,b,rest,alpha,lambda,index){
 a*=3;b*=3;
 const x=p[a]-p[b],y=p[a+1]-p[b+1],z=p[a+2]-p[b+2],d=Math.hypot(x,y,z);
 if(d<1e-8)return;
 const dl=(-(d-rest)-alpha*lambda[index])/(2+alpha);lambda[index]+=dl;
 const k=dl/d;
 p[a]+=x*k;p[a+1]+=y*k;p[a+2]+=z*k;
 p[b]-=x*k;p[b+1]-=y*k;p[b+2]-=z*k;
}
