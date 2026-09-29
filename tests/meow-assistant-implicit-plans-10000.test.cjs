const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');
const route=fs.readFileSync('supabase/functions/meow-assistant-route/index.ts','utf8');

function extractFunction(name){
  const marker='function '+name+'(';
  const start=html.indexOf(marker);
  assert(start>=0,'missing function '+name);
  const brace=html.indexOf('{',start);
  let depth=0,inStr='',esc=false,inRegex=false,inClass=false;
  for(let i=brace;i<html.length;i++){
    const ch=html[i],prev=html[i-1]||'';
    if(inStr){
      if(esc){esc=false;continue}
      if(ch==='\\'){esc=true;continue}
      if(ch===inStr)inStr='';
      continue;
    }
    if(inRegex){
      if(esc){esc=false;continue}
      if(ch==='\\'){esc=true;continue}
      if(ch==='[')inClass=true;
      else if(ch===']')inClass=false;
      else if(ch==='/'&&!inClass)inRegex=false;
      continue;
    }
    if(ch==="'"||ch==='"'||ch==='`'){inStr=ch;continue}
    if(ch==='/'&&prev!=='/'&&html[i+1]!=='/'&&html[i+1]!=='*'){inRegex=true;continue}
    if(ch==='{')depth++;
    if(ch==='}'){
      depth--;
      if(depth===0)return html.slice(start,i+1);
    }
  }
  throw new Error('unterminated '+name);
}

const helperStart=html.indexOf('function meowAssistantChineseNumber');
const helperEnd=html.indexOf('function meowAssistantCalcMonthAt',helperStart);
assert(helperStart>=0&&helperEnd>helperStart,'Meow Assistant helper block missing');
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
  return {meowAssistantParse,meowAssistantMutationDates,meowAssistantTimes};
