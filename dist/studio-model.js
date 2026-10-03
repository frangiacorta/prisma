export const MAX_COLORS=12,MAX_LIGHTS=8;
export const LIGHT_TYPES=[['circle','Circolare'],['bar','Barra'],['spot','Faro'],['diffuser','Diffusore'],['grid','Griglia'],['ring','Anello luminoso']];
export const LIGHT_META={x:['X · destra / sinistra',-5,5,.01],y:['Y · alto / basso',-5,5,.01],z:['Z · davanti / dietro',-5,5,.01],power:['Intensità',0,6,.01],size:['Larghezza sorgente',.05,3,.01],length:['Altezza sorgente',.05,3,.01],roll:['Rotazione sorgente',-180,180,1],softness:['Diffusione',.01,1,.01],cone:['Apertura faro',5,85,1],grid:['Divisioni griglia',2,12,1]};
export function track(amplitude=1,enabled=false,mode='wave'){return{enabled,amplitude,cycles:1,phase:0,direction:1,curve:'sine',mode}}
export const TRACK_META={
 rotateY:['Rotazione orizzontale',0,360,1],rotateX:['Rotazione verticale',0,180,1],rotateZ:['Rotazione sul piano',0,360,1],volume:['Volume',0,.6,.01],deform:['Deformazione',0,.4,.01],twist:['Torsione',0,2,.01],waves:['Increspature',0,.3,.01],hole:['Apertura del vuoto',0,.6,.01],cut:['Ritaglio',0,.8,.01],scale:['Dimensione',0,.7,.01],positionX:['Posizione orizzontale',0,1.2,.01],positionY:['Posizione verticale',0,1.2,.01],gradientOffset:['Scorrimento colori',0,1,.01],iridescence:['Iridescenza',0,.7,.01],roughness:['Rugosità',0,.6,.01],transparency:['Trasparenza',0,.7,.01]
};
export const EXTRA_BASE={
 roundness:0,taper:0,bendX:0,bendY:0,lobeAmount:0,lobes:5,pinch:0,rimRound:0,holeAspect:1,cutAspect:1,rotateZ:0,
 coat:0,coatRoughness:.1,fresnel:1,iridShift:0,iridScale:1,dispersion:0,absorption:.15,tintStrength:.15,anisotropy:0,anisotropyAngle:0,surfaceTexture:0,
 exposure:0,brightness:0,contrast:1,saturation:1,temperature:0,photoTint:0,gamma:1,blacks:0,highlights:0,vignette:0,lensDistortion:0,grainSize:1,photoAll:false,
 motions:Object.fromEntries(Object.keys(TRACK_META).map(k=>[k,track(k==='rotateY'?360:k==='volume'?.12:k==='deform'?.048:k==='twist'?.4:k.startsWith('rotate')?30:.2,k==='volume'||k==='deform',k==='rotateY'||k==='gradientOffset'?'cycle':'wave')]))
};
export function newLight(id=1){return{id,enabled:true,type:'circle',color:'#e0eaff',x:-1.4,y:1.8,z:2.5,power:1.8,size:.9,length:.6,roll:0,softness:.3,cone:30,grid:5,orbit:{...track(35),axis:'y'},pulse:track(.3)}}
export function legacyLights(s){const build=(id,p)=>{const angle=s[p+'Angle']*Math.PI/180,height=s[p+'Height']*Math.PI/180;return{...newLight(id),type:'bar',x:3.2*Math.sin(angle)*Math.cos(height),y:3.2*Math.sin(height),z:3.2*Math.cos(angle)*Math.cos(height),color:s[p+'Color'],power:s[p+'Power'],size:1.7,length:s[p+'Size']*.6,softness:s[p+'Size'],enabled:id===1||s.light2}};return[build(1,'light'),build(2,'light2')]}
export const EXTRA_META={
 roundness:['Sfera / cubo morbido',0,1,.01],taper:['Affusolamento',-.8,.8,.01],bendX:['Curvatura orizzontale',-.7,.7,.01],bendY:['Curvatura verticale',-.7,.7,.01],lobeAmount:['Petali e lobi',0,.4,.01],lobes:['Numero di lobi',2,12,1],pinch:['Strozzatura centrale',0,.65,.01],rimRound:['Raccordo dei ritagli',0,.15,.005],holeAspect:['Proporzioni del vuoto',.3,2.5,.01],cutAspect:['Proporzioni del ritaglio',.3,2.5,.01],rotateZ:['Rotazione sul piano',-180,180,1],
 coat:['Vernice trasparente',0,1,.01],coatRoughness:['Rugosità della vernice',0,1,.01],fresnel:['Riflessi sui bordi',0,2,.01],iridShift:['Tinta iridescente',0,1,.01],iridScale:['Ampiezza iridescenza',.1,4,.01],dispersion:['Dispersione cromatica',0,1,.01],absorption:['Assorbimento',0,2,.01],tintStrength:['Tinta interna',0,1,.01],anisotropy:['Riflessi allungati',0,1,.01],anisotropyAngle:['Direzione della satinatura',-180,180,1],surfaceTexture:['Microtexture',0,1,.01],
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
export const MATERIAL_STYLES=[
 {name:'Acqua',values:{metal:0,transparency:.96,refraction:1.33,roughness:.03,gloss:1,coat:0,iridescence:.1,dispersion:.08,absorption:.02,tintStrength:.05}},
 {name:'Vetro',values:{metal:0,transparency:.86,refraction:1.5,roughness:.07,gloss:1,coat:.2,dispersion:.3,absorption:.2,tintStrength:.18}},
 {name:'Cromo',values:{metal:1,transparency:0,roughness:.04,gloss:1,coat:.3,anisotropy:0,iridescence:.12}},
 {name:'Satinato',values:{metal:.88,transparency:0,roughness:.4,gloss:.7,anisotropy:.85,coat:0,surfaceTexture:.2}},
 {name:'Perla',values:{metal:.2,transparency:.15,roughness:.25,gloss:.75,iridescence:.9,iridScale:2,coat:.45}},
 {name:'Ceramica',values:{metal:0,transparency:0,roughness:.2,gloss:.6,iridescence:0,coat:.9,coatRoughness:.08}},
 {name:'Opaco',values:{metal:0,transparency:0,roughness:1,gloss:0,iridescence:0,coat:0,anisotropy:0}},
 {name:'Olio',values:{metal:.48,transparency:.25,roughness:.05,gloss:1,iridescence:1,iridScale:3.2,coat:.75,dispersion:.6}}
];
