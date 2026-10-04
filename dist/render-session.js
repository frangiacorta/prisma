// A failed startup never forces the same saved scene straight back onto the GPU.
// The creation and gallery use their existing keys and are never cleared here.
export class RenderSession{
 constructor(storage){this.storage=storage;this.key='prisma-render-pending-v1';this.pending=false;try{this.blocked=!!JSON.parse(storage.getItem(this.key)||'null')?.pending;}catch{this.blocked=false;}}
 begin(){if(this.pending)return;this.pending=true;try{this.storage.setItem(this.key,JSON.stringify({pending:true,date:Date.now()}));}catch{}}
 complete(){if(!this.pending)return;this.pending=false;this.blocked=false;try{this.storage.removeItem(this.key);}catch{}}
}
