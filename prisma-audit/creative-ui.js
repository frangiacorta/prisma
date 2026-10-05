// Creations and favorites stay on this device; project files are portable.
let saveTimer,thumbnailRenderer,variants=[],variantGeneration=0;
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('prisma-current-v2',JSON.stringify({state,ratio,phase}));}catch{}},500);}
function adopt(next,title='La tua esplorazione',snapshot={}){
 state=next;activePreset=-1;phase=snapshot.phase??0;ratio=snapshot.ratio??ratio;setPlaying(false);mark(false);randomAnchor=structuredClone(state);$$('.preset').forEach(p=>p.classList.remove('active'));$('#seed').value=state.seed;$('#art-name').textContent=title;const option=[...$('#aspect').options].find(o=>Math.abs(+o.value-ratio)<.001);$('#aspect').value=option?.value||'';fitBoard();renderControls();syncMasterStates();syncTransport();
}
function interiorPosition(){
 const center=[state.positionX,state.positionY,0];if(fieldAt(state,center)<0)return center;
 for(const radius of [.35,.65,.85])for(let j=0;j<24;j++){const a=j/24*Math.PI*2,p=[center[0]+Math.cos(a)*radius*state.stretchX*state.scale,center[1]+Math.sin(a)*radius*state.stretchY*state.scale,0];if(fieldAt(state,p)<0)return p;}
 return center;
}
function addInsideLight(){
 if(state.lights.length>=MAX_LIGHTS){toast('Puoi usare fino a otto luci.');return;}
 remember();upgrade(state);const id=Math.max(0,...state.lights.map(l=>l.id))+1,[x,y,z]=interiorPosition(),l={...newLight(id),type:'orb',x,y,z,size:.12,length:.12,power:3,color:'#fff0de',visible:true};state.lights.push(l);selectedLightId=id;mark();renderControls();setMode('light');toast('Luce interna · trascina il punto, scorri per la profondità');
}
function doSurprise(){
 remember();let seed=Number($('#seed').value)>>>0;if(!$('#repeat-seed').checked)seed=crypto.getRandomValues(new Uint32Array(1))[0];const next=surprise(seed);
 for(const [group,keys] of Object.entries(GROUPS))if(locks[group])for(const key of keys)next[key]=structuredClone(state[key]);
 adopt(next,'Una nuova possibilità');toast('Una nuova combinazione di forma, materia e luce');
}
async function thumbnail(s,atPhase=0,atRatio=ratio){
 if(!thumbnailRenderer)thumbnailRenderer=new Renderer(document.createElement('canvas'));
 const width=atRatio>=1?192:Math.round(192*atRatio),height=atRatio>=1?Math.round(192/atRatio):192;
 thumbnailRenderer.draw(s,atPhase,width,height);return thumbnailRenderer.canvas.toDataURL('image/webp',.88);
}
async function showVariants(){
 const generation=++variantGeneration,captured=structuredClone(state),capturedPhase=phase,capturedRatio=ratio;variants=[];$('#variants-grid').replaceChildren();$('#variants-status').textContent='Creo otto varianti vicine…';$('#similar-again').disabled=true;if(!$('#variants-dialog').open)$('#variants-dialog').showModal();
 const seed=crypto.getRandomValues(new Uint32Array(1))[0],options=similar(captured,seed);
 try{for(let i=0;i<options.length;i++){
  if(generation!==variantGeneration||!$('#variants-dialog').open)break;const s=options[i];for(const [group,keys] of Object.entries(GROUPS))if(locks[group])for(const key of keys)s[key]=structuredClone(captured[key]);
  const url=await thumbnail(s,capturedPhase,capturedRatio),button=document.createElement('button');button.className='creation-card';button.dataset.variant=String(i);const img=document.createElement('img');img.src=url;img.alt=`Variante ${i+1}`;const label=document.createElement('span');label.textContent=`Variante ${i+1}`;button.append(img,label);$('#variants-grid').append(button);variants.push({state:s,phase:capturedPhase,ratio:capturedRatio});$('#variants-status').textContent=`${i+1} / 8 · Tocca quella che preferisci`;await waitPaint();
 }}catch(error){$('#variants-status').textContent=error.message;}finally{$('#similar-again').disabled=false;}
}
$('#similar').onclick=showVariants;$('#similar-again').onclick=showVariants;
$('#variants-dialog').addEventListener('close',()=>variantGeneration++);
$('#variants-grid').onclick=e=>{const b=e.target.closest('[data-variant]');if(!b)return;const v=variants[+b.dataset.variant];if(!v)return;remember();adopt(structuredClone(v.state),'La tua variante',v);$('#variants-dialog').close();};
function favorites(){try{const list=JSON.parse(localStorage.getItem('prisma-favorites-v2')||'[]');return Array.isArray(list)?list.slice(0,30).filter(q=>q?.state&&typeof q.id==='string'&&/^data:image\/(webp|png);base64,[a-z0-9+/=]+$/i.test(q.thumbnail||'')):[];}catch{return [];}}
function writeFavorites(list){localStorage.setItem('prisma-favorites-v2',JSON.stringify(list));}
async function favorite(){
 const captured=structuredClone(state),at=phase,aspect=ratio;$('#favorite').disabled=true;
 try{const url=await thumbnail(captured,at,aspect),list=favorites();list.unshift({id:crypto.randomUUID(),state:captured,phase:at,ratio:aspect,thumbnail:url,date:new Date().toISOString()});writeFavorites(list.slice(0,30));toast('Salvata nella galleria di questo browser');$('#favorite').textContent='♥';setTimeout(()=>$('#favorite').textContent='♡',1500);}catch{toast('Non posso salvare: libera spazio nel browser o scarica il progetto.');}finally{$('#favorite').disabled=false;}
}
function showGallery(){
 const list=favorites();$('#gallery-grid').replaceChildren();$('#gallery-empty').hidden=!!list.length;
 for(const q of list){const card=document.createElement('div');card.className='gallery-card';const button=document.createElement('button');button.className='creation-card';button.dataset.favoriteId=q.id;const img=document.createElement('img');img.src=q.thumbnail;img.alt='Creazione preferita';const label=document.createElement('span');label.textContent='Creazione '+new Date(q.date).toLocaleDateString('it-IT');button.append(img,label);const remove=document.createElement('button');remove.className='remove-favorite';remove.dataset.removeFavorite=q.id;remove.textContent='×';remove.setAttribute('aria-label','Rimuovi questa creazione');card.append(button,remove);$('#gallery-grid').append(card);}
 if(!$('#gallery-dialog').open)$('#gallery-dialog').showModal();
}
$('#favorite').onclick=favorite;$('#gallery-open').onclick=showGallery;
$('#gallery-grid').onclick=e=>{const remove=e.target.closest('[data-remove-favorite]');if(remove){writeFavorites(favorites().filter(q=>q.id!==remove.dataset.removeFavorite));showGallery();return;}const b=e.target.closest('[data-favorite-id]');if(!b)return;const q=favorites().find(q=>q.id===b.dataset.favoriteId);try{remember();adopt(normalizeCreation(q.state),'La tua preferita',q);$('#gallery-dialog').close();}catch{toast('Non posso aprire questa creazione.');}};
$('#project-download').onclick=()=>save(new Blob([JSON.stringify({prismaProject:2,state,ratio,phase},null,2)],{type:'application/json'}),`prisma-progetto-${state.seed}.json`);
$('#project-import').onclick=()=>$('#project-file').click();
$('#project-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2e6)throw Error('Scegli un progetto JSON di meno di 2 MB.');const q=JSON.parse(await file.text()),next=normalizeCreation(q.state||q);remember();adopt(next,'Progetto importato',{phase:Number.isFinite(q.phase)?q.phase:0,ratio:Number.isFinite(q.ratio)&&q.ratio>=.1&&q.ratio<=10?q.ratio:1});$('#gallery-dialog').close();toast('Progetto importato');}catch(error){toast(error.message||'Il file non è un progetto Prisma valido.');}finally{e.target.value='';}};
const guide=document.createElement('div');guide.id='wallpaper-overlay';guide.className='wallpaper-overlay';guide.hidden=true;guide.setAttribute('aria-hidden','true');guide.innerHTML='<div class="guide-notch"></div><div class="guide-clock"><span>Domenica 4 ottobre</span><strong>09:41</strong></div><div class="guide-icons">'+Array.from({length:20},()=>'<i></i>').join('')+'</div><div class="guide-dock"><i></i><i></i><i></i><i></i></div>';board.append(guide);
$('#wallpaper-guide').onchange=e=>{const mode=e.target.value;guide.hidden=mode==='none';guide.classList.toggle('home-guide',mode==='home');if(mode!=='none'){ratio=9/16;$('#aspect').value='0.5625';fitBoard();}toast(mode==='none'?'Ingombri nascosti':'Ingombri di riferimento · esclusi dai download');};
