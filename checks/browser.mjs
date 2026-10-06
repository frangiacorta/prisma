import {chromium} from 'playwright';
export async function launchBrowser(headed=false) {
  const common={headless:!headed};
  if (process.env.PRISMA_CLOUD_SOFTWARE_GL==='1') common.args=['--use-angle=gl-egl','--ignore-gpu-blocklist','--disable-gpu-sandbox'];
  if (process.env.PRISMA_BROWSER_EXECUTABLE) return chromium.launch({...common,executablePath:process.env.PRISMA_BROWSER_EXECUTABLE});
  const errors=[];
  for (const channel of ['chrome','msedge']) {
    try {return await chromium.launch({...common,channel});} catch(e){errors.push(`${channel}: ${e.message.split('\n')[0]}`);}
  }
  throw new Error(`Non trovo Chrome o Edge avviabile. ${errors.join('; ')}. Usa PRISMA_BROWSER_EXECUTABLE solo per indicare un browser già installato.`);
}
