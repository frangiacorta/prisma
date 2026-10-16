export class BodyCamera{
 constructor({onResult,onStatus,onError}){Object.assign(this,{onResult,onStatus,onError});this.generation=0;this.video=document.createElement('video');Object.assign(this.video,{muted:true,playsInline:true,autoplay:true});}
 stop(){this.generation++;clearTimeout(this.timer);clearTimeout(this.watchdog);this.worker?.terminate();this.worker=null;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;this.busy=false;}
 async start(){
  this.stop();const generation=this.generation,current=()=>generation===this.generation;
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Apri Prisma in HTTPS o sul server locale per usare la webcam.');
   this.onStatus('Consenti l’accesso alla webcam…');
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}}});
   if(!current()){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;this.video.srcObject=stream;
   stream.getVideoTracks()[0].onended=()=>{if(current())this.fail('La webcam è stata scollegata. Riavviala per continuare.');};
   await this.video.play();if(!current())return;
   this.onStatus('Carico il riconoscimento di mani e braccia…');
   this.worker=new Worker(new URL('./body-camera-worker.js?v=c76d08458d01',import.meta.url));
   this.watchdog=setTimeout(()=>{if(current())this.fail('Il riconoscimento non risponde. Verifica la connessione e riprova.');},60000);
   this.worker.onerror=()=>{if(current())this.fail('Impossibile avviare il riconoscimento. Riprova in Chrome aggiornato.');};
   this.worker.onmessage=({data})=>{
    if(!current())return;
    if(data.type==='error'){this.fail('Riconoscimento interrotto. Riprova ad avviare la webcam.');return;}
    clearTimeout(this.watchdog);
    if(data.type==='ready'){this.lastVideoTime=-1;this.onStatus('Webcam attiva');}
    if(data.type==='result'){this.busy=false;this.onResult({...data,cameraActive:true,points:data.points.map(p=>({...p,ageMs:Math.max(0,performance.now()-data.timestamp)}))});}
    this.schedule(generation);
   };
   this.worker.postMessage({type:'init'});
  }catch(e){if(current())this.fail(({NotAllowedError:'Accesso negato: consenti la webcam dal lucchetto nella barra degli indirizzi e riprova.',NotFoundError:'Nessuna webcam trovata.',NotReadableError:'La webcam è occupata: chiudi il vecchio pannello webcam o l’app che la sta usando.'})[e.name]||e.message);}
 }
 fail(message){this.stop();this.onError(message);}
 schedule(generation){clearTimeout(this.timer);this.timer=setTimeout(()=>this.frame(generation),40);}
 async frame(generation){
  if(generation!==this.generation||this.busy)return;
  if(this.video.readyState<2||this.lastVideoTime===this.video.currentTime){this.schedule(generation);return;}
  this.busy=true;this.lastVideoTime=this.video.currentTime;const timestamp=performance.now();
  try{const bitmap=await createImageBitmap(this.video);if(generation!==this.generation){bitmap.close();return;}this.worker.postMessage({type:'frame',bitmap,timestamp},[bitmap]);this.watchdog=setTimeout(()=>this.fail('La webcam non risponde. Riavvia il controllo.'),10000);}
  catch(e){if(generation===this.generation)this.fail('Non riesco a leggere la webcam. Riprova.');}
 }
}
