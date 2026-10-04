export const MAX_COLORS=12,MAX_LIGHTS=8;
export const LIGHT_TYPES=[['circle','Circolare'],['bar','Barra'],['spot','Faro'],['diffuser','Diffusore'],['grid','Griglia'],['ring','Anello luminoso'],['orb','Sfera omnidirezionale']];
export const LIGHT_META={x:['X · destra / sinistra',-5,5,.01],y:['Y · alto / basso',-5,5,.01],z:['Z · davanti / dietro',-5,5,.01],power:['Intensità',0,6,.01],size:['Larghezza sorgente',.05,3,.01],length:['Altezza sorgente',.05,3,.01],roll:['Rotazione sorgente',-180,180,1],softness:['Diffusione',.01,1,.01],cone:['Apertura faro',5,85,1],grid:['Divisioni griglia',2,12,1]};
export function track(amplitude=1,enabled=false,mode='wave'){return{enabled,amplitude,cycles:1,phase:0,direction:1,curve:'sine',mode}}
export const SHAPE_TRACKS=['volume','deform','twist','waves','hole','cut','petalOpen','petalCurl','petalInflate','petalSharp','petalPhase','petalBlend','petalRoot','petalRandom','stemBend'];
export const TRACK_META={
 petalOpen:['Apertura dei petali',0,.6,.01],petalCurl:['Arricciatura dei petali',0,1,.01],petalInflate:['Gonfiore dei petali',0,.7,.01],petalSharp:['Petali / punte',0,.7,.01],petalPhase:['Rotazione della corona',0,360,1],petalBlend:['Fusione con la sfera',0,1,.01],petalRoot:['Ampiezza delle radici',0,1,.01],petalRandom:['Irregolarità delle punte',0,1,.01],stemBend:['Oscillazione del gambo',0,.8,.01],colorWavePhase:['Onde di colore',0,1,.01],
 rotateY:['Rotazione orizzontale',0,360,1],rotateX:['Rotazione verticale',0,180,1],rotateZ:['Rotazione sul piano',0,360,1],volume:['Volume',0,.6,.01],deform:['Deformazione',0,.4,.01],twist:['Torsione',0,2,.01],waves:['Increspature',0,.3,.01],hole:['Apertura del vuoto',0,.6,.01],cut:['Ritaglio',0,.8,.01],scale:['Dimensione',0,.7,.01],positionX:['Posizione orizzontale',0,1.2,.01],positionY:['Posizione verticale',0,1.2,.01],gradientOffset:['Scorrimento colori',0,1,.01],iridescence:['Iridescenza',0,.7,.01],roughness:['Rugosità',0,.6,.01],transparency:['Trasparenza',0,.7,.01]
};
export const EXTRA_BASE={
 petalAmount:0,petalCount:12,petalOpen:.65,petalCurl:0,petalLength:1.05,petalWidth:.24,petalInflate:.6,petalSharp:0,petalCoverage:0,petalRows:5,petalPhase:0,petalBlend:0,petalRoot:0,petalRandom:0,stemAmount:0,stemRadius:.09,stemBend:0,
 colorWaveAmount:0,colorWaveHeight:1,colorWaveRadius:0,colorWaveSwirl:0,colorWaveBands:1,colorWaveWarp:.2,colorWavePhase:0,groundShadow:1,groundCaustic:1,
 bgHeight:-.65,bgSoftness:1.1,bgWash:.12,bgShade:.06,
 roundness:0,taper:0,bendX:0,bendY:0,lobeAmount:0,lobes:5,pinch:0,rimRound:0,holeAspect:1,cutAspect:1,rotateZ:0,
 coat:0,coatRoughness:.1,fresnel:1,iridShift:0,iridScale:1,dispersion:0,absorption:.15,tintStrength:.15,anisotropy:0,anisotropyAngle:0,surfaceTexture:0,
 hollow:0,wallThickness:.08,translucency:0,scattering:0,scatterDirection:.25,thinFilm:0,filmThickness:420,subsurface:0,sssRadius:.35,sssColor:'#ffc49b',
 exposure:0,brightness:0,contrast:1,saturation:1,temperature:0,photoTint:0,gamma:1,blacks:0,highlights:0,vignette:0,lensDistortion:0,grainSize:1,photoAll:false,
 motions:Object.fromEntries(Object.keys(TRACK_META).map(k=>[k,track(k==='rotateY'?360:k==='volume'?.12:k==='deform'?.048:k==='twist'?.4:k.startsWith('rotate')?30:.2,k==='volume'||k==='deform',k==='rotateY'||k==='gradientOffset'?'cycle':'wave')]))
};
export function newLight(id=1){return{id,enabled:true,visible:true,type:'circle',color:'#e0eaff',x:-1.4,y:1.8,z:2.5,power:1.8,size:.9,length:.6,roll:0,softness:.3,cone:30,grid:5,orbit:{...track(35),axis:'y'},pulse:track(.3)}}
export const LIGHT_SOURCES=[
 {name:'Barra neon',values:{type:'bar',size:.05,length:1.1,softness:.06,power:2.8,color:'#66eaff',x:1.25,y:.1,z:1.8,roll:15}},
 {name:'Anello alogeno',values:{type:'ring',size:.95,length:.95,softness:.08,power:2.2,color:'#ffe5b0',x:0,y:.15,z:2.1}},
 {name:'Softbox',values:{type:'diffuser',size:.9,length:1.3,softness:.65,power:1.5,color:'#f2f6ff',x:-1.7,y:1.4,z:2.5}},
 {name:'Faro',values:{type:'spot',size:.35,softness:.15,cone:25,power:2.6,color:'#ffd8bd',x:1.5,y:1.3,z:2.3}}
];
export const LIGHT_RIGS=[
 {name:'Neon cyan e rosa',lights:[{...LIGHT_SOURCES[0].values,x:-1.35,roll:-12,color:'#70eaff'},{...LIGHT_SOURCES[0].values,x:1.35,roll:12,color:'#ff6bca'}]},
 {name:'Anello alogeno',lights:[{...LIGHT_SOURCES[1].values,visible:false},{type:'bar',size:.08,length:1.1,x:-1.6,y:.4,z:-1.1,power:1.4,color:'#a7cfff',visible:false,softness:.15}]},
 {name:'Doppio anello',lights:[{...LIGHT_SOURCES[1].values,size:1.35,z:-1.7,color:'#ffcd8e'},{...LIGHT_SOURCES[1].values,size:1.55,z:-2.6,color:'#a0dfff',power:1.4}]},
 {name:'Tunnel di neon',lights:[{type:'ring',size:1.3,z:-1.5,power:2.1,color:'#6688ff',softness:.045},{type:'ring',size:1.45,z:-2.5,power:1.8,color:'#eb68ff',softness:.045},{type:'ring',size:1.6,z:-3.5,power:1.4,color:'#72f0de',softness:.045}]},
 {name:'Neon incrociati',lights:[{...LIGHT_SOURCES[0].values,x:-1.1,y:.35,roll:-45,color:'#be74ff'},{...LIGHT_SOURCES[0].values,x:1.1,y:-.2,roll:45,color:'#6fe5ff'},{...LIGHT_SOURCES[0].values,x:0,y:1.4,z:-1.7,roll:90,color:'#ffd584',power:1.8}]},
 {name:'Studio diffuso',lights:[{...LIGHT_SOURCES[2].values,visible:false},{...LIGHT_SOURCES[2].values,x:1.6,y:-.2,z:1.5,size:.65,length:.9,power:.9,color:'#dfd6ff',visible:false}]}
];
export function legacyLights(s){const build=(id,p)=>{const angle=s[p+'Angle']*Math.PI/180,height=s[p+'Height']*Math.PI/180;return{...newLight(id),visible:true,type:'bar',x:3.2*Math.sin(angle)*Math.cos(height),y:3.2*Math.sin(height),z:3.2*Math.cos(angle)*Math.cos(height),color:s[p+'Color'],power:s[p+'Power'],size:1.7,length:s[p+'Size']*.6,softness:s[p+'Size'],enabled:id===1||s.light2}};return[build(1,'light'),build(2,'light2')]}
export const EXTRA_META={
 petalAmount:['Petali e punte',0,1,.01],petalCount:['Numero di petali / punte',3,24,1],petalOpen:['Apertura',0,1,.01],petalCurl:['Arricciatura',-1,1,.01],petalLength:['Lunghezza',.15,1.8,.01],petalWidth:['Larghezza dei petali',.025,.45,.005],petalInflate:['Gonfiore',0,1,.01],petalSharp:['Acutezza delle punte',0,1,.01],petalCoverage:['Corona / superficie sferica',0,1,.01],petalRows:['File sulla sfera',2,8,1],petalPhase:['Rotazione della corona',0,360,1],petalBlend:['Fusione con la sfera',0,1,.01],petalRoot:['Ampiezza delle radici',0,1,.01],petalRandom:['Irregolarità delle punte',0,1,.01],stemAmount:['Lunghezza del gambo',0,1,.01],stemRadius:['Spessore del gambo',.015,.2,.005],stemBend:['Curvatura del gambo',-1,1,.01],
 colorWaveAmount:['Onde di colore',0,1,.01],colorWaveHeight:['Fasce lungo la figura',-2,2,.01],colorWaveRadius:['Fasce radiali',-2,2,.01],colorWaveSwirl:['Vortice cromatico',-1,1,.01],colorWaveBands:['Numero delle fasce',.25,4,.01],colorWaveWarp:['Ondulazione dei colori',0,1,.01],colorWavePhase:['Posizione delle onde',0,1,.001],groundShadow:['Ombra sul fondale',0,1,.01],groundCaustic:['Caustica luminosa',0,1,.01],
 bgHeight:['Altezza della sfumatura',-2,2,.01],bgSoftness:['Morbidezza del fondale',.15,2.5,.01],bgWash:['Luce centrale',0,1,.01],bgShade:['Ombra ai bordi',0,.5,.01],
 roundness:['Sfera / cubo morbido',0,1,.01],taper:['Affusolamento',-.8,.8,.01],bendX:['Curvatura orizzontale',-.7,.7,.01],bendY:['Curvatura verticale',-.7,.7,.01],lobeAmount:['Petali e lobi',0,.4,.01],lobes:['Numero di lobi',2,12,1],pinch:['Strozzatura centrale',0,.65,.01],rimRound:['Raccordo dei ritagli',0,.15,.005],holeAspect:['Proporzioni del vuoto',.3,2.5,.01],cutAspect:['Proporzioni del ritaglio',.3,2.5,.01],rotateZ:['Rotazione sul piano',-180,180,1],
 coat:['Vernice trasparente',0,1,.01],coatRoughness:['Rugosità della vernice',0,1,.01],fresnel:['Riflessi sui bordi',0,2,.01],iridShift:['Tinta iridescente',0,1,.01],iridScale:['Ampiezza iridescenza',.1,4,.01],dispersion:['Dispersione cromatica',0,1,.01],absorption:['Assorbimento',0,2,.01],tintStrength:['Tinta interna',0,1,.01],anisotropy:['Riflessi allungati',0,1,.01],anisotropyAngle:['Direzione della satinatura',-180,180,1],surfaceTexture:['Microtexture',0,1,.01],
 hollow:['Vuotezza interna',0,1,.01],wallThickness:['Spessore della parete',.003,1,.001],translucency:['Traslucenza / controluce',0,1,.01],scattering:['Diffusione interna · scattering',0,1,.01],scatterDirection:['Direzione della diffusione',-.8,.8,.01],thinFilm:['Pellicola iridescente',0,1,.01],filmThickness:['Spessore pellicola (nm)',80,1200,1],
 subsurface:['Subsurface scattering · SSS',0,1,.01],sssRadius:['Distanza di diffusione SSS',.03,2,.01],
 exposure:['Esposizione (EV)',-3,3,.05],brightness:['Luminosità',-.5,.5,.01],contrast:['Contrasto',.2,2.5,.01],saturation:['Saturazione',0,2.5,.01],temperature:['Temperatura',-1,1,.01],photoTint:['Tinta verde / magenta',-1,1,.01],gamma:['Gamma',.5,2,.01],blacks:['Ombre',-.4,.4,.01],highlights:['Alte luci',-.6,.6,.01],vignette:['Vignettatura',0,1,.01],lensDistortion:['Distorsione lente',-.6,.6,.01],grainSize:['Dimensione grana',.5,5,.1]
};
export const MORE_MOODS=[
 {name:'Cyberpunk',colors:['#0e163d','#0de3ff','#ed21cc','#f9ee44','#ad4aff']},
 {name:'Boreale',colors:['#112344','#00a99d','#74ffd9','#9583e7','#d5baff']},
 {name:'Flamingo',colors:['#e8447b','#ff95ba','#ffd2aa']},
 {name:'Laguna',colors:['#0e4d64','#1cb5ab','#88f4de','#e8f6dd']},
 {name:'Rame',colors:['#502b25','#bf7858','#edb28d','#ffe4ca']},
 {name:'Oro',colors:['#5d3a1b','#c59b42','#ffe5a0']},
 {name:'Petrolio',colors:['#0b222b','#126977','#58b4b4']},
 {name:'Prugna',colors:['#29122d','#6b3378','#b572ba','#ffc1e6']},
 {name:'Ghiaccio',colors:['#1e4780','#9dc9f6','#e0f6ff','#fffaff']},
 {name:'Sorbetto',colors:['#ffc3d5','#ffddb4','#c4f1d4','#b5d4ff','#d5baff']},
 {name:'Monocromo',colors:['#19212f','#738199','#e4edf8']},
 {name:'Arcobaleno',colors:['#ff5179','#ffa553','#f9ee80','#85ecb2','#54c9f4','#a384ff']}
];
export const LEGACY_MATERIAL_STYLES=[
 {name:'Acqua',values:{metal:0,transparency:1,refraction:1.333,roughness:0,gloss:1,coat:0,iridescence:0,dispersion:.035,absorption:.008,tintStrength:.015}},
 {name:'Vetro',values:{metal:0,transparency:1,refraction:1.5,roughness:.02,gloss:1,coat:0,iridescence:0,dispersion:.15,absorption:.015,tintStrength:.035}},
 {name:'Cromo',values:{metal:1,transparency:0,roughness:.04,gloss:1,coat:.3,anisotropy:0,iridescence:.12}},
 {name:'Satinato',values:{metal:.88,transparency:0,roughness:.4,gloss:.7,anisotropy:.85,coat:0,surfaceTexture:.2}},
 {name:'Perla',values:{metal:.2,transparency:.15,roughness:.25,gloss:.75,iridescence:.9,iridScale:2,coat:.45}},
 {name:'Ceramica',values:{metal:0,transparency:0,roughness:.2,gloss:.6,iridescence:0,coat:.9,coatRoughness:.08}},
 {name:'Opaco',values:{metal:0,transparency:0,roughness:1,gloss:0,iridescence:0,coat:0,anisotropy:0}},
 {name:'Olio',values:{metal:.48,transparency:.25,roughness:.05,gloss:1,iridescence:1,iridScale:3.2,coat:.75,dispersion:.6}},
 {name:'Bolla di sapone',values:{metal:0,transparency:1,refraction:1.333,roughness:0,gloss:1,iridescence:.6,hollow:1,wallThickness:.003,thinFilm:1,filmThickness:420,absorption:0,tintStrength:0}},
 {name:'Palloncino chiaro',values:{metal:0,transparency:.97,refraction:1.38,roughness:.035,gloss:1,iridescence:.08,hollow:1,wallThickness:.025,absorption:.04,tintStrength:.09,scattering:.06}},
 {name:'Vetro satinato',values:{metal:0,transparency:1,refraction:1.5,roughness:.48,gloss:.8,iridescence:0,scattering:.5,translucency:.45}},
 {name:'Carta in controluce',values:{metal:0,transparency:.04,refraction:1.12,roughness:.85,gloss:.08,iridescence:0,hollow:1,wallThickness:.025,translucency:.78,scattering:.95,subsurface:.65,sssRadius:.25,thickness:1.7,scatterDirection:.3,absorption:.22,tintStrength:.25,surfaceTexture:.3}},
 {name:'Pelle sottile',values:{metal:0,transparency:.1,refraction:1.4,roughness:.4,gloss:.38,iridescence:0,hollow:1,wallThickness:.075,translucency:.7,scattering:.45,subsurface:.8,sssRadius:.65,sssColor:'#ffc49b',scatterDirection:.65,absorption:.4,tintStrength:.7,surfaceTexture:.18}}
].map(m=>({...m,values:{hollow:0,wallThickness:.08,translucency:0,scattering:0,scatterDirection:.25,thinFilm:0,filmThickness:420,subsurface:0,sssRadius:.35,sssColor:'#ffc49b',thickness:1,absorption:.05,tintStrength:.05,dispersion:0,fresnel:1,iridScale:1,iridShift:0,anisotropy:0,surfaceTexture:0,coat:0,emission:0,...m.values}}));

