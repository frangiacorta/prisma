import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startServer} from '../server.mjs';
import {launchBrowser} from './browser.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const {server,url}=await startServer(0);
let browser;
try{
  browser=await launchBrowser();
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url+'calibration.html');
  await page.waitForFunction(()=>window.calibrationStatus);
  const initial=await page.evaluate(()=>window.calibrationStatus);
  assert.equal(initial.passed,true,JSON.stringify(initial));
  assert.equal(initial.heightEstimated,false);
  assert.equal(initial.physicalWidthMm,1550);
  assert.equal(initial.physicalHeightMm,900);
  assert.equal(initial.eyeDistanceMm,2000);
  await page.setViewportSize({width:1024,height:768});
  await page.waitForFunction(()=>window.calibrationStatus.pixelWidth===1024);
  const resized=await page.evaluate(()=>window.calibrationStatus);
  assert.equal(resized.physicalWidthMm,1550);
  assert.equal(resized.physicalHeightMm,900);
  await page.setViewportSize({width:1280,height:720});
  await page.waitForFunction(()=>window.calibrationStatus.pixelWidth===1280);
  await page.locator('#grid').uncheck();
  await page.locator('#toggle').click();
  await mkdir(path.join(root,'reports'),{recursive:true});
  await page.screenshot({path:path.join(root,'reports/calibration-preview.png')});
  const before=await page.locator('#scene').screenshot();
  await page.locator('#toggle').click();
  await page.locator('#eyeX').fill('250');
  const after=await page.locator('#scene').screenshot();
  assert.notDeepEqual(before,after,'La scena deve cambiare con il punto di vista');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(root,'reports/calibration-chrome.png')});
  console.log(JSON.stringify({passed:true,initial,eyeShiftChangedImage:true,pageErrors:errors},null,2));
}finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
