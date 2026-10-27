// Public wording and search aliases share one source. State/preset keys stay stable.
export const CONTROL_NAMES={
 hollow:'Svuotamento degli elementi',wallThickness:'Spessore della parete',scattering:'Diffusione interna',translucency:'Luce in controluce',thinFilm:'Intensità della pellicola',coat:'Vernice trasparente',coatRoughness:'Rugosità della vernice',
 volume:'Profondità della forma',deform:'Irregolarità della forma',scale:'Dimensione della figura',positionX:'Posizione orizzontale',positionY:'Posizione verticale',
 structShell:'Svuotamento',structThickness:'Spessore del guscio',structWeave:'Intreccio della trama',petalWeave:'Intreccio delle appendici',filLength:'Lunghezza dei filamenti',petalLength:'Lunghezza delle appendici',
 pTrailLength:'Lunghezza della scia',pBundles:'Fasci di fibre',pBranches:'Rami esterni',filmThickness:'Spessore ottico (nm)',
 subsurface:'Luce sotto la superficie',sssRadius:'Profondità della diffusione',textureDepth:'Intensità del rilievo',growthFeed:'Alimentazione',growthKill:'Rimozione',growthAge:'Iterazioni',
 finishScanMix:'Quantità',finishWarpMix:'Quantità',finishGlassMix:'Quantità',finishGlyphMix:'Quantità',finishEdgeMix:'Quantità',finishGlitchMix:'Quantità',finishMosaicMix:'Quantità',finishRgbMix:'Quantità',
 finishWarpSeed:'Variante',finishGlyphSeed:'Variante',finishGlitchSeed:'Variante',textureSeed:'Variante',growthSeed:'Variante',pMotionSeed:'Variante del movimento'
};
export const SECTION_NAMES={'Materia':'Superficie','Materia e riflessi':'Superficie','Pellicola':'Iridescenza','Interferenza di pellicola':'Iridescenza','Bump procedurale':'Rilievo di superficie','Ritmo':'Andamento','Composizione':'Inquadratura','Distorsione ricorsiva 2D':'Distorsione ricorsiva','Rifrazione 2D':'Vetro ottico','ASCII e segni':'Segni e caratteri','Separazione RGB':'Separazione dei colori','Campi sferici 3d':'Campi sferici 3D','Struttura':'Costruzione','Petali e radici':'Appendici: petali e radici','Trasparenza e diffusione':'Trasparenza e luce interna','Proprietà':'Composizione della struttura'};
export const FILTER_NAMES={scan:'Linee modulate',warp:'Distorsione ricorsiva',glass:'Vetro ottico',glyph:'Segni e caratteri',rgb:'Separazione dei colori',edge:'Contorni',mosaic:'Mosaico',glitch:'Glitch'};
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
// Explicit editorial selections. Arrays are deliberately curated, never positional.
export const ESSENTIALS={
 solid:{
  shape:{base:['volume','deform'],profile:['twist','hole','cut'],shell:['structShell','structThickness'],fibre:['structFibres','structWeft'],layers:['structRadial','structLayers'],folds:['structCurl','structFold'],appendices:['petalAmount','petalLength','petalOpen'],filaments:['filLength','filWidth'],curves:['loopAmount','loopRadius']},
  material:{surface:['metal','roughness','gloss'],glass:['transparency','refraction'],film:['iridescence','filmThickness'],relief:['textureDepth','textureScale'],growth:['growthAmount','growthScale'],emission:['emission']},
  color:{core:['structCoreDark','structCoreRadius'],gradient:['gradientAngle','gradientScale'],layers:['colorLayers'],waves:['colorWaveAmount'],glow:['glow']},
  light:{environment:['environmentPower'],source:['power','size'],motion:['environmentCycles']},
  background:{frame:['scale','positionX','positionY','rotateY'],tone:['exposure','saturation','contrast'],shadow:['grounding']},
  photo:{scan:['finishScanMix','finishScanSpacing','finishScanDepth','finishScanSmooth','finishScanWidth','finishScanCycles'],warp:['finishWarpMix'],glass:['finishGlassMix'],glyph:['finishGlyphMix','finishGlyphCell'],edge:['finishEdgeMix'],glitch:['finishGlitchMix','finishGlitchAmount','finishGlitchBand','finishGlitchWidth','finishGlitchAngle','finishGlitchDirectionRandom','finishGlitchCross','finishGlitchSizeRandom','finishGlitchCycles','finishGlitchFlashMs','finishGlitchDuty'],mosaic:['finishMosaicMix','finishCellX','finishCellY'],rgb:['finishRgbMix']},
  motion:{time:['duration','speed','motion'],dynamics:['dynAmount','dynStiffness','dynDamping','dynGravity','dynWind','dynPin','dynFloor','dynFloorY','dynObstacle','dynObstacleX','dynObstacleY','dynObstacleZ','dynObstacleSize']}
 },
 particles:{
  shape:{core:['pOpening','pFill','pThickness','pOrganic'],grains:['pCount','pSize','pOpacity','pGrainSpacing','pGroupSpacing','pDistributionCells'],links:['pLinks','pLinkNodes','pLinkNodeSize','pLinkWidth','pLinkReach'],trails:['pTrailLength','pTrailWidth','pTrailCount'],skin:['pSkin','pFoldDepth','pPores']},
  material:{surface:['metal','roughness','gloss'],trails:['pFiberSheen','pFiberSpread'],film:['pFilm','filmThickness'],opacity:['transparency','refraction','emission']},
  color:{core:['structCoreDark','structCoreRadius'],gradient:['gradientAngle','gradientScale'],particles:['pColorScatter'],layers:['colorLayers','colorLayerScale','colorLayerShift','colorLayerMix'],glow:['glow']},
  light:{environment:['environmentPower'],source:['power','size'],particles:['pLighting']},
  background:{frame:['scale','positionX','positionY','rotateY'],tone:['exposure','saturation','contrast'],shadow:['pShadow','pShadowHeight','pShadowSoftness','pSelfShadow','pCaustic']},
  photo:{scan:['finishScanMix','finishScanSpacing','finishScanDepth','finishScanSmooth','finishScanWidth','finishScanCycles'],mosaic:['finishMosaicMix','finishCellX'],glitch:['finishGlitchMix','finishGlitchAmount','finishGlitchBand','finishGlitchWidth','finishGlitchAngle','finishGlitchDirectionRandom','finishGlitchCross','finishGlitchSizeRandom','finishGlitchCycles','finishGlitchFlashMs','finishGlitchDuty'],glyph:['finishGlyphMix','finishGlyphCell'],glass:['finishGlassMix'],warp:['finishWarpMix'],rgb:['finishRgbMix'],edge:['finishEdgeMix']},
  motion:{time:['duration','speed','pCycles'],dynamics:['dynAmount','dynStiffness','dynDamping','dynGravity','dynWind','dynPin','dynFloor','dynFloorY','dynObstacle','dynObstacleX','dynObstacleY','dynObstacleZ','dynObstacleSize']}
 }
};
export const EXPERT_KEYS=new Set(['seed','textureSeed','growthSeed','growthFeed','growthKill','growthDiffusion','growthAge','pMotionSeed','finishWarpSeed','finishGlyphSeed','finishGlitchSeed','petalCollision','petalSphereCollision','petalContactPasses','petalContactGap','petalContactDamping','petalContactFriction','pTrailQuality']);
export const ESSENTIAL_FLAGS=new Set(['keepMotionSpeed','finishGlitchFlash','perfectLoop','thinShellMode','environmentRotate','finishScan','finishScanOnly','finishScanSource','finishScanAnimate','finishEnabled','finishWarp','finishGlass','finishGlyph','finishEdge','finishGlitch','finishGlitchAnimate','finishMosaic','finishRgb']);
export const ESSENTIAL_FIELDS=new Set(['dynObstacle','bg-mode','environment','glyph-characters','pSprite','pColorMode','pDirection','pShadowLight','finishGlitchShape']);
export const ESSENTIAL_BUTTONS='[data-dynamics-reset],[data-base-form],#particle-sphere,#add-color,[data-remove-color],#add-light,[data-light-select],#show-lights,[data-remove-light],[data-animate-open],[data-animate-path],[data-animation-group],[data-parameter-jump],[data-open-library],[data-motion-preset],[data-jump-tab],#add-animation';
export function essentialKeys(engine,tab){return new Set(Object.values(ESSENTIALS[engine==='particles'?'particles':'solid']?.[tab]||{}).flat());}

