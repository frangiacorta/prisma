// Surface growth is a property of the current form, never a renderer choice.
export const FILAMENT_DEFAULTS={filLength:0,filCore:1,filCount:18000,filWidth:.002,filTaper:.85,filVariation:.45,filScatter:.35,filBend:.2,filComb:0,filCurl:0,filFrizz:.12,filClump:0,filClumps:90,filSpread:.4,filPhase:0,filWind:0,filColor:0,filColorScatter:.1,filRootShade:.5,filBaseWidth:.4,filBaseHeight:1.5,filBaseCurve:.7,filBaseBlend:1};
export const FILAMENT_META={
 filCore:['Presenza della superficie',0,1,.01],filLength:['Lunghezza',0,1.4,.005],filCount:['Numero di filamenti',100,60000,100],filWidth:['Spessore alla base',.0005,.06,.0005],filTaper:['Assottigliamento verso la punta',0,1,.01],filVariation:['Variazione delle lunghezze',0,1,.01],
 filScatter:['Distribuzione irregolare',0,1,.01],filBend:['Curvatura',-1,1,.01],filComb:['Pettinatura sulla superficie',-1,1,.01],filCurl:['Arricciamento',0,1,.01],filFrizz:['Irregolarità',0,1,.01],filClump:['Raggruppamento in ciuffi',0,1,.01],filClumps:['Numero di ciuffi',8,250,1],filSpread:['Apertura delle punte',0,1,.01],
 filBaseWidth:['Svasatura',0,3,.01],filBaseHeight:['Altezza base',.2,6,.05],filBaseCurve:['Profilo arrotondato',0,1,.01],filBaseBlend:['Raccordo colore',0,1,.01],
 filPhase:['Scorrimento',0,1,.001],filWind:['Oscillazione delle punte',0,.5,.005],filColor:['Colore dalla base alla punta',0,1,.01],filColorScatter:['Variazione fra filamenti',0,1,.01],filRootShade:['Ombra alla base',0,1,.01]
};
export const FILAMENT_TRACKS=Object.fromEntries(['filLength','filCore','filWidth','filBend','filComb','filCurl','filClump','filSpread','filPhase','filWind','filBaseWidth','filBaseHeight','filBaseCurve'].map(k=>[k,[FILAMENT_META[k][0],0,Math.max(Math.abs(FILAMENT_META[k][1]),FILAMENT_META[k][2]),FILAMENT_META[k][3]]]));
export function filamentPanel(tab,s,{slider,details}){
 if(s.engine!=='solid')return '';
 const rows=keys=>keys.map(k=>slider(k)).join('');
 if(tab==='shape')return details('Filamenti e spine',rows(['filLength','filCount','filWidth','filTaper','filVariation','filScatter','filCore'])+details('Base',rows(['filBaseWidth','filBaseHeight','filBaseCurve'])+'<p class="help">Svasatura a zero mantiene il diametro del filo. Altezza è proporzionata allo spessore; Profilo passa dal cono al raccordo arrotondato.</p>')+details('Direzione',rows(['filBend','filComb','filCurl','filFrizz']))+details('Ciuffi',rows(['filClump','filClumps','filSpread']))+'<p class="help">Aumenta Lunghezza partendo da zero. I filamenti nascono dalla superficie della forma corrente. Spessore e assottigliamento permettono di passare dal pelo agli aghi e alle spine. Ciuffi raccoglie i filamenti in gruppi; Apertura separa le punte.</p>');
 if(tab==='color')return details('Colore dei filamenti',rows(['filColor','filColorScatter','filRootShade','filBaseBlend'])+'<p class="help">Usa la palette comune. Colore dalla base alla punta mescola la colorazione della forma con una sfumatura lungo ogni filo.</p>');
 return '';
}
