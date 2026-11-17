// Presentation only: move existing controls, keeping handlers and project data.
const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
export function organizeWorkspace(){
 const bar=document.querySelector('.random-bar');if(!bar||bar.dataset.organized)return;bar.dataset.organized='true';
 const move=(host,ids)=>{for(const id of ids){const e=document.getElementById(id);if(e)host.append(e);}};
 const group=(label,ids)=>{const g=make('div','workspace-action-group');g.setAttribute('aria-label',label);g.setAttribute('role','group');move(g,ids);bar.append(g);return g;};
 group('Preset',['favorite','gallery-open']);
 const menus=[];
 const menu=(label,ids)=>{const d=make('details','workspace-action-menu'),s=make('summary','',label),body=make('div','workspace-action-body');d.append(s,body);move(body,ids);bar.append(d);menus.push(d);d.addEventListener('toggle',()=>{if(d.open)for(const other of menus)if(other!==d)other.open=false;});d.addEventListener('keydown',e=>{if(e.key==='Escape'){d.open=false;s.focus();}});body.addEventListener('click',e=>{if(e.target.closest('button'))d.open=false;});return body;};
 const variants=menu('Varianti',['randomize','random-settings','similar']);variants.id='workspace-variants';variants.append(document.querySelector('.seed'));
 menu('Confronta',['compare-pin','compare-open']);
 group('Nuova creazione',['reset']);
 document.querySelector('.compare-actions')?.remove();
 const rename=(id,name)=>{const e=document.getElementById(id);if(e)e.textContent=name;};
 rename('randomize','Applica variazione casuale');rename('random-settings','Regola variazione…');rename('similar','Genera otto varianti');rename('compare-pin','Conserva versione attuale');rename('compare-open','Confronta con la conservata');rename('reset','Nuova creazione');
 document.addEventListener('pointerdown',e=>{for(const d of menus)if(!d.contains(e.target))d.open=false;});
}
export const PANEL_GUIDES={
 shape:'Geometria, elementi e struttura. Posizione e dimensione sono in Scena.',
 material:'Superficie, trasparenza, riflessi e rilievo. I colori sono nella scheda Colori.',
 color:'Palette e distribuzione sulla creazione. Esposizione e saturazione sono in Scena.',
 light:'Ambiente e sorgenti di luce. I riflessi dipendono anche dal materiale.',
 background:'Inquadratura, sfondo e correzione colore.',
 photo:'Effetti sull’immagine finale. Trascina i filtri per cambiare il loro ordine.',
 motion:'Tempi, animazioni e dinamica. Campi, mani e audio sono in Interazione.',
 fields:'Attrazione e repulsione: crea punti, cerchi e percorsi nella scena.',
 body:'Collega mani e braccia ai parametri della creazione.',
 audio:'Collega volume, frequenze e battito ai parametri della creazione.',
 library:'Una scena completa sostituisce la creazione. Un esempio modifica solo la categoria indicata.'
};
