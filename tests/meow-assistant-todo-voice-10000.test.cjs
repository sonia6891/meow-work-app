const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const speech=fs.readFileSync('supabase/functions/speech-transcribe/index.ts','utf8');
const route=fs.readFileSync('supabase/functions/meow-assistant-route/index.ts','utf8');

function extractFunction(name){
  const marker='function '+name+'(';
  const start=html.indexOf(marker);
  assert(start>=0,'missing function '+name);
  const brace=html.indexOf('{',start);
  let depth=0,inStr='',esc=false,inRegex=false,inClass=false;
  for(let i=brace;i<html.length;i++){
    const ch=html[i],prev=html[i-1]||'';
    if(inStr){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch===inStr)inStr='';continue}
    if(inRegex){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch==='[')inClass=true;else if(ch===']')inClass=false;else if(ch==='/'&&!inClass)inRegex=false;continue}
    if(ch==="'"||ch==='"'||ch==='\`'){inStr=ch;continue}
    if(ch==='/'&&prev!=='/'&&html[i+1]!=='/'&&html[i+1]!=='*'){inRegex=true;continue}
    if(ch==='{')depth++;
    if(ch==='}'&&--depth===0)return html.slice(start,i+1);
  }
  throw new Error('unterminated '+name);
}

const helperStart=html.indexOf('function meowAssistantChineseNumber');
const helperEnd=html.indexOf('function meowAssistantCalcMonthAt',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'assistant helper block missing');
const helperBlock=html.slice(helperStart,helperEnd);
const parseSource=extractFunction('meowAssistantParse');

const factory=new Function(`
  const current=new Date(2026,8,1);
  const state={settings:{defaultOvertimeHours:10,dailyWorkHours:10}};
  const num=v=>Number(v)||0;
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  ${helperBlock}
  ${parseSource}
  return {meowAssistantParse,normalizeMeowAssistantText};
`);
const api=factory();

let tested=0;
const failures=[];
function expect(q,predicate,expected){
  const actual=api.meowAssistantParse(q);tested++;
  if(!predicate(actual))failures.push({q,expected,actual});
}

const categories={
  bills:['繳房租','繳電費','繳水費','繳水電費','繳瓦斯費','繳電話費','繳網路費','繳管理費','繳停車費','繳保費','繳學費','繳信用卡','繳稅','繳罰單','繳貸款'],
  money:['付款給廠商','匯款給媽媽','轉帳給房東','儲值悠遊卡','報帳','請款'],
  shopping:['買牛奶','買雞蛋','買衛生紙','買貓砂','買狗飼料','買洗衣精','買牙膏','買生日禮物','採買食材','採購文具','下單濾芯','訂購墨水','補貨咖啡'],
  pickup:['領包裹','領藥','領錢','取貨','取件','拿文件','寄信','寄件','寄包裹','寄回商品','退貨','換貨'],
  communication:['打電話給媽媽','打電話給房東','回電話給客戶','聯絡水電師傅','聯絡老師','回覆主管訊息','回覆客戶','回信給人資','傳訊息給同事','傳LINE給家人','寄email給客戶','追蹤廠商回覆','催款'],
  documents:['整理報稅資料','整理發票','整理文件','提交報告','提交申請','繳交資料','申請證明','申請補助','填表','填資料','填問卷','處理帳單','完成簡報','準備會議資料','修改履歷','檢查合約','核對帳單','列印文件','掃描收據','影印證件','簽名','簽文件','上傳檔案','下載報表','備份照片','報稅'],
  household:['倒垃圾','洗衣服','曬衣服','收衣服','洗碗','掃地','拖地','打掃浴室','整理房間','澆花','餵貓','餵狗','清貓砂','清冰箱','換床單','換濾芯','煮飯','備餐','準備便當'],
  health:['吃藥','量血壓','量體重','量血糖','補充維他命','預約掛號','預約牙醫','預約看診'],
  maintenance:['加油','幫手機充電','幫行動電源充電','保養機車','保養汽車','送修手機','送修電腦','修理腳踏車','換電池','續約網路','續費會員','取消訂閱'],
  planning:['訂票','訂位','預約保養','預約維修','更新軟體','安裝更新','寫作業','寫報告','寫企劃','讀文件','讀報告','複習英文','練習簡報','繳作業','準備考試'],
  carry:['帶雨傘','帶證件','帶文件','帶藥','帶便當','帶充電器','帶鑰匙','帶水壺']
};
const titles=Object.values(categories).flat();
assert(titles.length>=120,'todo title catalog must cover at least 120 representative tasks');

const datedTemplates=[
  (d,t)=>`10月${d}號我要${t}`,
  (d,t)=>`我10月${d}號要${t}`,
  (d,t)=>`10月${d}號記得${t}`,
  (d,t)=>`10月${d}號別忘了${t}`,
  (d,t)=>`提醒我10月${d}號${t}`,
  (d,t)=>`10月${d}號幫我記一下${t}`
];

