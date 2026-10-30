import {STRUCTURE_DEFAULTS,integrateStructure} from './structure-model.js?v=35455dbed4a0';
import {beginVeilTransform} from './veil-model.js?v=35455dbed4a0';
import {LIVING_STYLES,PARTICLE_STUDIES,SPHERE_FORM} from './particle-model.js?v=35455dbed4a0';
export function applyLivingStyle(s,style){
 if(s.engine==='solid'){
  const values={off:STRUCTURE_DEFAULTS,fibres:{structShell:1,structFibres:1},tissue:{structShell:1,structFibres:1,structWeft:1},membrane:{structShell:1},veils:{structShell:1,structRadial:.65,structCurl:.4}}[style];
  if(values)Object.assign(s,values,{pLiving:0,renderVersion:2});return;
 }
 if(style==='veils'){beginVeilTransform(s);integrateStructure(s);return;}
 const values=LIVING_STYLES[style];if(values)Object.assign(s,values);
}
export function livingChooser(s,h){return (s.pLiving===0?h.section('Transizione',`<button class="outline full" data-veil-transform="true">Suddividi questa forma in lamine</button><p class="help">Parti dalla forma che stai creando. Conservi colori, luci e animazioni.</p>`):'')+h.details('Tipo di forma',`<label class="field">Struttura<select data-particle-select="pLiving">${['Volume scolpito','Fibre a posa periodica','Tessuto connesso','Superficie continua','Lamine sovrapposte'].map((n,i)=>`<option value="${i}" ${s.pLiving===i?'selected':''}>${n}</option>`).join('')}</select></label><p class="help">Geometria qui; animazione in Movimento. ${s.pLiving===4?'Apri gradualmente la forma in strati: nessun preset viene caricato.':s.pLiving?"Per aggiungere particelle apri Particelle.":"Scegli una struttura viva per aggiungere granelli."}</p>`);}
export function livingComposition(s,{slider,details}){if(!s.pLiving)return '';return details('Integrazione con la struttura',slider('pLivingBlend',['Solo granelli e scie','Solo struttura'])+slider('pSurfaceBind',['Nel volume','Sulla struttura'])+slider('pLivingOcclusion',['Nucleo visibile','Pelle schermante'])+`<p class="help">Adesione lega granelli e nodi alla superficie. Le scie conservano i propri percorsi; Schermatura rispetta pori e trasparenza.</p><button class="outline" data-living-core="true">Aggiungi granelli</button><button class="quiet" data-living-workspace="${s.engine==='solid'?'particles':'solid'}">Apri in ${s.engine==='solid'?'Particelle':'Forme'}</button>`);}
export function livingMotion(s,{slider,details}){return s.pLiving?details('Vincoli di distanza e flessione',['pInflate','pContract','pBundleDelay','pElastic','pBend','pVolumeHold'].map(k=>slider(k)).join('')+'<p class="help">Vincoli di distanza e flessione e flessione regolano la risposta al moto. Conserva volume contrasta la contrazione. La deformazione è periodica, senza collisioni fisiche.</p>'):'';}
export function closeLivingSkin(s){if(!s.pLiving)s.pLiving=3;Object.assign(s,{pSkin:1,pSkinOpening:0,pPores:0,pOpening:0});for(const key of ['pSkinOpening','pPores','pOpening'])if(s.motions?.[key])s.motions[key].enabled=false;return s;}
export function livingPanel(s,h){
 const {slider,section,details}=h,sliders=keys=>keys.map(k=>slider(k)).join('');
 const control='<label class="check"><input type="checkbox" data-living-enabled="true" '+(s.pLiving?'checked':'')+'>Superficie connessa alle particelle</label>';
 return section('Superficie e reticolo',control+sliders(['pSkin','pSkinScale','pSkinThickness','pSkinFollow'])+'<button class="outline" data-close-skin="true">Chiudi pelle</button><p class="help">Visibilità non chiude i fori. Chiudi pelle azzera Apertura della pelle, Pori e Sfera ↔ anello. Mantiene materiale, dimensioni, pieghe e movimento. I campi repulsivi possono ancora scavare la superficie.</p>'+details('Reticolo della pelle',sliders(['pThreadOpacity','pThreadWidth','pStrands','pWeft']))+'<p class="help">Pelle, fili longitudinali e trama trasversale si combinano sulla stessa superficie. Particelle e scie restano regolabili nelle rispettive sezioni.</p>')
 +details('Geometria dei fili',sliders(['pBundleAmount','pBundles','pBundleSpread','pFray']))
 +details('Pieghe e aperture della superficie',sliders(['pFoldCount','pFoldDepth','pSkinOpening','pSkinOffset','pPores','pPoreCount'])+'<p class="help">L’apertura e i pori richiedono Pelle sopra zero. Adesione pelle segue un campione dei granelli reali; Adesione granelli fa il percorso inverso. in Forme trovi anche svuotamento, lamelle e strati concentrici.</p>');
}
