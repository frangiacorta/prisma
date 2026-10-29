export const PRESET_FAMILIES=[['volume','Volumi'],['ring','Anelli e percorsi'],['fibres','Fili e reticoli'],['layers','Superfici e strati'],['branches','Appendici']];
export function presetFamily(s={}){
 const particles=s.engine==='particles';
 if(s.pLiving===1)return 'fibres';
 if(s.pLiving>1||s.volume<.45||s.structLayers>.05||s.structShell>.05||s.structRadial>.05)return 'layers';
 if(s.petalAmount>.05||particles&&s.pTentacle>.05||s.stemAmount>.05)return 'branches';
 if(s.filLength>.005||particles&&(s.pLinks>.01||s.pTrailCount>0)||s.structFibres>.05)return 'fibres';
 if(s.loopAmount>.05||s.hole>.2||particles&&s.pOpening>.3)return 'ring';
 return 'volume';
}
export function familyName(id){return PRESET_FAMILIES.find(([key])=>key===id)?.[1]||'Volumi';}
