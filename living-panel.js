import {LIVING_STYLES,PARTICLE_STUDIES,SPHERE_FORM} from './particle-model.js?v=ce862a198a9f';
export function applyLivingStyle(s,style){
 const values=LIVING_STYLES[style];if(!values)return;
 if(s.engine==='solid'&&!s.pLiving&&style!=='off'){
  const example=PARTICLE_STUDIES.find(q=>q.values.pLiving===values.pLiving);
  Object.assign(s,SPHERE_FORM,Object.fromEntries(Object.entries(example.values).filter(([k])=>k.startsWith('p'))));
 }
 Object.assign(s,values);
}
export function livingChooser(s,h){return h.details('Tipo di forma',`<label class="field">Struttura<select data-particle-select="pLiving">${['Volume scolpito','Fibre che respirano','Tessuto connesso','Membrana viva'].map((n,i)=>`<option value="${i}" ${s.pLiving===i?'selected':''}>${n}</option>`).join('')}</select></label><p class="help">Geometria qui; animazione in Movimento. ${s.pLiving?"Per aggiungere particelle apri Granelli.":"Scegli una struttura viva per aggiungere granelli."}</p>`);}
export function livingComposition(s,{slider,details}){if(!s.pLiving)return '';return details('Integrazione con la struttura',slider('pLivingBlend',['Solo granelli e scie','Solo struttura'])+slider('pSurfaceBind',['Nel volume','Sulla struttura'])+slider('pLivingOcclusion',['Nucleo visibile','Pelle schermante'])+`<p class="help">Adesione lega granelli e nodi alla superficie. Le scie conservano i propri percorsi; Schermatura rispetta pori e trasparenza.</p><button class="outline" data-living-core="true">Aggiungi granelli</button><button class="quiet" data-living-workspace="${s.engine==='solid'?'particles':'solid'}">Apri in ${s.engine==='solid'?'Particelle':'Forme'}</button>`);}
export function livingMotion(s,{slider,details}){return s.pLiving?details('Struttura viva · respiro e flessibilità',['pInflate','pContract','pBundleDelay','pElastic','pBend','pVolumeHold'].map(k=>slider(k)).join('')+'<p class="help">Elasticità e flessione regolano la risposta al moto. Conserva volume contrasta la contrazione. La deformazione è periodica, senza collisioni fisiche.</p>'):'';}
export function livingPanel(s,h){
 const {slider,section,details}=h,sliders=keys=>keys.map(k=>slider(k)).join('');
 const chooser=s.engine==='solid'?'':`<label class="field">Struttura connessa<select data-particle-select="pLiving">${['Spenta','Fasci di fibre','Tessuto','Membrana'].map((n,i)=>`<option value="${i}" ${s.pLiving===i?'selected':''}>${n}</option>`).join('')}</select></label>`;
 if(!s.pLiving)return chooser?details('Fibre, tessuto e membrane',chooser):'';
 return section('Struttura viva',chooser+sliders(['pThreadWidth','pStrands'])+details('Fili e intreccio',(s.pLiving===1?sliders(['pBundles','pBundleSpread']):'')+sliders(['pWeft','pFray']))+details('Pieghe della superficie',sliders(['pFoldCount','pFoldDepth']))+details('Pelle e pori',sliders(['pSkinOpening','pSkinOffset','pPores','pPoreCount'])+'<p class="help">Richiede Pelle sopra zero in Materia. La pelle mostra lo strato più vicino; non simula rifrazione interna.</p>')+'<p class="help">Il respiro è in Movimento. Granelli, adesione e passaggio fra le componenti sono in Granelli.</p>');
}
