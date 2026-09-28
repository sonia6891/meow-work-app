const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'test-results');
fs.mkdirSync(out, { recursive: true });

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const bridge = String.raw`
window.__fullDataPressure = {
  getState:()=>state,
  replaceState:(value)=>{ state=normalizeState(value); localEditVersion++; return true; },
  renderTimed:()=>{ const started=performance.now(); render(); return performance.now()-started; },
  persist:()=>persistLocalSnapshot(),
  changed:()=>changedAndSync(),
  saveError:()=>localSaveError,
  calcMonth:()=>calcMonth(),
  fingerprint:()=>workFingerprint(state),
  setTab:(value)=>setTab(value),
  parseAssistant:(text)=>meowAssistantParse(text),
  closeLogin:()=>{
    const dialog=document.getElementById('welcomeDialog');
    if(dialog&&dialog.open)dialog.close();
    document.documentElement.classList.remove('auth-needs-login','auth-booting','meow-welcome-open');
  }
};
`;
const anchor = html.lastIndexOf('})();');
assert.ok(anchor > 0, 'App closure anchor exists');
html = html.slice(0, anchor) + bridge + '\n' + html.slice(anchor);

const mime = {
  '.html':'text/html; charset=utf-8', '.js':'application/javascript',
  '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg',
  '.webmanifest':'application/manifest+json'
};
const server = http.createServer((req,res)=>{
  const pathname = new URL(req.url,'http://127.0.0.1').pathname;
  if(pathname==='/'||pathname==='/index.html'){
    res.writeHead(200,{'content-type':mime['.html']}); res.end(html); return;
  }
  const file=path.join(root,pathname.replace(/^\/+/,''));
  if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});

const mockSupabase = String.raw`
export function createClient(){return {
  auth:{
    getSession:async()=>({data:{session:null},error:null}),
    onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}},
    signInWithOAuth:async()=>({data:{url:'https://auth.example.test'},error:null}),
    signOut:async()=>({error:null})
  },
  rpc:async()=>({data:null,error:null}),
  from(){const q={select(){return q},eq(){return q},order(){return q},limit:async()=>({data:[],error:null}),maybeSingle:async()=>({data:null,error:null}),upsert:async()=>({error:null})};return q},
  channel(){return{on(){return this},subscribe(){return this}}},
  removeChannel:async()=>{}
}}`;

const results=[];
const metrics={};
function check(name,value,detail){
  const passed=Boolean(value);
  results.push({name,passed,detail:detail??null});
  console.log((passed?'PASS ':'FAIL ')+name+(detail!==undefined?' :: '+JSON.stringify(detail):''));
  assert.ok(passed,name);
}
function iso(d){return d.toISOString().slice(0,10)}