for(let day=1;day<=20;day++){
  const date='2026-10-'+String(day).padStart(2,'0');
  for(const title of titles){
    for(const make of datedTemplates){
      const q=make(day,title);
      expect(q,a=>a&&a.ok&&a.type==='addTodo'&&a.dates[0]===date&&a.title===title,{type:'addTodo',date,title});
    }
  }
}

// Date-less voice commands are valid todos; the user should not need to say "新增待辦".
const noDateTemplates=[
  t=>`我要${t}`,
  t=>`我得${t}`,
  t=>`我需要${t}`,
  t=>`記得${t}`,
  t=>`別忘了${t}`,
  t=>`幫我記一下${t}`,
  t=>`提醒我${t}`
];
for(const title of titles){
  for(const make of noDateTemplates){
    const q=make(title);
    expect(q,a=>a&&a.ok&&a.type==='addTodo'&&a.dates.length===0&&a.title===title,{type:'addTodo',dates:[],title});
  }
}

// Bare imperative phrases should also become todos.
for(const title of titles){
  expect(title,a=>a&&a.ok&&a.type==='addTodo'&&a.title===title,{type:'addTodo',title});
}

// Voice-recognition variants for the explicit word "待辦".
for(const token of ['待辦事項','代辦事項','帶辦事項','戴辦事項','待半事項','代半事項']){
  expect(`增加${token}買貓砂`,a=>a&&a.ok&&a.type==='addTodo'&&/買貓砂/.test(a.title),{type:'addTodo',title:'買貓砂'});
}

// Time-only task is allowed without inventing a date.
expect('晚上8點記得吃藥',a=>a&&a.ok&&a.type==='addTodo'&&a.dates.length===0&&a.startTime==='20:00'&&a.title==='吃藥',{type:'addTodo',time:'20:00',title:'吃藥'});
expect('明天晚上8點吃藥',a=>a&&a.ok&&a.type==='addTodo'&&a.dates.length===1&&a.startTime==='20:00'&&a.title==='吃藥',{type:'addTodo',date:'relative',time:'20:00',title:'吃藥'});

// Past/completed statements must not create new tasks by accident.
const past=[
  '我剛剛買了牛奶','我剛才繳了電費','我已經領了包裹','我已經回覆主管了',
  '剛剛倒垃圾了','已經洗完衣服','我之前寄了文件','我已經處理好了帳單'
];
for(let i=0;i<200;i++)for(const q of past){
  expect(q,a=>!(a&&a.ok&&a.type==='addTodo'),{notAddTodo:true});
}

// Questions must remain questions, not mutate data.
const questions=[
  '我明天要買什麼？','要不要繳電費？','我是不是要領包裹？','什麼時候繳房租？',
  '可以幫我買東西嗎？','明天幾點吃藥？','怎麼報稅？','去哪裡取貨？'
];
for(let i=0;i<200;i++)for(const q of questions){
  expect(q,a=>!(a&&a.ok&&['addTodo','removeTodo'].includes(a.type)),{notTodoMutation:true});
}

// UI discovery contract requested by product review.
assert(!html.includes('🏖 查特休餘額'),'assistant quick actions must not spend a slot on annual-leave balance');
assert(html.includes('📅 新增行程'),'assistant must teach itinerary voice usage');
assert(html.includes('☑ 新增待辦'),'assistant must teach todo voice usage');
assert(html.includes('明天記得買貓砂'),'todo quick prompt should demonstrate ordinary speech');

// Speech transcription and cloud fallback must be todo-aware.
for(const term of ['待辦事項','買貓砂','繳電費','領包裹','回覆訊息','倒垃圾','洗衣服','吃藥']){
  assert(speech.includes(term),'speech transcription prompt missing todo vocabulary: '+term);
}
assert(route.includes('我要買衛生紙'),'cloud router must accept date-less natural todo wording');
assert(route.includes('昨天已經繳電費了'),'cloud router must protect against past-statement false positives');

if(failures.length)console.error(JSON.stringify(failures.slice(0,100),null,2));
assert(tested>=10000,'todo voice corpus must exceed 10,000 cases; got '+tested);
assert.strictEqual(failures.length,0,'todo voice natural-language corpus has failures');

fs.mkdirSync('test-results',{recursive:true});
fs.writeFileSync('test-results/meow-assistant-todo-voice.json',JSON.stringify({
  build:(html.match(/<meta name="meow-ui-build" content="([^"]+)"/)||[])[1]||'unknown',
  tested,
  failed:failures.length,
  title_count:titles.length,
  categories:Object.keys(categories),
  coverage:['bills','money','shopping','pickup','communication','documents','household','health','maintenance','planning','carry','date_less','voice_variants','past_safety','question_safety']
},null,2));
console.log('PASS Meow Assistant todo voice corpus:',tested,'cases passed across',titles.length,'task phrases');
