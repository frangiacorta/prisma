import {spawn} from 'node:child_process';
import {copyFile, mkdir, mkdtemp, readFile, stat, unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const root=path.dirname(fileURLToPath(import.meta.url));
const portable=path.join(root,'local','mandelbulber','2.34.1','Mandelbulber2','mandelbulber2.exe');
const {values,positionals}=parseArgs({allowPositionals:true,options:{
 'keyframes':{type:'boolean'},'start':{type:'string',default:'0'},'end':{type:'string'},
 'frames-per-key':{type:'string'},'size':{type:'string',default:'640x360'},
}});
if(positionals.length!==1||!positionals[0].toLowerCase().endsWith('.fract')){
 console.error('Uso: node mandelbulber-render.mjs preset.fract [--size 640x360] [--keyframes --start 0 --end 120 --frames-per-key 24]');
 process.exit(1);
}
const input=path.resolve(positionals[0]),preset=await readFile(input,'utf8');
const dimensions=/^(\d{2,4})x(\d{2,4})$/.exec(values.size);
if(!dimensions||dimensions.slice(1).some(n=>Number(n)<64||Number(n)>4096))throw Error('Risoluzione fuori intervallo: 64–4096 pixel per lato.');
if(!/^\uFEFF?# Mandelbulber settings file/.test(preset))throw Error('Il file non è un preset Mandelbulber.');
if(values.keyframes&&!/^\[keyframes\]/m.test(preset))throw Error('Il preset non contiene keyframe.');
const start=Number(values.start),end=Number(values.end),perKey=Number(values['frames-per-key']);
if(values.keyframes&&(!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(end)||end<=start))throw Error('Indica un intervallo valido con --start e --end.');
if(values['frames-per-key']!==undefined&&(!Number.isSafeInteger(perKey)||perKey<4))throw Error('Imposta almeno quattro fotogrammi per keyframe.');
if(!(await stat(portable).catch(()=>null))?.isFile())throw Error('Manca il pacchetto portatile di Mandelbulber nel progetto.');

const output=path.join(root,'exports','mandelbulber');
await mkdir(output,{recursive:true});
const job=await mkdtemp(path.join(output,'render-'));
const outputPath=values.keyframes?job+path.sep:path.join(job,'immagine.png');
const archived=path.join(job,'progetto.fract');
await copyFile(input,archived);
console.log('Render in corso in '+job);
async function run(destination,first,last){
 const args=['--nogui','--never-delete','--format','png','--res',values.size,'--logfilepath',path.join(job,'mandelbulber.log'),'--output',destination];
 if(values.keyframes){
  args.push('--keyframe','--start',String(first),'--end',String(last));
  if(values['frames-per-key']!==undefined)args.push('--fpk',String(perKey));
 }
 const child=spawn(portable,[...args,input],{stdio:'inherit',cwd:path.dirname(portable),windowsHide:true});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 if(code!==0)throw Error('Mandelbulber ha interrotto il rendering.');
}
const filename=n=>'frame_'+String(n).padStart(7,'0')+'.png';
async function completePng(file){
 const bytes=await readFile(file).catch(()=>null);
 return bytes?.subarray(0,8).toString('hex')==='89504e470d0a1a0a'&&bytes.subarray(-12).toString('hex')==='0000000049454e44ae426082';
}
await run(outputPath,start,end);
const frames=values.keyframes?Array.from({length:end-start},(_,i)=>path.join(job,filename(start+i))):[outputPath];
if(values.keyframes&&!await completePng(frames.at(-1))){
 // Some builds exit before the last PNG encoder flushes. Render one extra frame
 // in a separate directory, then keep only the completed frame we asked for.
 const retry=await mkdtemp(path.join(job,'ultimo-'));
 await run(retry+path.sep,end-1,end+1);
 const recovered=path.join(retry,filename(end-1));
 if(await completePng(recovered)){
  await copyFile(recovered,frames.at(-1));
  for(const name of [filename(end-1),filename(end)]){
   const file=path.join(retry,name);if((await stat(file).catch(()=>null))?.isFile())await unlink(file);
  }
 }
}
for(const frame of frames){
 if(!await completePng(frame))throw Error('PNG incompleto: '+path.basename(frame));
}
console.log(`${frames.length} PNG · ${job}`);
