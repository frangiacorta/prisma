import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startServer} from '../server.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=JSON.parse(await readFile(path.join(root,'node_modules/@playwright/mcp/package.json'),'utf8'));
const bin=typeof pkg.bin==='string'?pkg.bin:Object.values(pkg.bin)[0];
const args=[path.join(root,'node_modules/@playwright/mcp',bin),'--headless',
  '--user-data-dir',path.join(root,'profiles/mcp-check'),
  '--output-dir',path.join(root,'reports/mcp')];
if(process.env.PRISMA_BROWSER_EXECUTABLE)args.push('--executable-path',process.env.PRISMA_BROWSER_EXECUTABLE);
else args.push('--browser',process.env.PRISMA_MCP_BROWSER||'chrome');
// The managed Linux container has no usable Chromium SUID helper. Keep this
// opt-in exception out of the Windows setup; the outer container remains active.
if(process.platform==='linux' && process.env.PRISMA_CLOUD_SOFTWARE_GL==='1')args.push('--no-sandbox');
const child=spawn(process.execPath,args,{cwd:root,env:{...process.env,
  ...(process.platform==='linux'?{XDG_CACHE_HOME:path.join(root,'profiles/cache')}:{}),
  PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH||path.join(root,'profiles/browser-cache')},
  stdio:['pipe','pipe','pipe']}),pending=new Map();
let id=0,stderr='';child.stderr.on('data',chunk=>{stderr=(stderr+chunk.toString()).slice(-5000);});
createInterface({input:child.stdout}).on('line',line=>{
  try {const message=JSON.parse(line),item=pending.get(message.id);if(item){clearTimeout(item.timer);pending.delete(message.id);message.error?item.reject(new Error(JSON.stringify(message.error))):item.resolve(message.result);}} catch{}
});
child.on('exit',code=>{for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error(`MCP exited ${code}: ${stderr}`));}pending.clear();});
function call(method,params={}) {
  const requestId=++id;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error(`Timeout: ${method}`));},60000);
    pending.set(requestId,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:requestId,method,params})+'\n');
  });
}
const report={scope:'MCP and controlled browser on this host; no Windows or authenticated website access implied',version:pkg.version};
let server;
try {
  const init=await call('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'prisma-tooling-check',version:'0.1.0'}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const listed=await call('tools/list'),names=listed.tools.map(t=>t.name);
  assert(names.includes('browser_navigate'));assert(names.includes('browser_evaluate'));
  report.serverInfo=init.serverInfo;report.toolCount=names.length;
  const started=await startServer(0);server=started.server;
  const navigation=await call('tools/call',{name:'browser_navigate',arguments:{url:started.url}});
  assert(!navigation.isError,JSON.stringify(navigation));
  const evaluated=await call('tools/call',{name:'browser_evaluate',arguments:{function:'() => ({title:document.title, hasProbe:typeof window.runProbe === "function"})'}});
  assert(!evaluated.isError,JSON.stringify(evaluated));
  const text=JSON.stringify(evaluated);assert.match(text,/Prisma 4D/);assert.match(text,/hasProbe/);
  report.navigationAndEvaluation=true;report.passed=true;
  await call('tools/call',{name:'browser_close',arguments:{}});
} catch(error){report.passed=false;report.error=error.message;process.exitCode=1;}
finally {
  child.stdin.end();child.kill();if(server)await new Promise(resolve=>server.close(resolve));
  await mkdir(path.join(root,'reports'),{recursive:true});await writeFile(path.join(root,'reports/mcp-check.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
