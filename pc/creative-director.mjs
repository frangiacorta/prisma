import {prepareDirector} from '../director-request.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {findCodex,collect} from './creative-assistant.mjs';
import {DIRECTOR_SCHEMA,validateDirectorPlan} from '../director-model.js';

const root=path.dirname(fileURLToPath(import.meta.url));
export function createCreativeDirector({runner=collect,locate=findCodex,work=path.join(root,'local/prisma-director')}={}){
 let active=null;
 async function decide(body,{signal}={}){
  if(active)throw Error('La regia sta già osservando una scena.');
  const {decks,prompt,frames}=prepareDirector(body);
  const images=frames.map(s=>Buffer.from(s.split(',')[1],'base64'));
  const controller=new AbortController();active=controller;const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  const files=[],id=randomUUID();
  try{
   await mkdir(work,{recursive:true});const schema=path.join(work,id+'.json');files.push(schema);await writeFile(schema,JSON.stringify(DIRECTOR_SCHEMA));
   for(let i=0;i<images.length;i++){const f=path.join(work,id+'-'+i+'.jpg');files.push(f);await writeFile(f,images[i]);}
   const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--color','never','--json','--output-schema',schema,'-c','web_search="disabled"','-c','mcp_servers={}'];
   for(const feature of ['shell_tool','unified_exec','plugins','apps','multi_agent','multi_agent_v2','image_generation','view_image','browser_use','browser_use_external','in_app_browser','code_mode','code_mode_host'])args.push('-c',`features.${feature}=false`);
   for(const f of files.slice(1))args.push('--image',f);args.push('-');
   let final='',failed=false;const result=await runner(await locate(),args,{cwd:work,input:prompt,signal:controller.signal,timeout:150000,onEvent:event=>{if(event.type==='turn.failed'||event.type==='error')failed=true;if(event.type==='item.completed'&&event.item?.type==='agent_message')final=event.item.text;if(event.item&&['command_execution','file_change','mcp_tool_call','web_search'].includes(event.item.type)){const error=Error('La regia può usare soltanto i controlli di Prisma.');error.prismaToolError=true;throw error;}}});
   if(controller.signal.aborted)throw Error('Regia interrotta.');
   if(result.code!==0||failed||!final)throw Error(/usage|rate.limit|quota/i.test(result.err+result.out)?'Limite Codex raggiunto. La scena resta disponibile.':'Codex non ha completato la regia. Verifica il collegamento e riprova.');
   return validateDirectorPlan(JSON.parse(final),decks);
  }finally{active=null;signal?.removeEventListener('abort',cancel);await Promise.all(files.map(f=>unlink(f).catch(()=>{})));}
 }
 return {decide,close:()=>active?.abort()};
}
