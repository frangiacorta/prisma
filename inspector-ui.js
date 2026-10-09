import {controlHelp} from './control-help.js?v=285a9866eee5';
const STORE='prisma-interface-v1';
let preferences={};try{preferences=JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch{}
const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(preferences));}catch{}};
const slug=text=>text.toLowerCase().split('·')[0].trim().replace(/\d+/g,'#');
let tip,owner,pinned=false,serial=0;
function hideTip(){if(tip)tip.hidden=true;owner=null;pinned=false;}
function showTip(button,pin=false){
 if(!tip){tip=document.createElement('div');tip.id='parameter-tooltip';tip.className='parameter-tooltip';tip.setAttribute('role','tooltip');document.body.append(tip);}
 owner=button;pinned=pin;tip.replaceChildren();const title=document.createElement('strong');title.textContent=button.dataset.helpLabel;const body=document.createElement('span');body.textContent=button.dataset.helpText;tip.append(title,body);tip.hidden=false;
 const r=button.getBoundingClientRect(),box=tip.getBoundingClientRect();
 tip.style.left=Math.max(10,Math.min(innerWidth-box.width-10,r.right-box.width))+'px';
 tip.style.top=Math.max(10,r.bottom+box.height+16>innerHeight?r.top-box.height-8:r.bottom+8)+'px';
}
document.addEventListener('pointerover',e=>{const b=e.target.closest('[data-help-text]');if(b&&!pinned&&e.pointerType!=='touch')showTip(b);});
document.addEventListener('pointerout',e=>{if(!pinned&&e.target.closest('[data-help-text]')&&!e.relatedTarget?.closest?.('[data-help-text]'))hideTip();});
document.addEventListener('focusin',e=>{const b=e.target.closest('[data-help-text]');if(b)showTip(b);else hideTip();});
document.addEventListener('click',e=>{const b=e.target.closest('[data-help-text]');if(b){e.preventDefault();if(pinned&&owner===b)hideTip();else showTip(b,true);}else hideTip();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&owner){e.preventDefault();e.stopImmediatePropagation();hideTip();}});
window.addEventListener('resize',hideTip);document.addEventListener('scroll',hideTip,true);
function keyFor(el){const d=el.dataset;return (d.bodyParam?'body.'+d.bodyParam:null)||(d.bodyCheck?'body.'+d.bodyCheck:null)||(d.bodySelect?'body.'+d.bodySelect:null)||d.param||d.path||d.color||d.check||d.pathColor||d.pathCheck||d.pathSelect||d.particleSelect||(d.palette!==undefined?'palette.'+d.palette:null)||(d.forceParam?'force.'+d.forceParam:null)||(d.forceEnabled!==undefined?'force.enabled':null)||(d.guideParam?'guide.'+d.guideParam:null)||(d.guideFlag?'guide.'+d.guideFlag:null)||(d.guideSelect?'guide.'+d.guideSelect:null)||el.id;}
function addHelp(root){
 for(const el of root.querySelectorAll('input:not(.number):not(.hex-input),select')){
  const key=keyFor(el),text=controlHelp(key||'');if(!text)continue;
  const host=el.closest('.param,.field,.color-field,.check,.palette-item');if(!host||host.querySelector('[data-help-text]'))continue;
  const label=host.querySelector('label')?.textContent.trim()||el.getAttribute('aria-label')||[...host.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim()||key;
  const button=document.createElement('button');button.type='button';button.className='parameter-info';button.textContent='i';button.dataset.helpText=text;button.dataset.helpLabel=label;button.dataset.helpKey=key;button.setAttribute('aria-label','Informazioni: '+label);
  const desc=document.createElement('span');desc.id='parameter-help-'+(++serial);desc.className='sr-only';desc.textContent=text;button.setAttribute('aria-describedby',desc.id);
  for(const input of host.querySelectorAll('input,select'))input.setAttribute('aria-describedby',desc.id);
  const line=host.querySelector('.param-line');if(line){line.insertBefore(button,line.querySelector('input'));host.append(desc);}
  else{const wrap=document.createElement('div');wrap.className='control-with-help';host.before(wrap);wrap.append(host,button,desc);}
 }
}
export function prepareInspector(root,scope){
 hideTip();
 // Legacy scene tools use sections; keep their IDs and delegate handlers intact.
 for(const section of root.querySelectorAll('section.control-section')){const d=document.createElement('details');d.className='control-details';d.id=section.id;const heading=section.querySelector(':scope > h2'),summary=document.createElement('summary');summary.textContent=heading?.textContent||'';heading?.remove();d.append(summary,...section.childNodes);section.replaceWith(d);}
 const nodes=[...root.querySelectorAll('details')];
 for(const [index,d] of nodes.entries()){
  const parent=d.parentElement.closest('details'),id=d.id||slug(d.querySelector(':scope > summary')?.textContent||'');
  const key=scope+'/'+(parent?.dataset.disclosurePath||'')+'/'+id;d.dataset.disclosurePath=(parent?.dataset.disclosurePath||'')+'/'+id;
  d.open=Object.hasOwn(preferences,key)?preferences[key]:index===0;
  d.addEventListener('toggle',()=>{if(!d.isConnected)return;preferences[key]=d.open;save();});
 }
 addHelp(root);
}
export function mountStudioLayout(){
 const button=document.querySelector('#expand-preview');
 let expanded=false,scroll=0;
 const expand=value=>{if(value===expanded)return;expanded=value;if(value)scroll=window.scrollY;document.body.classList.toggle('preview-expanded',value);button.setAttribute('aria-pressed',String(value));button.querySelector('.expand-label').textContent=value?'Torna ai controlli':'Amplia anteprima';button.title=value?'Torna ai controlli (Esc)':'Amplia anteprima';for(const el of document.querySelectorAll('.preset-rail,.inspector,.topbar,.description-bar,.random-bar'))el.inert=value;if(!value){window.scrollTo(0,scroll);button.focus();}hideTip();};
 button.addEventListener('click',()=>expand(!expanded));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded&&!document.querySelector('dialog[open]')){e.preventDefault();expand(false);}});
 for(const id of ['assistant-section','examples-section']){const d=document.getElementById(id);if(!d)continue;const key='layout/'+id;d.open=preferences[key]??false;d.addEventListener('toggle',()=>{preferences[key]=d.open;save();document.body.classList.toggle('examples-open',document.getElementById('examples-section').open);});}
 document.body.classList.toggle('examples-open',document.getElementById('examples-section').open);
 return {expand};
}