export const ENVIRONMENTS=[['studio','Studio'],['sunset','Tramonto'],['neon','Neon'],['sky','Cielo'],['aquarium','Acquario'],['aurora','Aurora'],['city','Notte in città']];
export const BACKDROPS=[
 {name:'Azzurro polvere',colors:['#d0dbea','#929ba7']},
 {name:'Perla',colors:['#e1e3e8','#aaaeb6']},
 {name:'Cipria',colors:['#e8d6dc','#a89aa6']},
 {name:'Salvia',colors:['#d8e3dc','#98aaa3']},
 {name:'Crema',colors:['#ece5d8','#b1a699']},
 {name:'Lavanda',colors:['#dfdcf0','#a5a0b7']},
 {name:'Ghiaccio',colors:['#dce8ef','#98adb8']},
 {name:'Grigio galleria',colors:['#eeeeed','#a9aaa8']},
 {name:'Nero puro',colors:['#000000','#000000'],dark:true,mode:'solid',wash:0,shade:0},
 {name:'Nero carbone',colors:['#070708','#070708'],dark:true,mode:'solid',wash:0,shade:0},
 {name:'Grafite pieno',colors:['#191a1d','#191a1d'],dark:true,mode:'solid',wash:0,shade:0},
 {name:'Ardesia piena',colors:['#303237','#303237'],dark:true,mode:'solid',wash:0,shade:0},
 {name:'Grigio fumo',colors:['#3d3f43','#3d3f43'],dark:true,mode:'solid',wash:0,shade:0},
 {name:'Nero velluto',colors:['#15161a','#010102'],dark:true,wash:0,shade:.15},
 {name:'Antracite',colors:['#26282d','#0a0b0d'],dark:true,wash:.012,shade:.1},
 {name:'Notte blu',colors:['#0c1321','#010204'],dark:true,wash:.006,shade:.15},
 {name:'Petrolio profondo',colors:['#0b1718','#010405'],dark:true,wash:.006,shade:.12},
 {name:'Prugna nera',colors:['#1a0e1a','#040104'],dark:true,wash:.006,shade:.12},
 {name:'Bruno fumé',colors:['#1e1713','#050403'],dark:true,wash:.006,shade:.12},
 {name:'Argento scuro',colors:['#35383e','#111216'],dark:true,wash:.015,shade:.1}
];
export const MODERN_BASE={renderVersion:2,environment:'studio',environmentAngle:0,environmentPower:1,environmentRefraction:0,environmentRotate:false,environmentCycles:1,internalColor:'#e6f5ff',fullness:1,thinShell:0,filmFlow:0,filmSwirl:0,filmCycles:1,grounding:0};
const clear={...MODERN_BASE,metal:0,transparency:1,refraction:1.5,roughness:.02,gloss:1,iridescence:0,emission:0,coat:0,coatRoughness:.06,fresnel:1,hollow:0,wallThickness:1,thickness:1,translucency:0,scattering:0,subsurface:0,sssRadius:.55,sssColor:'#ffd0ac',scatterDirection:.25,thinFilm:0,filmThickness:420,absorption:.012,tintStrength:.03,dispersion:0,anisotropy:0,anisotropyAngle:0,surfaceTexture:0,iridScale:1,iridShift:0,glow:0,grounding:.35};
export const MATERIAL_STYLES=[
 {name:'Bolla di sapone',values:{thinShell:1,thinFilm:1,iridescence:.9,refraction:1.333,hollow:1,wallThickness:.003,fullness:0,absorption:0,tintStrength:0,environmentRefraction:0,grounding:0}},
 {name:'Goccia',values:{refraction:1.333,roughness:0,dispersion:.035,absorption:.005,tintStrength:.015}},
 {name:'Biglia di vetro',values:{refraction:1.52,dispersion:.15,internalColor:'#d1edff',tintStrength:.06}},
 {name:'Sfera cava',values:{hollow:1,wallThickness:.12,fullness:.12,dispersion:.06}},
 {name:'Palloncino lucido',values:{thinShell:1,hollow:1,wallThickness:.025,fullness:.025,transparency:.38,roughness:.11,coat:.65,subsurface:.25,sssRadius:.65,tintStrength:.22,internalColor:'#ffd8e8'}},
 {name:'Palloncino metallizzato',values:{thinShell:1,hollow:1,wallThickness:.02,fullness:.02,metal:.94,transparency:.72,roughness:.065,coat:.3,iridescence:.2,tintStrength:.025}},
 {name:'Cristallo',values:{refraction:1.85,dispersion:.5,roughness:0,coat:.15,environmentRefraction:.06}},
 {name:'Ghiaccio',values:{refraction:1.31,transparency:.94,roughness:.23,scattering:.16,subsurface:.16,surfaceTexture:.13,tintStrength:.12,internalColor:'#c8efff'}},
 {name:'Gelatina',values:{refraction:1.36,transparency:.48,roughness:.09,coat:.45,subsurface:.72,scattering:.18,sssRadius:.8,sssColor:'#ffc4dd',internalColor:'#ffa4d2',tintStrength:.28}},
 {name:'Perla',values:{metal:.15,transparency:.025,roughness:.18,coat:.65,iridescence:.85,thinFilm:.6,filmThickness:330,subsurface:.28,sssColor:'#fff0dc',internalColor:'#fff3ed'}},
 {name:'Vetro opalescente',values:{transparency:.84,roughness:.2,iridescence:.35,thinFilm:.35,scattering:.25,subsurface:.25,sssRadius:.8,internalColor:'#e8dfff',tintStrength:.08}},
 {name:'Metallo liquido',values:{metal:1,transparency:0,roughness:.06,coat:.22,iridescence:.12}},
 {name:'Satinato',values:{metal:.88,transparency:0,roughness:.4,gloss:.8,anisotropy:.85,surfaceTexture:.2}},
 {name:'Ceramica',values:{transparency:0,roughness:.22,coat:.8}},
 {name:'Opaco',values:{transparency:0,roughness:1,gloss:0}},
 {name:'Olio iridescente',values:{metal:.35,transparency:.65,roughness:.04,coat:.6,thinFilm:.9,iridescence:1,filmThickness:620,dispersion:.08}},
 {name:'Carta in controluce',values:{thinShell:1,hollow:1,wallThickness:.03,fullness:.03,transparency:.06,roughness:.85,gloss:.08,translucency:.8,subsurface:.7,sssRadius:.7,sssColor:'#fff0d6',internalColor:'#fff0d6',scattering:.3,absorption:.04}},
 {name:'Pelle sottile',values:{thinShell:1,hollow:1,wallThickness:.075,fullness:.075,transparency:.1,roughness:.32,gloss:.85,coat:.15,subsurface:.8,sssRadius:.9,sssColor:'#ffc9aa',internalColor:'#e8ad8c',translucency:.6,scattering:.2,tintStrength:.14}},
 {name:'Silicone satinato',values:{transparency:0,roughness:.38,gloss:.65,coat:.12,subsurface:.5,sssRadius:.6,scattering:.12,sssColor:'#ff9da9',internalColor:'#ffa0bc',tintStrength:.14,grounding:0}}
].map(m=>({...m,values:{...clear,...m.values}}));
Object.assign(EXTRA_META,{fullness:['Spessore',0,1,.001],environmentAngle:['Rotazione ambiente',-180,180,1],environmentPower:['Intensità ambiente',0,3,.01],environmentRefraction:['Ambiente nelle rifrazioni',0,.5,.01],environmentCycles:['Giri nel loop',1,4,1],filmFlow:['Colori che colano',0,1,.01],filmSwirl:['Vortici della pellicola',0,1,.01],filmCycles:['Giri dei colori nel loop',1,4,1],grounding:['Ombra e caustica',0,1,.01]});

Object.assign(EXTRA_BASE,{...MODERN_BASE,renderVersion:1});