`);
const api=factory();

let tested=0;
const failures=[];
function expect(q,predicate,expected){
  const actual=api.meowAssistantParse(q);tested++;
  if(!predicate(actual))failures.push({q,expected,actual});
}

const eventTitles=[
  '帶貓咪去看醫生','看牙醫','回診','跟朋友吃飯','去台北',
  '去健身房運動','去剪頭髮','帶小孩去打預防針','去銀行辦事情','去做復健',
  '跟客戶見面','參加家長會','去看電影','去做健康檢查','帶狗狗去洗澡',
  '去機場接家人','去學校開家長會','去百貨公司聚餐','去醫院拿報告','去看展覽'
];
const eventTemplates=[
  {make:(d,t)=>`10月${d}號我要${t}`,time:''},
  {make:(d,t)=>`我10月${d}號要${t}`,time:''},
  {make:(d,t)=>`10月${d}號我會${t}`,time:''},
  {make:(d,t)=>`10月${d}號打算${t}`,time:''},
  {make:(d,t)=>`10月${d}號預計${t}`,time:''},
  {make:(d,t)=>`10月${d}號準備${t}`,time:''},
  {make:(d,t)=>`10月${d}號${t}`,time:''},
  {make:(d,t)=>`10月${d}號下午3點我要${t}`,time:'15:00'},
  {make:(d,t)=>`我10月${d}號晚上7點${t}`,time:'19:00'},
  {make:(d,t)=>`10月${d}號早上9點${t}`,time:'09:00'},
  {make:(d,t)=>`10月${d}號中午12點${t}`,time:'12:00'},
  {make:(d,t)=>`10月${d}號18:30${t}`,time:'18:30'}
];

for(let day=1;day<=25;day++){
  const date='2026-10-'+String(day).padStart(2,'0');
  for(const title of eventTitles){
    for(const spec of eventTemplates){
      const q=spec.make(day,title);
      expect(q,a=>a&&a.ok&&a.type==='addEvent'&&a.dates[0]===date&&a.title===title&&a.startTime===spec.time,{type:'addEvent',date,title,startTime:spec.time});
    }
  }
}

const todoTitles=[
  '繳房租','繳電費','買貓砂','領包裹','打電話給媽媽',
  '回覆主管訊息','寄包裹','整理報稅資料','提交文件','申請證明',
  '填表','處理帳單','完成簡報','報稅','倒垃圾',
  '洗衣服','吃藥','補貨','訂票','預約掛號'
];
const todoTemplates=[
  {make:(d,t)=>`10月${d}號我要${t}`,time:''},
  {make:(d,t)=>`我10月${d}號要${t}`,time:''},
  {make:(d,t)=>`10月${d}號我得${t}`,time:''},
  {make:(d,t)=>`10月${d}號需要${t}`,time:''},
  {make:(d,t)=>`10月${d}號記得${t}`,time:''},
  {make:(d,t)=>`10月${d}號別忘了${t}`,time:''},
  {make:(d,t)=>`10月${d}號${t}`,time:''},
  {make:(d,t)=>`10月${d}號晚上8點要${t}`,time:'20:00'},
  {make:(d,t)=>`10月${d}號09:30${t}`,time:'09:30'},
  {make:(d,t)=>`提醒我10月${d}號${t}`,time:''}
];

for(let day=1;day<=25;day++){
  const date='2026-10-'+String(day).padStart(2,'0');
  for(const title of todoTitles){
    for(const spec of todoTemplates){
      const q=spec.make(day,title);
      expect(q,a=>a&&a.ok&&a.type==='addTodo'&&a.dates[0]===date&&a.title===title&&a.startTime===spec.time,{type:'addTodo',date,title,startTime:spec.time});
    }
  }
}

// The reported real-world sentence must work without the words "新增" or "行程".
const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
const tomorrowIso=tomorrow.getFullYear()+'-'+String(tomorrow.getMonth()+1).padStart(2,'0')+'-'+String(tomorrow.getDate()).padStart(2,'0');
expect('我明天要帶貓咪去看醫生',a=>a&&a.ok&&a.type==='addEvent'&&a.dates[0]===tomorrowIso&&a.title==='帶貓咪去看醫生'&&a.startTime==='',{type:'addEvent',date:tomorrowIso,title:'帶貓咪去看醫生',startTime:''});
expect('我明天下午3點要帶貓咪去看醫生',a=>a&&a.ok&&a.type==='addEvent'&&a.dates[0]===tomorrowIso&&a.title==='帶貓咪去看醫生'&&a.startTime==='15:00',{type:'addEvent',date:tomorrowIso,title:'帶貓咪去看醫生',startTime:'15:00'});
expect('明天要繳電費',a=>a&&a.ok&&a.type==='addTodo'&&a.dates[0]===tomorrowIso&&a.title==='繳電費',{type:'addTodo',date:tomorrowIso,title:'繳電費'});
expect('提醒我週五領包裹',a=>a&&a.ok&&a.type==='addTodo'&&a.title==='領包裹'&&a.dates.length===1,{type:'addTodo',weekday:'Friday',title:'領包裹'});

// Do not turn questions or work/payroll phrases into personal mutations.
const safety=[
  '明天要不要帶貓咪去看醫生？','明天幾點去看醫生？','我明天要上班嗎？','明天要不要加班？',
  '明天我要請病假','明天薪水會入帳嗎？','後天班表是什麼','明天要買什麼？',
  '後天去哪裡？','週五要不要繳電費？'
];
for(let i=0;i<100;i++){
  for(const q of safety){
    expect(q,a=>!(a&&a.ok&&['addEvent','addTodo','removeEvent','removeTodo'].includes(a.type)),{notPersonalMutation:true});
  }
}

// UI contract: itinerary card is upcoming personal events, not injected work shifts.
const board=extractFunction('renderV219ItineraryBoard');
assert(board.includes("const upcomingEvents=allEvents.filter(e=>String(e&&e.date||'')>=today)"),'itinerary board must list upcoming personal events');
assert(!board.includes("scheduleForDate(now)==='work'"),'itinerary card must not inject work shifts as personal events');
assert(board.includes("e.start?(dateLabel+' '+e.start):dateLabel"),'untimed itinerary must show date only; timed itinerary may add time');

const candidate=extractFunction('buildItineraryCandidate');
assert(candidate.includes("if(end&&!start)"),'date-only itinerary must be saveable');
assert(candidate.includes("occupiesTime:!!(start||end)"),'untimed itinerary must not pretend to occupy an exact time slot');

const overlap=extractFunction('eventsOverlap');
assert(overlap.includes('if(as===null||ae===null||bs===null||be===null)return false;'),'untimed itinerary must not create false exact-time conflicts');

assert(route.includes('我明天要帶貓咪去看醫生'),'AI router must document implicit itinerary wording');
assert(route.includes('沒說時間就保持 startTime/endTime=null'),'AI router must preserve missing time instead of inventing one');

if(failures.length)console.error(JSON.stringify(failures.slice(0,80),null,2));
assert(tested>=10000,'implicit personal-action corpus must exceed 10,000 cases; got '+tested);
assert.strictEqual(failures.length,0,'implicit itinerary/todo corpus has failures');

fs.mkdirSync('test-results',{recursive:true});
fs.writeFileSync('test-results/meow-assistant-implicit-plans.json',JSON.stringify({
  build:(html.match(/<meta name="meow-ui-build" content="([^"]+)"/)||[])[1]||'unknown',
  tested,
  failed:failures.length,
  event_titles:eventTitles.length,
  event_templates:eventTemplates.length,
  todo_titles:todoTitles.length,
  todo_templates:todoTemplates.length,
  categories:['implicit_event','implicit_todo','relative_date','optional_time','question_safety','upcoming_itinerary_ui','untimed_event_editing']
},null,2));
console.log('PASS Meow Assistant implicit itinerary/todo corpus:',tested,'cases passed');
