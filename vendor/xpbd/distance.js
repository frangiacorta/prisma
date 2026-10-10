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

// Unilateral adaptation: fibres resist stretching but do not push their ends
// apart under compression. The accumulated multiplier is tension-only.
// A smooth onset avoids an abrupt derivative when a slack fibre becomes taut.
export function projectTension(p,a,b,rest,alpha,lambda,index){
 a*=3;b*=3;
 const x=p[a]-p[b],y=p[a+1]-p[b+1],z=p[a+2]-p[b+2],d=Math.hypot(x,y,z);
 if(d<1e-8)return;
 const width=Math.max(1e-6,rest*.08),extension=d-rest;
 const c=extension<=0?extension:extension<width?extension*extension/(2*width):extension-width*.5;
 const next=Math.min(0,lambda[index]+(-c-alpha*lambda[index])/(2+alpha));
 const k=(next-lambda[index])/d;lambda[index]=next;
 p[a]+=x*k;p[a+1]+=y*k;p[a+2]+=z*k;
 p[b]-=x*k;p[b+1]-=y*k;p[b+2]-=z*k;
}
