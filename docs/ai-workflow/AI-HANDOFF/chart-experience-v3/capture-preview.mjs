/** Capture the static design study only. No application/server/auth profile or external traffic. */
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const docRoot = dirname(fileURLToPath(import.meta.url));
const dependencyRoot = process.argv[2];
const outputRoot = process.argv[3];
if (!dependencyRoot || !outputRoot) throw new Error('Usage: node capture-preview.mjs FRONTEND_PATH OUTPUT_PATH');
const require = createRequire(join(resolve(dependencyRoot), 'package.json'));
const { chromium } = require('@playwright/test');
mkdirSync(resolve(outputRoot), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results=[];
try {
  const context = await browser.newContext({ reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await context.route('**/*', route => {
    const protocol = new URL(route.request().url()).protocol;
    return ['file:', 'data:'].includes(protocol) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  for(const [width,height] of [[320,900],[414,1000],[1440,1080],[2560,1440],[3840,2160]]) {
    await page.setViewportSize({width,height});
    await page.goto(pathToFileURL(join(docRoot,'preview.html')).href);
    await page.locator('#rhythm rect.bar').first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    const measures=await page.evaluate(()=>({
      viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth,
      bars:document.querySelectorAll('#rhythm rect.bar,#rhythm rect.bar-muted,#rhythm rect.bar-current').length,
      svgWidth:document.querySelector('#rhythm').getBoundingClientRect().width,
      primary:document.querySelector('.card-actions .primary').getBoundingClientRect().height,
    }));
    if(measures.scrollWidth>width || measures.bars!==12 || measures.primary<44) throw new Error(JSON.stringify(measures));
    const file=`sapphire-ledger-${width}.png`;
    await page.screenshot({path:resolve(outputRoot,file),fullPage:width===414});
    results.push({width,height,...measures,file});
  }
  if(errors.length) throw new Error(errors.join('\n'));
  const receipt={scope:'static synthetic design study only',results,pageErrors:errors};
  writeFileSync(resolve(outputRoot,'preview-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt));
} finally { await browser.close(); }
