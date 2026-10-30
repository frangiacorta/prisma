import {axisValue,catchesValue,normalizeBinding} from './playground-model.js?v=83423be56ba5';
export class PlaygroundInputs{
 constructor(config,targets,notify=()=>{}){this.config=config;this.targets=targets;this.notify=notify;this.previous=new Map();this.picked=new Set();this.held=new Map();this.padBaseline=new Map();this.learning=null;this.closed=false;this.controller=new AbortController();const signal=this.controller.signal;
  window.addEventListener('keydown',e=>this.key(e,true),{capture:true,signal});window.addEventListener('keyup',e=>this.key(e,false),{capture:true,signal});window.addEventListener('blur',()=>this.release(),{signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)this.release();},{signal});window.addEventListener('gamepaddisconnected',()=>{this.release();this.notify('Joystick scollegato');},{signal});this.poll=this.poll.bind(this);this.raf=requestAnimationFrame(this.poll);
 }
 key(e,down){if(e.code==='Escape'&&this.learning){this.learning=null;this.notify('Assegnazione annullata');return;}if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,select,textarea,[contenteditable=true]'))return;
  const input={kind:'key',code:e.code};if(this.learning||Object.values(this.config.bindings).some(x=>x.input.kind==='key'&&x.input.code===e.code)){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)this.receive(input,down?1:0);}
 }
 learn(target,mode='toggle',invert=false,pickup=true){this.learning={target,mode,invert,pickup};this.padBaseline.clear();for(const p of navigator.getGamepads?.()||[])if(p)p.axes.forEach((v,i)=>this.padBaseline.set(p.id+':'+i,v));this.notify('Premi un tasto, un pulsante, muovi un asse o un controllo MIDI. Esc annulla.');}
 match(a,b){return a.kind===b.kind&&(a.kind==='key'?a.code===b.code:a.index===b.index&&(!a.device||a.device===b.device)&&(a.kind==='cc'||a.kind==='note'?a.channel===b.channel:true));}
 receive(input,value){
  if(this.closed||document.hidden)return;
  if(this.learning&&(input.kind==='axis'||input.kind==='cc'||value>.5)){
   const learned=normalizeBinding(input);if(!learned)return;const l=this.learning;this.config.bindings[l.target]={input:learned,mode:l.mode,invert:l.invert,pickup:l.pickup};this.learning=null;this.previous.clear();this.picked.clear();this.notify('assigned',l.target);return;
  }
  for(const [key,b]of Object.entries(this.config.bindings)){
   if(!this.match(b.input,input))continue;const target=this.targets(key);if(!target)continue;const v=b.invert?1-value:value,old=this.previous.get(key);this.previous.set(key,v);
   if(input.kind==='axis'||input.kind==='cc'){
    const current=target.get();if(b.pickup&&!this.picked.has(key)&&target.kind!=='action'){if(!catchesValue(old,v,current))continue;this.picked.add(key);}if(target.kind==='action'){if(v>.6&&(old??0)<=.6)target.set(1);}else target.set(v);
   }else{
    const down=v>.5,was=(old??0)>.5;if(down===was)continue;
    if(b.mode==='hold'){if(down){this.held.set(key,target.get());target.set(1);}else if(this.held.has(key)){target.set(this.held.get(key));this.held.delete(key);}}
    else if(down)target.set(target.kind==='action'?1:b.mode==='step'?(target.get()+.1>1?0:target.get()+.1):target.get()>.5?0:1);
   }
  }
 }
 manual(key){this.picked.delete(key);this.previous.delete(key);}
 release(){for(const [key,value]of this.held)this.targets(key)?.set(value);this.held.clear();this.previous.clear();this.picked.clear();}
 poll(){if(this.closed)return;this.raf=requestAnimationFrame(this.poll);if(document.hidden)return;for(const p of navigator.getGamepads?.()||[]){if(!p)continue;p.axes.forEach((v,i)=>{if(this.learning){const key=p.id+':'+i;if(!this.padBaseline.has(key))this.padBaseline.set(key,v);if(Math.abs(v-this.padBaseline.get(key))<.3)return;}this.receive({kind:'axis',index:i,device:p.id},axisValue(v));});p.buttons.forEach((b,i)=>this.receive({kind:'button',index:i,device:p.id},b.pressed?1:0));}}
 async connectMidi(){
  if(!navigator.requestMIDIAccess){this.notify('MIDI non disponibile in questo browser. Usa Chrome con HTTPS o localhost.');return false;}
  try{this.midi=await navigator.requestMIDIAccess({sysex:false});if(this.closed)return false;const connect=()=>{for(const p of this.midi.inputs.values())p.onmidimessage=e=>{const [s,n,v]=e.data,kind=s&240;if(kind!==176&&kind!==144&&kind!==128)return;this.receive({kind:kind===176?'cc':'note',index:n,channel:s&15,device:p.id},kind===128?0:kind===176?v/127:v?1:0);};};connect();this.midi.onstatechange=e=>{if(e.port.state==='disconnected')this.release();connect();this.notify('MIDI · '+this.midi.inputs.size+' ingressi');};this.notify('MIDI · '+this.midi.inputs.size+' ingressi');return true;}catch(e){this.notify('MIDI non collegato: '+e.message);return false;}
 }
 dispose(){this.release();this.closed=true;cancelAnimationFrame(this.raf);this.controller.abort();if(this.midi){this.midi.onstatechange=null;for(const p of this.midi.inputs.values())p.onmidimessage=null;}}
}
