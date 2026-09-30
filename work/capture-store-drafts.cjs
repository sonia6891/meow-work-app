const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'store-assets', 'drafts');
fs.mkdirSync(out, { recursive: true });
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const bridge = `window.__storeDraft={seed:(tab)=>{state=defaultState();state.theme='light';state.profile={...state.profile,name:'輪班喵'};state.schedule={preset:'2-2',shiftName:'A班',workDays:2,offDays:2,startDate:'2026-09-01'};state.settings={...state.settings,baseSalary:36000,shiftAllowancePerDay:180,mealAllowance:1200,performanceAllowance:2500,transportAllowance:800,payday:5,defaultOvertimeHours:8,overtimeRateMode:'legal'};state.months['2026-09']={overtimeHours:8,dedLabor:1120,dedHealth:760,dedWelfare:180,dedPension:2160,dedTax:300,dedAttendance:0};state.personalEvents={e1:{id:'e1',kind:'event',title:'牙醫預約',date:'2026-10-02',start:'10:30',end:'11:30',reminder:'1d'},t1:{id:'t1',kind:'todo',title:'繳電費',date:'2026-10-01',time:'09:00',reminder:'1d',completed:false},t2:{id:'t2',kind:'todo',title:'採買日用品',date:'2026-10-03',time:'18:00',reminder:'none',completed:true}};setTab(tab);},tabs:()=>[...document.querySelectorAll('.bottom-nav [data-tab]')].map(x=>x.dataset.tab)};`;
const at = html.lastIndexOf('})();');
if (at < 0) throw new Error('App closure not found');
html = html.slice(0, at) + bridge + '\n' + html.slice(at);
const mockSupabase = `export function createClient(){return {auth:{getSession:async()=>({data:{session:{user:{id:'store-draft-user',app_metadata:{provider:'google'}}}},error:null}),onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}},signInWithOAuth:async()=>({data:{url:'#'},error:null}),signOut:async()=>({error:null})},rpc:async()=>({data:{server_now:new Date().toISOString(),entitlement:null},error:null}),from(){const q={select(){return q},eq(){return q},order(){return q},limit:async()=>({data:[],error:null}),maybeSingle:async()=>({data:null,error:null}),upsert:async()=>({error:null})};return q},channel(){return{on(){return this},subscribe(){return this}}},removeChannel:async()=>{}}}`;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/' || url.pathname === '/index.html') { res.writeHead(200, {'content-type':'text/html; charset=utf-8'}); res.end(html); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  res.writeHead(200, {'content-type':file.endsWith('.js')?'application/javascript':'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const context=await browser.newContext({viewport:{width:440,height:956},deviceScaleFactor:3,colorScheme:'light',serviceWorkers:'block'});
    await context.addInitScript(()=>{window.MeowReminder={getPermissionStatus:async()=>({granted:true,status:'authorized'}),requestPermission:async()=>({granted:true,status:'authorized'}),schedule:async()=>({scheduled:true}),cancel:async()=>({cancelled:true})};});
    await context.route('**/*',route=>{const u=route.request().url();if(u.startsWith(base))return route.continue();if(u.includes('esm.sh/'))return route.fulfill({status:200,contentType:'application/javascript',body:mockSupabase});if(u.includes('billing-config'))return route.fulfill({status:200,contentType:'application/json',body:'{"configured":true,"provider":"app_store_play","store_managed":true,"monthly":99,"yearly":790,"trial_days":3}'});if(u.includes('tesseract'))return route.fulfill({status:200,contentType:'application/javascript',body:'window.Tesseract={};'});return route.abort();});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__storeDraft);await page.waitForTimeout(2200);
    for(const tab of ['dashboard','calendar','salary','attendance','settings']){
      await page.evaluate(tab=>window.__storeDraft.seed(tab),tab);await page.waitForTimeout(800);await page.evaluate(()=>{window.scrollTo(0,0);for(const el of document.querySelectorAll('*'))if(el.scrollTop)el.scrollTop=0;});await page.waitForTimeout(100);
      await page.screenshot({path:path.join(out,`${tab}-draft.png`),fullPage:false});
      if(tab==='salary'){
        await page.locator('#resultNet').scrollIntoViewIfNeeded();await page.waitForTimeout(350);
        await page.screenshot({path:path.join(out,'salary-result-draft.png'),fullPage:false});
        await page.evaluate(()=>{window.scrollTo(0,0);for(const el of document.querySelectorAll('*'))if(el.scrollTop)el.scrollTop=0;});
      }
      console.log(`${tab}: ${await page.locator('#page-'+tab).innerText().then(t=>t.slice(0,160).replace(/\s+/g,' '))}`);
    }
    console.log('pageErrors='+JSON.stringify(errors));
    await context.close();
    const googleOut=path.join(out,'google-play-1080x2400');fs.mkdirSync(googleOut,{recursive:true});
    const playContext=await browser.newContext({viewport:{width:432,height:960},deviceScaleFactor:2.5,colorScheme:'light',serviceWorkers:'block'});
    await playContext.addInitScript(()=>{window.MeowReminder={getPermissionStatus:async()=>({granted:true,status:'authorized'}),requestPermission:async()=>({granted:true,status:'authorized'}),schedule:async()=>({scheduled:true}),cancel:async()=>({cancelled:true})};});
    await playContext.route('**/*',route=>{const u=route.request().url();if(u.startsWith(base))return route.continue();if(u.includes('esm.sh/'))return route.fulfill({status:200,contentType:'application/javascript',body:mockSupabase});if(u.includes('billing-config'))return route.fulfill({status:200,contentType:'application/json',body:'{"configured":true,"provider":"app_store_play","store_managed":true,"monthly":99,"yearly":790,"trial_days":3}'});if(u.includes('tesseract'))return route.fulfill({status:200,contentType:'application/javascript',body:'window.Tesseract={};'});return route.abort();});
    const playPage=await playContext.newPage();await playPage.goto(base,{waitUntil:'domcontentloaded'});await playPage.waitForFunction(()=>window.__storeDraft);await playPage.waitForTimeout(2200);
    for(const tab of ['dashboard','calendar','salary','attendance','settings']){
      await playPage.evaluate(tab=>window.__storeDraft.seed(tab),tab);await playPage.waitForTimeout(800);await playPage.evaluate(()=>{window.scrollTo(0,0);for(const el of document.querySelectorAll('*'))if(el.scrollTop)el.scrollTop=0;});await playPage.waitForTimeout(100);
      await playPage.screenshot({path:path.join(googleOut,`${tab}-draft.png`),fullPage:false});
    }
    await playPage.evaluate(()=>window.__storeDraft.seed('salary'));await playPage.locator('#resultNet').scrollIntoViewIfNeeded();await playPage.waitForTimeout(350);await playPage.screenshot({path:path.join(googleOut,'salary-result-draft.png'),fullPage:false});
    await playContext.close();
    const graphicPage=await browser.newPage({viewport:{width:1024,height:500},deviceScaleFactor:1});
    const hero=fs.readFileSync(path.join(root,'assets','mobile-hero-clean-v75.png')).toString('base64');
    await graphicPage.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:1024px;height:500px;background:#fffaf3;font-family:Arial,"Noto Sans TC",sans-serif;color:#583723}.hero{display:block;width:1024px;height:auto}.copy{height:202px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:13px}.title{font-size:38px;line-height:1.18;font-weight:800;letter-spacing:1px}.sub{font-size:22px;line-height:1.3;color:#9b6a4c}.rule{height:4px;width:76px;border-radius:4px;background:#efbd55;margin-top:2px}</style><img class="hero" src="data:image/png;base64,${hero}"><div class="copy"><div class="title">班表、薪資、行程，一起整理好</div><div class="sub">陪輪班生活走得更輕鬆</div><div class="rule"></div></div>`,{waitUntil:'load'});
    await graphicPage.screenshot({path:path.join(out,'google-play-feature-graphic-draft.png'),fullPage:false});await graphicPage.close();
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
