import {prismaRanges,materialPresets,motionTargets,newMotion,newLight} from './prisma-controls.js';

export function createPrismaPanel(getState,changed,say){
  const $=id=>document.getElementById(id),p=()=>getState().prisma;
  let selectedLight=0,swatchCount=-1,lightCount=-1;
  const percent=v=>Math.round(v*100)+'%',decimal=v=>v.toFixed(2),degrees=v=>Math.round(v)+'°';
  const fields=[
    ['shape','volume','Volume',.01,decimal],
    ['deform','stretchX','Larghezza',.01,decimal],['deform','stretchY','Altezza',.01,decimal],['deform','stretchZ','Profondità',.01,decimal],
    ['deform','deform','Deformazione',.01,percent],['deform','twist','Torsione',.01,decimal],['deform','waves','Onde',.01,decimal],['deform','waveScale','Frequenza onde',.1,decimal],
    ['frame','scale','Scala forma',.01,decimal],['frame','positionX','Posizione X',.01,decimal],['frame','positionY','Posizione Y',.01,decimal],['frame','rotateX','Rotazione forma X',1,degrees],['frame','rotateY','Rotazione forma Y',1,degrees],['frame','rotateZ','Rotazione forma Z',1,degrees],
    ['matter','metal','Metallo',.01,percent],['matter','roughness','Rugosità',.01,percent],['matter','emission','Emissione',.01,decimal],
    ['finish','gloss','Lucidità',.01,percent],['finish','iridescence','Iridescenza',.01,percent],['finish','transparency','Trasparenza particelle',.01,percent],['finish','lighting','Risposta alla luce',.01,percent],
    ['points','pointSize','Dimensione punti',.05,decimal],
    ['gradient','gradientAngle','Angolo gradiente',1,degrees],['gradient','gradientScale','Scala gradiente',.01,decimal],['gradient','gradientOffset','Scorrimento colore',.01,percent],
    ['photo','exposure','Esposizione EV',.05,decimal],['photo','brightness','Luminosità',.01,decimal],['photo','contrast','Contrasto',.01,decimal],['photo','saturation','Saturazione',.01,decimal],
    ['environment','environmentPower','Intensità riflessi',.01,decimal],['environment','environmentAngle','Rotazione ambiente',1,degrees],
    ['motion','motion','Intensità oscillazioni',.01,percent],
  ];
  function slider(parent,id,label,min,max,step,onInput){
    const div=document.createElement('div');div.className='control';
    div.innerHTML=`<label for="${id}">${label}<output id="value-${id}"></output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}">`;
    $(parent).append(div);$(id).addEventListener('input',e=>onInput(Number(e.target.value)));
  }
  function lightResponse(){if(p().lighting===0)p().lighting=1;}
  for(const [group,key,label,step]of fields){
    slider('prisma-'+group,'shared-'+key,label,...prismaRanges[key],step,value=>{
      p()[key]=value;
      if(['metal','roughness','gloss','iridescence','environmentPower','environmentAngle'].includes(key))lightResponse();
      if(key.startsWith('gradient'))p().usePalette=true;
      changed();
    });
  }
  $('material').onchange=e=>{
    const preset=materialPresets[e.target.value];if(!preset)return;
    for(const [key,value]of Object.entries(preset))if(key!=='name')p()[key]=value;
    changed();
  };
  $('use-palette').onchange=e=>{p().usePalette=e.target.checked;changed();};
  $('add-color').onclick=()=>{if(p().palette.length<12){p().palette.push('#ffffff');p().usePalette=true;changed();}};
  $('remove-color').onclick=()=>{if(p().palette.length>1){p().palette.pop();changed();}};
  $('background-mode').onchange=e=>{p().bgMode=e.target.value;changed();};
  for(const [id,key]of [['background-color','background'],['background-color-2','background2']])$(id).oninput=e=>{p()[key]=e.target.value;if(p().bgMode==='original')p().bgMode='solid';changed();};
  $('environment').onchange=e=>{p().environment=e.target.value;if(!p().environmentPower)p().environmentPower=.7;lightResponse();changed();};
  const lightFields=[['light','power','Potenza luce',0,12,.05],['light','size','Morbidezza luce',.01,5,.01],['light-position','x','Luce X',-12,12,.05],['light-position','y','Luce Y',-12,12,.05],['light-position','z','Luce Z',-12,12,.05]];
  for(const [group,key,label,min,max,step]of lightFields)slider('prisma-'+group,'source-'+key,label,min,max,step,value=>{const l=p().lights[selectedLight];if(l){l[key]=value;lightResponse();changed();}});
  $('light-source').onchange=e=>{selectedLight=Number(e.target.value);sync();};
  $('add-light').onclick=()=>{if(p().lights.length>=8)return;p().lights.push(newLight(p().lights.length));selectedLight=p().lights.length-1;lightResponse();changed();};
  $('remove-light').onclick=()=>{p().lights.splice(selectedLight,1);selectedLight=Math.max(0,selectedLight-1);changed();};
  $('light-enabled').onchange=e=>{p().lights[selectedLight].enabled=e.target.checked;lightResponse();changed();};
  $('light-color').oninput=e=>{p().lights[selectedLight].color=e.target.value;lightResponse();changed();};
  for(const [id,key]of [['light-orbit','orbit'],['light-pulse','pulse']])$(id).onchange=e=>{p().lights[selectedLight][key].enabled=e.target.checked;lightResponse();changed();};
  for(const [key,name]of Object.entries(motionTargets))$('motion-target').add(new Option(name,key));
  const track=()=>p().motions[$('motion-target').value]??{...newMotion(),amplitude:$('motion-target').value.startsWith('rotate')?30:.2};
  function updateTrack(key,value){const target=$('motion-target').value;p().motions[target]={...track(),[key]:value};if(target==='gradientOffset')p().usePalette=true;if(['iridescence','roughness'].includes(target))lightResponse();changed();}
  $('motion-target').onchange=()=>sync();
  $('motion-enabled').onchange=e=>updateTrack('enabled',e.target.checked);
  $('motion-amplitude').oninput=e=>updateTrack('amplitude',Number(e.target.value));
  $('parameter-cycles').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>12){say('Scegli da 1 a 12 cicli interi.');sync();return;}updateTrack('cycles',n);};
  $('motion-curve').onchange=e=>updateTrack('curve',e.target.value);
  $('motion-mode').onchange=e=>updateTrack('mode',e.target.value);
  $('motion-phase').oninput=e=>updateTrack('phase',Number(e.target.value));
  $('motion-direction').onchange=e=>updateTrack('direction',Number(e.target.value));
  function sync(){
    const s=p();
    for(const [,key,,,format]of fields){$('shared-'+key).value=s[key];$('value-shared-'+key).textContent=format(s[key]);}
    $('material').value=Object.entries(materialPresets).find(([,preset])=>Object.entries(preset).every(([key,value])=>key==='name'||s[key]===value))?.[0]??'custom';
    $('use-palette').checked=s.usePalette;
    if(swatchCount!==s.palette.length){
      $('palette-colors').replaceChildren();swatchCount=s.palette.length;
      s.palette.forEach((_,i)=>{const input=document.createElement('input');input.type='color';input.id='palette-color-'+i;input.setAttribute('aria-label','Colore palette '+(i+1));input.oninput=e=>{p().palette[i]=e.target.value;p().usePalette=true;changed();};$('palette-colors').append(input);});
    }
    s.palette.forEach((hex,i)=>$('palette-color-'+i).value=hex);
    $('add-color').disabled=s.palette.length>=12;$('remove-color').disabled=s.palette.length<=1;
    $('background-mode').value=s.bgMode;$('background-color').value=s.background;$('background-color-2').value=s.background2;$('environment').value=s.environment;
    if(lightCount!==s.lights.length){lightCount=s.lights.length;$('light-source').replaceChildren();s.lights.forEach((_,i)=>$('light-source').add(new Option('Luce '+(i+1),i)));}
    selectedLight=Math.min(selectedLight,Math.max(0,s.lights.length-1));$('light-source').value=selectedLight;
    $('light-editor').hidden=!s.lights.length;$('add-light').disabled=s.lights.length>=8;$('remove-light').disabled=!s.lights.length;
    const l=s.lights[selectedLight];if(l){
      $('light-enabled').checked=l.enabled;$('light-color').value=l.color;$('light-orbit').checked=l.orbit.enabled;$('light-pulse').checked=l.pulse.enabled;
      for(const [,key]of lightFields){$('source-'+key).value=l[key];$('value-source-'+key).textContent=l[key].toFixed(2);}
    }
    const target=$('motion-target').value,t=track();
    $('motion-enabled').checked=t.enabled;$('motion-amplitude').max=target.startsWith('rotate')?Math.max(180,t.amplitude):Math.max(prismaRanges[target][1]-prismaRanges[target][0],t.amplitude);
    $('motion-amplitude').step=target.startsWith('rotate')?1:.01;$('motion-amplitude').value=t.amplitude;$('value-motion-amplitude').textContent=t.amplitude.toFixed(2);
    $('parameter-cycles').value=t.cycles;$('motion-curve').value=t.curve;$('motion-mode').value=t.mode;$('motion-phase').value=t.phase;$('value-motion-phase').textContent=t.phase+'°';$('motion-direction').value=t.direction;
    $('motion-mode').hidden=!(target.startsWith('rotate')||target==='gradientOffset');
    $('motion-mode').previousElementSibling.hidden=$('motion-mode').hidden;
    const continuous=!$('motion-mode').hidden&&t.mode==='cycle';
    $('motion-amplitude').parentElement.hidden=continuous;$('motion-curve').parentElement.hidden=continuous;
    const active=Object.entries(s.motions).filter(([,m])=>m.enabled).map(([key])=>motionTargets[key]);
    $('animated-parameters').textContent=active.length?'Animati: '+active.join(', '):'Scegli un parametro e attiva la sua animazione.';
    $('bridge-status').textContent=s.sourceName?'Stile da Prisma: '+s.sourceName:'';
  }
  return {sync};
}
