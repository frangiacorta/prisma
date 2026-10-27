// Recovery belongs to this tab. A compiling tab must not block another tab,
// and leaving the page normally is not a graphics failure.
export class RenderSession{
 constructor(legacyStorage,tabStorage){
  this.key='prisma-render-tab-v2';this.generation='startup-66';this.pending=false;this.blocked=false;this.attempts=0;
  try{legacyStorage?.removeItem('prisma-render-pending-v1');}catch{}
  try{this.storage=tabStorage??globalThis.sessionStorage;const previous=JSON.parse(this.storage?.getItem(this.key)||'null');
   if(previous?.generation===this.generation){this.blocked=!!previous.failed||!!previous.pending&&previous.attempts>=1;this.attempts=previous.pending?(previous.attempts||0)+1:0;}
  }catch{}
 }
 write(failed=false){try{this.storage?.setItem(this.key,JSON.stringify({pending:true,failed,attempts:this.attempts,generation:this.generation,date:Date.now()}));}catch{}}
 begin(){if(this.pending)return;this.pending=true;this.write();}
 fail(){this.pending=true;this.blocked=true;this.write(true);}
 restart(){this.pending=false;this.blocked=false;this.attempts=0;this.begin();}
 complete(){this.pending=false;this.blocked=false;this.attempts=0;try{this.storage?.removeItem(this.key);}catch{}}
}