(async()=>{
  server.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});

  async function context(width=390){
    const ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
    await ctx.route('**/*',async route=>{
      const url=route.request().url();
      if(url.startsWith(base)) return route.continue();
      if(url.includes('esm.sh/')) return route.fulfill({status:200,contentType:'application/javascript',body:mockSupabase});
      if(url.includes('/functions/v1/billing-config')) return route.fulfill({status:200,contentType:'application/json',body:'{"configured":false}'});
      if(url.includes('/auth/v1/settings')) return route.fulfill({status:200,contentType:'application/json',body:'{"external":{"google":true}}'});
      if(url.includes('tesseract')) return route.fulfill({status:200,contentType:'application/javascript',body:'window.Tesseract={};'});
      return route.abort();
    });
    return ctx;
  }

  // 1) Large multi-year dataset.
  const ctx=await context();
  const page=await ctx.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('dialog',d=>d.dismiss());
  await page.goto(base);
  await page.waitForFunction('window.__fullDataPressure');
  await page.evaluate(()=>window.__fullDataPressure.closeLogin());

  const buildMetrics=await page.evaluate(()=>{
    const p=window.__fullDataPressure;
    const source=p.getState();
    const big=JSON.parse(JSON.stringify(source));
    big.profile={name:'壓測喵',avatar:''};
    big.schedule={preset:'2-2',shiftName:'A班',workDays:2,offDays:2,startDate:'2022-01-01'};
    big.settings=Object.assign({},big.settings,{
      baseSalary:50000,shiftAllowancePerDay:350,mealAllowance:3000,performanceAllowance:2500,
      transportAllowance:1200,otherIncome:800,payday:5,hireDate:'2020-01-15',
      dailyWorkHours:10,defaultOvertimeHours:10,overtimeRateMode:'legal'
    });
    big.dayStatus={}; big.personalEvents={}; big.scheduleOverrides={}; big.months={};
    const add=(date,days)=>{const d=new Date(date+'T00:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};
    const start='2021-01-01';
    for(let i=0;i<3650;i++){
      const date=add(start,i);
      if(i%3===0)big.dayStatus[date]={type:'overtime',hours:(i%12)+1,overtimeKind:i%2?'regular':'rest'};
      else if(i%7===0)big.dayStatus[date]={type:'annual',hours:10};
      else if(i%11===0)big.dayStatus[date]={type:'sick',hours:10};
      else if(i%17===0)big.dayStatus[date]={type:'personal',hours:10};
      if(i%5===0)big.scheduleOverrides[date]={shiftName:i%10?'A班':'B班'};
    }
    for(let i=0;i<5000;i++){
      const date=add('2025-01-01',i%1095);
      if(i%2===0){
        big.personalEvents['event-'+i]={id:'event-'+i,kind:'event',date,start:'09:00',end:'10:30',title:'大量行程 '+i,reminder:i%6===0?'1h':'none',note:'壓力測試'};
      }else{
        big.personalEvents['todo-'+i]={id:'todo-'+i,kind:'todo',date,time:'09:00',title:'大量待辦 '+i,reminder:i%7===0?'1d':'none',completed:i%9===0};
      }
    }
    for(let y=2020;y<=2029;y++)for(let m=1;m<=12;m++){
      const key=y+'-'+String(m).padStart(2,'0');
      big.months[key]={dedLabor:1200,dedHealth:800,dedWelfare:300,dedPension:0,dedTax:0,dedHealthExtra:0,dedOther:0};
    }
    const t0=performance.now();
    p.replaceState(big);
    const replaceMs=performance.now()-t0;
    const renderMs=p.renderTimed();
    const fp=p.fingerprint();
    return {
      replaceMs,renderMs,
      dayStatus:Object.keys(p.getState().dayStatus).length,
      events:Object.keys(p.getState().personalEvents).length,
      overrides:Object.keys(p.getState().scheduleOverrides).length,
      months:Object.keys(p.getState().months).length,
      fingerprintBytes:new Blob([fp]).size
    };
  });
  Object.assign(metrics,{largeDataset:buildMetrics});
  check('大量資料筆數完整注入',buildMetrics.dayStatus>1000&&buildMetrics.events===5000&&buildMetrics.overrides>500&&buildMetrics.months===120,buildMetrics);
  check('大量資料完整 render 不崩潰',Number.isFinite(buildMetrics.renderMs)&&buildMetrics.renderMs<15000,{renderMs:buildMetrics.renderMs});
  check('大量狀態可建立穩定 fingerprint',buildMetrics.fingerprintBytes>500000,{bytes:buildMetrics.fingerprintBytes});

  const persistence=await page.evaluate(()=>{
    const p=window.__fullDataPressure;
    const t0=performance.now();
    const ok=p.persist();
    const elapsed=performance.now()-t0;
    const raw=localStorage.getItem('meow-work-manual-save-v3')||'';
    const parsed=JSON.parse(raw);
    return {
      ok,elapsed,bytes:new Blob([raw]).size,
      dayStatus:Object.keys(parsed.state.dayStatus||{}).length,
      events:Object.keys(parsed.state.personalEvents||{}).length
    };
  });
  metrics.persistence=persistence;
  check('大量資料可完整本機儲存',persistence.ok&&persistence.dayStatus===buildMetrics.dayStatus&&persistence.events===5000,persistence);
  check('大量本機儲存未超過合理 CI 時間',persistence.elapsed<15000,{elapsed:persistence.elapsed,bytes:persistence.bytes});

  const rapid=await page.evaluate(()=>{
    const p=window.__fullDataPressure;
    const before=p.getState().settings.baseSalary;
    const t0=performance.now();
    for(let i=0;i<120;i++){
      p.getState().settings.baseSalary=before+i;
      p.changed();
    }
    const mutationMs=performance.now()-t0;
    const t1=performance.now();
    for(let i=0;i<120;i++)p.setTab(['dashboard','calendar','attendance','salary','settings'][i%5]);
    const tabMs=performance.now()-t1;
    const mc=p.calcMonth();
    return {mutationMs,tabMs,base:p.getState().settings.baseSalary,net:mc.net,gross:mc.gross,otPay:mc.otPay};
  });
  metrics.rapid=rapid;
  check('120 次連續資料變更後狀態正確',rapid.base===50119,rapid);
  check('120 次快速頁籤切換未卡死',rapid.tabMs<20000,{tabMs:rapid.tabMs});
  check('大量資料薪資計算仍為有限非負數',Number.isFinite(rapid.net)&&rapid.net>=0&&Number.isFinite(rapid.gross)&&Number.isFinite(rapid.otPay),rapid);

  const parser=await page.evaluate(()=>{
    const p=window.__fullDataPressure;
    const samples=['明天加班10小時','明天不要加班','21號沒有請特休','下週二請病假','取消明天下午三點看醫生的行程','新增後天早上九點繳費代辦'];
    let parsed=0;
    const t0=performance.now();
    for(let i=0;i<10000;i++){const v=p.parseAssistant(samples[i%samples.length]);if(v)parsed++}
    return{parsed,elapsed:performance.now()-t0};
  });
  metrics.parser=parser;
  check('瀏覽器內 10,000 次自然語言解析不中斷',parser.parsed===10000,parser);

  check('大量資料與快速操作沒有瀏覽器執行錯誤',pageErrors.length===0,pageErrors);
  await ctx.close();

  // 2) Corrupted local snapshot must fail safe instead of bricking launch.
  const corruptCtx=await context();
  await corruptCtx.addInitScript(()=>{
    localStorage.setItem('meow-work-manual-save-v3','{"savedAt":');
    localStorage.setItem('meow-work-theme-v1','light');
  });
  const corruptPage=await corruptCtx.newPage();
  const corruptErrors=[];
  corruptPage.on('pageerror',e=>corruptErrors.push(String(e)));
  await corruptPage.goto(base);
  await corruptPage.waitForFunction('window.__fullDataPressure');
  const corrupt=await corruptPage.evaluate(()=>{
    const s=window.__fullDataPressure.getState();
    return{dayStatus:Object.keys(s.dayStatus||{}).length,events:Object.keys(s.personalEvents||{}).length,name:s.profile&&s.profile.name};
  });
  metrics.corruptRecovery=corrupt;
  check('損壞 JSON 備份會安全退回可用預設狀態',corrupt.dayStatus===0&&corrupt.events===0&&!!corrupt.name,corrupt);
  check('損壞備份啟動沒有 uncaught error',corruptErrors.length===0,corruptErrors);
  await corruptCtx.close();

  // 3) Simulate quota exhaustion and make sure app reports failure without deleting in-memory data.
  const quotaCtx=await context();
  const quotaPage=await quotaCtx.newPage();
  const quotaErrors=[];
  quotaPage.on('pageerror',e=>quotaErrors.push(String(e)));
  quotaPage.on('dialog',d=>d.dismiss());
  await quotaPage.goto(base);
  await quotaPage.waitForFunction('window.__fullDataPressure');
  const quota=await quotaPage.evaluate(()=>{
    const p=window.__fullDataPressure;
    p.closeLogin();
    p.getState().settings.baseSalary=77777;
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){
      if(k==='meow-work-manual-save-v3')throw new DOMException('simulated quota','QuotaExceededError');
      return original.call(this,k,v);
    };
    let ok;
    try{ok=p.persist()}finally{Storage.prototype.setItem=original}
    return{ok,saveError:p.saveError(),salary:p.getState().settings.baseSalary};
  });
  metrics.quota=quota;
  check('儲存空間不足時 persist 明確失敗',quota.ok===false&&quota.saveError===true,quota);
  check('儲存失敗不會清掉記憶體中的工作資料',quota.salary===77777,quota);
  check('儲存空間不足模擬沒有 uncaught error',quotaErrors.length===0,quotaErrors);
  await quotaCtx.close();

  fs.writeFileSync(path.join(out,'full-data-pressure.json'),JSON.stringify({results,metrics},null,2));
  await browser.close();
  server.close();
  console.log('PASS full data pressure suite');
})().catch(error=>{
  fs.writeFileSync(path.join(out,'full-data-pressure.json'),JSON.stringify({results,metrics,error:String(error&&error.stack||error)},null,2));
  try{server.close()}catch{}
  console.error(error);
  process.exitCode=1;
});