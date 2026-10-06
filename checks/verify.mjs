import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {startServer} from '../server.mjs';
import {launchBrowser} from './browser.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(path.join(root,'reports'),{recursive:true});
const {server,url}=await startServer(0);
let browser;
const report={checkedAt:new Date().toISOString(),platform:process.platform,node:process.version,
  scope:'browser and tooling checks on this execution host; Wallpaper Engine and Windows installation not tested here',
  explicitCloudSoftwareFlags:process.env.PRISMA_CLOUD_SOFTWARE_GL==='1',checks:{},limitations:[]};
try {
  const manifest=JSON.parse(await readFile(path.join(root,'reference/manifest.json'),'utf8'));
  for(const item of manifest.files)assert.equal(createHash('sha256').update(await readFile(path.join(root,item.file))).digest('hex'),item.sha256);
  report.checks.referenceHashes=true;
  const response=await fetch(url);assert.equal(response.status,200);assert.match(await response.text(),/Prisma 4D/);
  assert.equal((await fetch(url+'%2e%2e%2fpackage.json')).status,403);report.checks.server=true;
  browser=await launchBrowser(process.argv.includes('--headed'));
  const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);await page.waitForFunction(()=>window.prismaProbeResult,{timeout:150000});
  const basic=await page.evaluate(()=>window.prismaProbeResult);assert.equal(basic.passed,true,JSON.stringify(basic));
  report.checks.webgl2=basic;
  await page.evaluate(()=>{window.wallpaperPropertyListener.applyUserProperties({probe_scale:{value:.75}});window.wallpaperPropertyListener.applyGeneralProperties({fps:30});});
  const prisma=await page.evaluate(()=>window.runProbe({prisma:true}));
  assert.equal(prisma.passed,true,JSON.stringify(prisma));assert.equal(prisma.prisma.passed,true);
  assert.equal(prisma.prisma.width,192);assert.equal(prisma.hostProperties.fps,30);
  report.checks.prisma=prisma;
  report.checks.wallpaperPropertyCallbacks='passed via simulated callbacks; actual Wallpaper Engine host untested';
  await page.screenshot({path:path.join(root,'reports/browser-check.png'),fullPage:true});
  try {
    await page.goto(pathToFileURL(path.join(root,'web/index.html')).href);
    await page.waitForFunction(()=>window.prismaProbeResult);
    const file=await page.evaluate(()=>window.prismaProbeResult);assert.equal(file.passed,true);report.checks.fileProtocol=true;
  } catch(error) {
    if (!error.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw error;
    report.checks.fileProtocol={status:'blocked',reason:'Browser administrator policy blocks file:// navigation; policy preserved'};
    report.limitations.push('Local-file opening must be tested on Windows and in Wallpaper Engine.');
  }
  const negative=await browser.newPage();
  await negative.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=function(){return null;};});
  await negative.goto(url);await negative.waitForFunction(()=>window.prismaProbeResult);
  const failed=await negative.evaluate(()=>window.prismaProbeResult);
  assert.equal(failed.passed,false);assert.match(failed.errors.join(' '),/WebGL2 non disponibile/);
  report.checks.webgl2FailureReported=true;await negative.close();
  assert.deepEqual(errors,[]);report.pageErrors=errors;report.coreChecksPassed=true;
  report.passed=report.limitations.length===0;if(!report.passed)process.exitCode=2;
} catch(error) {report.passed=false;report.error=error.stack;process.exitCode=1;}
finally {
  await browser?.close();await new Promise(resolve=>server.close(resolve));
  await writeFile(path.join(root,'reports/browser-check.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
