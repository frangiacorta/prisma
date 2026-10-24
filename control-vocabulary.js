// Public wording and search aliases share one source. State/preset keys stay stable.
export const CONTROL_NAMES={
 hollow:'Svuotamento degli elementi',wallThickness:'Spessore della parete',scattering:'Diffusione interna',translucency:'Luce in controluce',thinFilm:'Intensità della pellicola',coat:'Vernice trasparente',coatRoughness:'Rugosità della vernice',
 volume:'Profondità della forma',deform:'Irregolarità della forma',scale:'Dimensione della figura',positionX:'Posizione orizzontale',positionY:'Posizione verticale',
 structShell:'Svuotamento',structThickness:'Spessore del guscio',structWeave:'Intreccio della trama',petalWeave:'Intreccio delle appendici',filLength:'Lunghezza dei filamenti',petalLength:'Lunghezza delle appendici',
 pTrailLength:'Lunghezza della scia',pBundles:'Fasci di fibre',pBranches:'Rami esterni',filmThickness:'Spessore ottico (nm)',
 subsurface:'Luce sotto la superficie',sssRadius:'Profondità della diffusione',textureDepth:'Intensità del rilievo',growthFeed:'Alimentazione',growthKill:'Rimozione',growthAge:'Iterazioni',
 finishWarpMix:'Quantità',finishGlassMix:'Quantità',finishGlyphMix:'Quantità',finishEdgeMix:'Quantità',finishGlitchMix:'Quantità',finishMosaicMix:'Quantità',finishRgbMix:'Quantità',
 finishWarpSeed:'Variante',finishGlyphSeed:'Variante',finishGlitchSeed:'Variante',textureSeed:'Variante',growthSeed:'Variante',pMotionSeed:'Variante del movimento'
};
export const SECTION_NAMES={'Materia':'Superficie','Materia e riflessi':'Superficie','Pellicola':'Iridescenza','Interferenza di pellicola':'Iridescenza','Bump procedurale':'Rilievo di superficie','Ritmo':'Andamento','Composizione':'Inquadratura','Distorsione ricorsiva 2D':'Distorsione ricorsiva','Rifrazione 2D':'Vetro ottico','ASCII e segni':'Segni e caratteri','Separazione RGB':'Separazione dei colori','Campi sferici 3d':'Campi sferici 3D','Struttura':'Costruzione','Petali e radici':'Appendici: petali e radici','Trasparenza e diffusione':'Trasparenza e luce interna','Proprietà':'Composizione della struttura'};
export const FILTER_NAMES={warp:'Distorsione ricorsiva',glass:'Vetro ottico',glyph:'Segni e caratteri',rgb:'Separazione dei colori',edge:'Contorni',mosaic:'Mosaico',glitch:'Glitch'};
export function nameControls(root){
 for(const el of root.querySelectorAll('[data-param]')){const name=CONTROL_NAMES[el.dataset.param];if(!name)continue;const row=el.closest('.param'),label=row?.querySelector('label');if(label){el.dataset.searchAliases=label.textContent;label.textContent=name;row.querySelector('.number')?.setAttribute('aria-label',name+': valore');}}
 for(const el of root.querySelectorAll('[data-path$=".softness"]')){const label=el.closest('.param')?.querySelector('label');if(label)label.textContent='Morbidezza della luce';}
 for(const el of root.querySelectorAll('summary,h2')){const name=SECTION_NAMES[el.textContent.trim()];if(name){el.dataset.searchAliases=el.textContent;el.textContent=name;}}
 for(const [key,name] of Object.entries(FILTER_NAMES)){
  const stem='finish'+key[0].toUpperCase()+key.slice(1),check=root.querySelector(`[data-check="${stem}"]`),label=check?.closest('label');
  if(label)for(const n of [...label.childNodes])if(n.nodeType===3)n.textContent=' Attiva '+name.toLowerCase();
  const reset=root.querySelector('#reset-'+key);if(reset)reset.textContent='Ripristina '+name.toLowerCase();
 }
}
