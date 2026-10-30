const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=x=>{try{const u=new URL(x,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const kindName={video:'Video di riferimento',image:'Immagine di riferimento',tool:'Strumento',project:'Progetto',archive:'Archivio tecnico'};
const states={implemented:'Realizzato',partial:'In corso',proposed:'Da sviluppare',reference:'Riferimento'};
let data,byId,preferences={},view=new URL(location.href).searchParams.get('view')||'board',onlySaved=false,current=null,lastFocus=null;
const KEY='prisma-moodboard-choices-v1';
try{preferences=JSON.parse(localStorage.getItem(KEY)||'{}');if(!preferences||Array.isArray(preferences)||typeof preferences!=='object')preferences={};}catch{$('#storage-status').textContent='Memoria locale non disponibile. Puoi comunque esportare le scelte di questa sessione.';}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(preferences));}catch{$('#storage-status').textContent='Salvataggio locale non riuscito: esporta le scelte prima di chiudere.';}}
function pref(id){return preferences[id]||{};}
function updatePref(id,change){preferences[id]={...pref(id),...change,updated:new Date().toISOString()};persist();}
function notify(text){$('#toast').textContent=text;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,3000);}
function family(id){return data.families.find(f=>f.id===id);}
function setView(next){view=['board','roadmap','prisma'].includes(next)?next:'board';configureType();render();const u=new URL(location);u.searchParams.set('view',view);history.replaceState(null,'',u);}
function configureType(){const options=view==='board'?[['all','Tutti i riferimenti'],['video','Video'],['image','Immagini'],['tool','Repo e strumenti'],['archive','Archivio tecnico']]:view==='roadmap'?[['all','Tutti gli stati'],['proposed','Da sviluppare'],['partial','In corso'],['implemented','Realizzati']]:[['all','Risultati disponibili'],['implemented','Realizzati'],['partial','Integrazioni parziali']];$('#type').innerHTML=options.map(([v,n])=>`<option value="${v}">${n}</option>`).join('');}
function label(r){if(r.kind==='project')return `<span class="pill ${r.state==='implemented'?'done':r.state==='partial'?'partial':''}">${states[r.state]}</span>${r.priority?'<span class="pill next">Prossimo</span>':''}`;return `<span class="pill">${kindName[r.kind]}${r.duration?' · '+Math.round(r.duration)+'s':''}</span>${r.completedProjects?.length?'<span class="pill">Con progetti realizzati</span>':''}`;}
function topic(id){return data.topics.find(t=>t.id===id);}
function category(id){return data.categories.find(c=>c.id===id);}
function topicOptions(){
 const selected=$('#topic').value||'all',cat=$('#family').value;
 const available=data.topics.filter(t=>cat==='all'||t.category===cat);
 $('#topic').innerHTML='<option value="all">Tutti gli effetti</option>'+available.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
 $('#topic').value=available.some(t=>t.id===selected)?selected:'all';
}
function browseTopic(id){
 if($('#detail').open)closeDetail();
 $('#family').value='all';topicOptions();$('#topic').value=id;
 $('#search').value='';$('#type').value='all';onlySaved=false;$('#saved').setAttribute('aria-pressed','false');
 render();$('#view-title').scrollIntoView({block:'start',behavior:'instant'});
}
function relatedHtml(records){
 return [['project','Progetti collegati'],['reference','Riferimenti collegati'],['tool','Strumenti e fonti']].map(([kind,title])=>{
  const list=records.filter(r=>kind==='reference'?['video','image','archive'].includes(r.kind):r.kind===kind);
  return list.length?`<h3>${title}</h3><div class="related">${list.map(r=>`<button data-open="${esc(r.id)}"><span>${esc(r.kind==='project'?states[r.state]:kindName[r.kind])}</span>${esc(r.name)}</button>`).join('')}</div>`:'';
 }).join('');
}
function locationHtml(r,related){
 if(r.kind==='project')return `<section class="location"><h3>Dove in Prisma</h3><p>${esc(r.where||(r.state==='proposed'?'Da sviluppare: non ancora disponibile nei controlli.':'Apri il progetto per i dettagli di integrazione; percorso dei controlli da verificare.'))}</p><small>${esc(states[r.state])} · lo stato riguarda questo progetto.</small></section>`;
 const projects=related.filter(p=>p.kind==='project');
 return `<section class="location"><h3>Collegamento con Prisma</h3><p>Questa scheda è un riferimento, non un effetto pronto da applicare.</p>${projects.filter(p=>p.where&&p.state!=='proposed').map(p=>`<p><button class="text-link" data-open="${esc(p.id)}">${esc(p.name)}</button> · ${esc(states[p.state])}<br>${esc(p.where)}</p>`).join('')}${!projects.length?'<small>Nessun progetto collegato: riferimento ancora da valutare.</small>':''}</section>`;
}
function procedureHtml(r){
 const p=r.procedure;
 if(p)return `<section class="location"><h3>${p.verification==='code-reviewed'?'Procedimento nel codice':'Procedimento proposto'}</h3><strong>${esc(p.name)}</strong><p>${esc(p.description)}</p></section>`;
 if(['video','image'].includes(r.kind))return `<section class="location"><h3>Procedimenti da valutare</h3><p>${esc(r.topics.map(id=>topic(id)?.name).join(' · '))}</p><small>Classificazione per il lavoro in Prisma. Il metodo dell’autore è confermato solo quando documentato nelle fonti della scheda.</small></section>`;
 return '';
}
function render(){
 const q=$('#search').value.trim().toLocaleLowerCase('it'),f=$('#family').value,t=$('#type').value,effect=$('#topic').value;
 const items=data.items.filter(r=>(view==='board'?r.kind!=='project':r.kind==='project'&&(view!=='prisma'||['implemented','partial'].includes(r.state))))
 .filter(r=>f==='all'||r.topics.some(id=>topic(id)?.category===f)).filter(r=>effect==='all'||r.topics.includes(effect))
 .filter(r=>t==='all'||(view==='board'?r.kind:r.state)===t).filter(r=>!onlySaved||pref(r.id).saved)
 .filter(r=>!q||[r.name,...(r.aliases||[]),r.summary,r.author,...r.sources,r.where,...r.topics.map(id=>topic(id)?.name),...(r.related||[]).map(id=>byId.get(id)?.name),pref(r.id).note||''].join(' ').toLocaleLowerCase('it').includes(q));
 items.sort((a,b)=>a.name.localeCompare(b.name,'it'));
 if(view==='roadmap')items.sort((a,b)=>Number(b.priority)-Number(a.priority)||({partial:0,proposed:1,implemented:2}[a.state]-{partial:0,proposed:1,implemented:2}[b.state]));
 const headings={board:['RIFERIMENTI','Esplora per effetto'],roadmap:['PROGETTI','Sviluppo e verifiche'],prisma:['DISPONIBILI','Controlli e risultati']};
 $('#view-kicker').textContent=headings[view][0];$('#view-title').textContent=effect==='all'?headings[view][1]:topic(effect).name;
 $('#count').textContent=items.length+' schede';$('#empty').hidden=!!items.length;
 $$('.view-nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.view===view?'page':'false'));
 $('#family-intro').hidden=effect==='all';if(effect!=='all')$('#family-intro').innerHTML=`<p>${esc(topic(effect).description)}</p><button data-all-topics>Torna a tutti gli effetti</button>`;
 const overview=view==='board'&&!q&&effect==='all'&&t==='all'&&!onlySaved;
 $('#grid').classList.toggle('overview',overview);
 if(overview){
  $('#grid').innerHTML=data.categories.filter(c=>f==='all'||c.id===f).map(c=>{
   const groups=data.topics.filter(g=>g.category===c.id).map(g=>{
    const members=items.filter(r=>r.topics[0]===g.id),projects=data.items.filter(r=>r.kind==='project'&&r.topics[0]===g.id);
    if(!members.length)return '';
    const illustrated=byId.get(g.cover)||members.find(r=>r.kind==='video'&&r.media?.length)||members.find(r=>r.media?.length),im=illustrated?.media[0];
    return `<article class="collection"><button data-topic="${esc(g.id)}"><div class="collection-visual">${im?`<img src="${esc(im.src)}" alt="" loading="lazy" width="${im.width}" height="${im.height}">`:'<span>Strumenti</span>'}</div><h3>${esc(g.name)}</h3><p>${esc(g.description)}</p><small>${members.filter(r=>['video','image'].includes(r.kind)).length} riferimenti · ${members.filter(r=>r.kind==='tool').length} strumenti · ${projects.length} progetti</small><span class="collection-open">Esplora →</span></button></article>`;
   }).join('');
   return groups?`<h3 class="category-heading">${esc(c.name)}</h3>${groups}`:'';
  }).join('');return;
 }
 $('#grid').innerHTML=items.map(r=>{const im=r.media?.[0],color=family(r.families[0])?.color||'#c7c5bb';return `<article class="card" style="--family:${color}"><button class="card-open" data-open="${esc(r.id)}" aria-label="Apri ${esc(r.name)}"><div class="card-visual ${im?'':'placeholder'}">${im?`<img src="${esc(im.src)}" alt="" loading="lazy" decoding="async" width="${im.width}" height="${im.height}">`:`<div class="glyph" aria-hidden="true">${r.kind==='tool'?'⌘':'◈'}</div><div class="placeholder-label">${esc(kindName[r.kind])}</div>`}<div class="card-label">${label(r)}</div></div><span class="card-title">${esc(r.name)}</span><span class="card-meta">${esc((r.topics||[]).slice(0,2).map(id=>topic(id)?.name).join(' · '))}</span></button><button class="card-fav" data-save="${esc(r.id)}" aria-label="${pref(r.id).saved?'Rimuovi dai':'Aggiungi ai'} preferiti: ${esc(r.name)}" aria-pressed="${!!pref(r.id).saved}">${pref(r.id).saved?'♥':'♡'}</button></article>`;}).join('');
}
function human(k){return ({effect:'Aspetto',observed:'Osservazione',light:'Luce',motion:'Movimento',sourceClaims:'Dichiarazione della fonte',recipe:'Ricetta proposta',method:'Metodo',law:'Regola generativa',use:'Uso possibile',feasible:'Fattibilità',reuse:'Riuso',verified:'Verificato',license:'Licenza',route:'Integrazione',gaps:'Da verificare',limits:'Limiti',implemented:'Già realizzato',remaining:'Da completare',controls:'Controlli',acceptance:'Criteri di riuscita',testedScope:'Ambito della prova',evidence:'Evidenze',loop:'Chiusura del loop',inspection:'Ispezione',where:'Dove si trova',next:'Prossimo passo',target:'Obiettivo',sources:'Fonti'})[k]||k.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');}
function valueHtml(v,depth=0){if(Array.isArray(v))return '<ul>'+v.map(x=>'<li>'+valueHtml(x,depth+1)+'</li>').join('')+'</ul>';if(v&&typeof v==='object')return Object.entries(v).map(([k,x])=>`<span class="field-label">${esc(human(k))}</span>${valueHtml(x,depth+1)}`).join('');return `<p>${esc(v)}</p>`;}
function imageHtml(r){return r.media?.[0]?`<img src="${esc(r.media[0].src)}" alt="Anteprima: ${esc(r.name)}">`:'<div class="placeholder" aria-hidden="true">◈</div>';}
function videoHtml(src,poster){return `<video controls playsinline muted preload="metadata" ${poster?`poster="${esc(poster)}"`:''} src="${esc(src)}"></video>`;}
function stopVideos(){ $$('#detail video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});}
function openDetail(id,push=true){
 const r=byId.get(id);if(!r)return;current=r;lastFocus=document.activeElement;stopVideos();
 if(push){const u=new URL(location);u.hash=id;history.pushState(null,'',u);}
 $('#detail-type').textContent=kindName[r.kind]+' / '+r.id;
 const related=r.related.map(id=>byId.get(id)).filter(Boolean).sort((a,b)=>Number(b.kind==='project')-Number(a.kind==='project'));
 const main=r.kind==='project'&&r.resultVideo?videoHtml(r.resultVideo,r.resultImage):imageHtml(r);
 $('#detail-content').innerHTML=`<div class="detail-hero" id="hero">${main}</div><div class="media-choices">${r.media.map((im,i)=>`<button data-image="${i}">Immagine ${i+1}</button>`).join('')}${r.clip?'<button data-clip>▶ Guarda estratto</button>':''}${r.resultVideo?'<button data-result>▶ Risultato Prisma</button><button data-compare>Confronta</button>':''}</div><p class="media-note" id="media-note">${esc(r.kind==='project'&&r.resultVideo?'Risultato Prisma · loop esportato':r.illustrationFrom?'Illustrazione dal riferimento: '+byId.get(r.illustrationFrom)?.name:r.clipNote||'Campione di studio · originale conservato sul PC')}</p><div class="detail-body"><div class="tags">${r.topics.map(id=>`<button class="tag" data-topic="${esc(id)}">${esc(topic(id)?.name)}</button>`).join('')}${label(r)}</div><h2>${esc(r.name)}</h2>${r.author?`<p class="byline">${esc(r.author)}</p>`:''}<p class="summary">${esc(r.summary)}</p>${r.platform?`<p class="where">${esc(r.platform)}</p>`:''}<div class="actions">${r.resultUrl?`<a class="primary" href="${esc(r.resultUrl)}">Apri risultato ↗</a>`:''}${r.kind==='project'&&!['roadmap-4d','project-moodboard'].includes(r.id)&&['implemented','partial'].includes(r.state)?`<a href="../?engine=${r.engine==='solid'?'solid':'particles'}">Vai a Prisma ↗</a>`:''}<button id="detail-save" aria-pressed="${!!pref(id).saved}">${pref(id).saved?'♥ Salvato':'♡ Salva riferimento'}</button><button id="share">Copia link</button></div>${r.next?`<details><summary>Il prossimo passo</summary><div class="fields">${esc(r.next)}</div></details>`:''}${procedureHtml(r)}${locationHtml(r,related)}${relatedHtml(related)}<div class="feedback"><h3>Cosa vuoi conservare?</h3><div class="votes"><button data-vote="more" aria-pressed="${pref(id).vote==='more'}">Più così</button><button data-vote="less" aria-pressed="${pref(id).vote==='less'}">Meno così</button><button data-vote="try" aria-pressed="${pref(id).vote==='try'}">Da provare</button></div><label for="note">Una nota per la prossima prova<textarea id="note" maxlength="4000" placeholder="Mantieni la luce, rallenta il movimento, evita il foro…">${esc(pref(id).note||'')}</textarea></label><small id="note-status">Salvataggio sul dispositivo · esportabile dal fondo del moodboard</small></div>${r.keep||r.avoid?`<details><summary>Conservare / evitare</summary><div class="fields"><p>${esc(r.keep||'Da annotare insieme.')}</p><p>${esc(r.avoid||'Da annotare insieme.')}</p></div></details>`:''}<details><summary>Classificazione</summary><div class="fields">${r.topics.map(id=>`<h3>${esc(topic(id).name)}</h3><p>${esc(topic(id).description)}</p><button data-topic="${esc(id)}">Esplora questo effetto</button>`).join('')}${r.aliases?.length?`<p>Nomi precedenti: ${esc(r.aliases.join(' · '))}</p>`:''}</div></details>${r.sections.map(s=>`<details><summary>${esc(s.title)}</summary><div class="fields">${s.fields.map(x=>`<span class="field-label">${esc(human(x.label))}</span>${valueHtml(x.value)}`).join('')}</div></details>`).join('')}<details><summary>Fonti e originali (${r.sources.length+(r.assets?.length||0)})</summary><div class="fields">${r.sources.map(u=>`<a class="source-link" href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer">${esc(u)} ↗</a>`).join('')}${(r.assets||[]).map(a=>`<p>${esc(a.name)} ${a.bytes?'· '+(a.bytes/1048576).toFixed(1)+' MB':''}${a.available?' · originale conservato':' · originale non disponibile'}${['localhost','127.0.0.1'].includes(location.hostname)&&a.available?` <a class="source-link" href="/api/moodboard/original/${a.id}" target="_blank" rel="noopener">Apri originale sul PC ↗</a>`:''}</p>`).join('')}</div></details><p class="record-meta">${esc(r.id)} · Archivio aggiornato ${esc(data.updated)}<br>${esc((r.detailsSource||[]).join(' · '))}</p></div>`;
 if(!$('#detail').open){$('#detail').showModal();document.body.classList.add('modal-open');}$('#detail').scrollTop=0;$('#close').focus({preventScroll:true});
}
function closeDetail(){stopVideos();$('#detail').close();document.body.classList.remove('modal-open');current=null;const u=new URL(location);u.hash='';history.replaceState(null,'',u);lastFocus?.isConnected&&lastFocus.focus({preventScroll:true});}
function replaceHero(content,note){stopVideos();$('#hero').innerHTML=content;$('#media-note').textContent=note;}
document.addEventListener('click',async e=>{
 const group=e.target.closest('[data-topic]');if(group){browseTopic(group.dataset.topic);return;}
 if(e.target.closest('[data-all-topics]')){$('#topic').value='all';render();return;}
 const open=e.target.closest('[data-open]');if(open){openDetail(open.dataset.open);return;}
 const save=e.target.closest('[data-save]');if(save){updatePref(save.dataset.save,{saved:!pref(save.dataset.save).saved});render();return;}
 const nav=e.target.closest('[data-view]');if(nav){setView(nav.dataset.view);return;}
 const vote=e.target.closest('[data-vote]');if(vote&&current){updatePref(current.id,{vote:pref(current.id).vote===vote.dataset.vote?'':vote.dataset.vote});$$('[data-vote]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.vote===pref(current.id).vote));return;}
 if(!current)return;
 if(e.target.closest('#detail-save')){updatePref(current.id,{saved:!pref(current.id).saved});$('#detail-save').textContent=pref(current.id).saved?'♥ Salvato':'♡ Salva riferimento';$('#detail-save').setAttribute('aria-pressed',!!pref(current.id).saved);render();}
 if(e.target.closest('[data-clip]'))replaceHero(videoHtml(current.clip,current.media?.[0]?.src),current.clipNote);
 if(e.target.closest('[data-result]'))replaceHero(videoHtml(current.resultVideo,current.resultImage),'Risultato Prisma · loop esportato.');
 if(e.target.closest('[data-compare]')){let ref=current;if(current.kind==='project')ref=current.related.map(id=>byId.get(id)).find(r=>r&&['video','image'].includes(r.kind))||current;replaceHero(`<div class="comparison"><div><span>REFERENCE · ${esc(ref.name)}</span>${ref.clip?videoHtml(ref.clip,ref.media?.[0]?.src):imageHtml(ref)}</div><div><span>RISULTATO PRISMA</span>${videoHtml(current.resultVideo,current.resultImage)}</div></div>`,'Confronto visivo: estratto della fonte e loop Prisma. Le durate possono differire.');}
 const im=e.target.closest('[data-image]');if(im)replaceHero(`<img src="${esc(current.media[Number(im.dataset.image)].src)}" alt="${esc(current.name)}">`,'Campione di studio · originale conservato sul PC');
 if(e.target.closest('#share')){try{await navigator.clipboard.writeText(location.href);$('#share').textContent='Link copiato';}catch{$('#share').textContent='Copia l’indirizzo dalla barra del browser';}}
});
$('#detail').addEventListener('input',e=>{if(e.target.id==='note'&&current){updatePref(current.id,{note:e.target.value});$('#note-status').textContent='Nota salvata sul dispositivo.';}});
$('#close').onclick=closeDetail;$('#detail').addEventListener('cancel',e=>{e.preventDefault();closeDetail();});
$('#search').addEventListener('input',render);$('#family').onchange=()=>{topicOptions();render();};$('#topic').onchange=render;$('#type').onchange=render;
$('#saved').onclick=()=>{onlySaved=!onlySaved;$('#saved').setAttribute('aria-pressed',onlySaved);render();};
$('#reset-filters').onclick=()=>{$('#search').value='';$('#family').value='all';topicOptions();$('#topic').value='all';$('#type').value='all';onlySaved=false;$('#saved').setAttribute('aria-pressed','false');render();};
$('#about').onclick=()=>{$('#info').showModal();document.body.classList.add('modal-open');};$('#info-close').onclick=()=>$('#info').close();$('#info').addEventListener('close',()=>document.body.classList.remove('modal-open'));
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({prismaMoodboard:1,exportedAt:new Date().toISOString(),choices:preferences},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='prisma-moodboard-scelte.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Scelte esportate. Puoi importarle su un altro dispositivo.');};
$('#import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2000000)throw Error('File troppo grande.');const x=JSON.parse(await file.text());if(x.prismaMoodboard!==1||!x.choices||typeof x.choices!=='object'||Array.isArray(x.choices))throw Error('Formato non riconosciuto.');let n=0;for(const [id,p]of Object.entries(x.choices)){if(!byId.has(id)||!p||typeof p!=='object')continue;preferences[id]={saved:p.saved===true,vote:['more','less','try'].includes(p.vote)?p.vote:'',note:typeof p.note==='string'?p.note.slice(0,4000):'',updated:new Date().toISOString()};n++;}persist();render();notify(n+' scelte importate.');}catch(error){notify('Importazione non riuscita: '+error.message);}finally{e.target.value='';}};
window.addEventListener('popstate',()=>{const id=decodeURIComponent(location.hash.slice(1));if(byId?.has(id))openDetail(id,false);else if($('#detail').open){stopVideos();$('#detail').close();document.body.classList.remove('modal-open');current=null;}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('#detail').open){e.preventDefault();$('#search').focus();}});
try{
 const response=await fetch('data.json?v=83423be56ba5');if(!response.ok)throw Error('Archivio non disponibile');data=await response.json();byId=new Map(data.items.map(r=>[r.id,r]));
 $('#archive-count').textContent=`${data.stats.videos} video · ${data.stats.images} immagini · ${data.stats.tools} strumenti · ${data.stats.projects} progetti`;
 $('#family').innerHTML='<option value="all">Tutte le categorie</option>'+data.categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');topicOptions();
 $('#workflow').innerHTML=data.workflow.map(s=>`<li>${esc(s)}</li>`).join('');$('#principles').innerHTML=data.principles.map(([name,text])=>`<details><summary>${esc(name)}</summary><p>${esc(text)}</p></details>`).join('');
 setView(view);const id=decodeURIComponent(location.hash.slice(1));if(byId.has(id))openDetail(id,false);window.moodboardReady=true;
}catch(e){$('#archive-count').textContent='Caricamento non riuscito. Ricarica la pagina.';$('#grid').innerHTML='<p class="empty">'+esc(e.message)+'</p>';}
