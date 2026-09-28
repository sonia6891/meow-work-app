const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('index.html','utf8');

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
    if(ch==="'"||ch==='"'||ch==='\`'){inStr=ch;continue}
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
  return {meowAssistantParse,normalizeMeowAssistantText,meowAssistantMutationDates,meowAssistantTimes};
`);
const api=factory();

const leaveAliases=[
  ['病假','sick'],['傷病假','sick'],['普通傷病假','sick'],
  ['生理假','menstrual'],['月經假','menstrual'],['月事假','menstrual'],
  ['事假','personal'],
  ['特休','annual'],['年假','annual'],['特別休假','annual'],
  ['婚假','marriage'],['結婚假','marriage'],
  ['喪假','bereavement'],
  ['公傷病假','occupationalInjury'],['公傷假','occupationalInjury'],['職災傷病假','occupationalInjury'],['職業災害傷病假','occupationalInjury'],
  ['公假','official'],
  ['產假','maternity'],['生產假','maternity'],
  ['流產假','miscarriage'],['小產假','miscarriage'],
  ['安胎休養請假','pregnancyRest'],['安胎休養假','pregnancyRest'],['安胎休養','pregnancyRest'],['安胎假','pregnancyRest'],
  ['產檢假','prenatal'],
  ['陪產檢及陪產假','paternity'],['陪產檢假','paternity'],['陪產假','paternity'],
  ['家庭照顧假','familyCare'],['家庭照護假','familyCare'],['家照假','familyCare'],
  ['育嬰留職停薪','parentalLeave'],['育嬰留停','parentalLeave'],['育嬰假','parentalLeave'],
  ['加班補休','compensatory'],['補休','compensatory']
];

const addTemplates=[
  (d,l)=>`${d}號我要請${l}`,
  (d,l)=>`${d}號幫我請${l}`,
  (d,l)=>`${d}號幫我登記${l}`,
  (d,l)=>`${d}號改成${l}`,
  (d,l)=>`${d}號設成${l}`,
  (d,l)=>`${d}號我想請${l}`,
  (d,l)=>`${d}號記成${l}`,
  (d,l)=>`${d}號排成${l}`
];
const removeTemplates=[
  (d,l)=>`${d}號取消${l}`,
  (d,l)=>`${d}號${l}不要了`,
  (d,l)=>`${d}號刪除${l}`,
  (d,l)=>`${d}號沒請${l}`,
  (d,l)=>`${d}號不是${l}`,
  (d,l)=>`${d}號${l}標錯了`,
  (d,l)=>`${d}號撤銷${l}`,
  (d,l)=>`${d}號拿掉${l}`
];
const noChangeTemplates=[
  (d,l)=>`${d}號沒有取消${l}`,
  (d,l)=>`${d}號不是沒有請${l}`,
  (d,l)=>`${d}號並沒有取消${l}`,
  (d,l)=>`${d}號未取消${l}`
];

let tested=0;
const failures=[];
function expect(q,predicate,expected){
  const actual=api.meowAssistantParse(q);tested++;
  if(!predicate(actual))failures.push({q,expected,actual});
}

for(let day=1;day<=25;day++){
  const date='2026-09-'+String(day).padStart(2,'0');
  for(const [alias,type] of leaveAliases){
    for(const make of addTemplates){
      const q=make(day,alias);
      expect(q,a=>a&&a.ok&&a.type==='leave'&&a.leaveType===type&&JSON.stringify(a.dates)===JSON.stringify([date])&&Number(a.hours)===10,{type:'leave',leaveType:type,dates:[date]});
    }
    for(const make of removeTemplates){
      const q=make(day,alias);
      expect(q,a=>a&&a.ok&&a.type==='removeLeave'&&a.leaveType===type&&JSON.stringify(a.dates)===JSON.stringify([date]),{type:'removeLeave',leaveType:type,dates:[date]});
    }
    for(const make of noChangeTemplates){
      const q=make(day,alias);
      expect(q,a=>a&&a.ok&&a.type==='leaveNoChange'&&a.leaveType===type&&JSON.stringify(a.dates)===JSON.stringify([date]),{type:'leaveNoChange',leaveType:type,dates:[date]});
    }
  }
}

// Company-specific/custom leave names should still be trackable without pretending they are statutory.
for(const label of ['生日假','福利假','志工假']){
  for(let day=1;day<=25;day++){
    const date='2026-09-'+String(day).padStart(2,'0');
    for(const q of [
      `${day}號幫我請${label}`,`${day}號改成${label}`,`${day}號登記${label}`,`${day}號設成${label}`
    ]){
      expect(q,a=>a&&a.ok&&a.type==='leave'&&a.leaveType==='custom'&&a.leaveLabel===label&&a.dates[0]===date,{type:'leave',leaveType:'custom',leaveLabel:label,date});
    }
    for(const q of [
      `${day}號取消${label}`,`${day}號${label}不要了`,`${day}號刪除${label}`,`${day}號${label}標錯了`
    ]){
      expect(q,a=>a&&a.ok&&a.type==='removeLeave'&&a.leaveType==='custom'&&a.leaveLabel===label&&a.dates[0]===date,{type:'removeLeave',leaveType:'custom',leaveLabel:label,date});
    }
  }
}

// Leave ranges, including the 2026 day-based parental-leave wording.
const rangeLeaves=[['育嬰假','parentalLeave'],['育嬰留停','parentalLeave'],['婚假','marriage'],['家庭照顧假','familyCare'],['產假','maternity'],['安胎假','pregnancyRest'],['特休','annual']];
for(let start=1;start<=10;start++){
  for(const [alias,type] of rangeLeaves){
    const end=start+4,q=`10月${start}日到${end}日我要請${alias}`;
    expect(q,a=>a&&a.ok&&a.type==='leave'&&a.leaveType===type&&a.dates.length===5&&a.dates[0]===`2026-10-${String(start).padStart(2,'0')}`&&a.dates[4]===`2026-10-${String(end).padStart(2,'0')}`,{type:'leave',leaveType:type,range:5});
  }
}

// Itinerary natural-language actions.
const eventTitles=['看牙醫','回診','朋友聚餐','健身','剪頭髮','看電影','接小孩','銀行辦事','復健','家庭聚會'];
for(let day=1;day<=20;day++){
  const date='2026-10-'+String(day).padStart(2,'0');
  for(const title of eventTitles){
    const q1=`10月${day}號下午3點幫我新增${title}的行程`;
    expect(q1,a=>a&&a.ok&&a.type==='addEvent'&&a.dates[0]===date&&a.title===title&&a.startTime==='15:00',{type:'addEvent',date,title,startTime:'15:00'});
    const q2=`10月${day}號18:30新增行程：${title}`;
    expect(q2,a=>a&&a.ok&&a.type==='addEvent'&&a.dates[0]===date&&a.title===title&&a.startTime==='18:30',{type:'addEvent',date,title,startTime:'18:30'});
    const q3=`取消10月${day}號${title}的行程`;
    expect(q3,a=>a&&a.ok&&a.type==='removeEvent'&&a.dates[0]===date&&a.title===title,{type:'removeEvent',date,title});
  }
}

// Todo / 代辦 wording.
const todoTitles=['繳房租','繳電費','買貓砂','領包裹','打電話給媽媽','預約掛號','買牛奶','繳信用卡','整理報稅資料','買衛生紙'];
for(let day=1;day<=20;day++){
  const date='2026-10-'+String(day).padStart(2,'0');
  for(const title of todoTitles){
    const q1=`10月${day}號18:30幫我新增${title}待辦事項`;
    expect(q1,a=>a&&a.ok&&a.type==='addTodo'&&a.dates[0]===date&&a.title===title&&a.startTime==='18:30',{type:'addTodo',date,title,startTime:'18:30'});
    const q2=`10月${day}號新增代辦：${title}`;
    expect(q2,a=>a&&a.ok&&a.type==='addTodo'&&a.dates[0]===date&&a.title===title,{type:'addTodo',date,title});
    const q3=`取消10月${day}號${title}的待辦`;
    expect(q3,a=>a&&a.ok&&a.type==='removeTodo'&&a.dates[0]===date&&a.title===title,{type:'removeTodo',date,title});
  }
}

// Reminder phrases are parsed only when explicitly stated.
for(let day=1;day<=20;day++){
  const date='2026-10-'+String(day).padStart(2,'0');
  expect(`10月${day}號下午3點新增回診行程前1小時提醒我`,a=>a&&a.ok&&a.type==='addEvent'&&a.dates[0]===date&&a.reminder==='1h',{type:'addEvent',reminder:'1h'});
  expect(`10月${day}號18:30新增繳費待辦前一天提醒我`,a=>a&&a.ok&&a.type==='addTodo'&&a.dates[0]===date&&a.reminder==='1d',{type:'addTodo',reminder:'1d'});
}

if(failures.length)console.error(JSON.stringify(failures.slice(0,60),null,2));
assert(tested>=20000,'natural-language corpus must exceed 20,000 cases; got '+tested);
assert.strictEqual(failures.length,0,'natural-language action corpus has failures');

fs.mkdirSync('test-results',{recursive:true});
fs.writeFileSync('test-results/meow-assistant-natural-actions.json',JSON.stringify({
  build:(html.match(/<meta name="meow-ui-build" content="([^"]+)"/)||[])[1]||'unknown',
  tested,failed:failures.length,
  leave_aliases:leaveAliases.length,
  categories:['statutory_leave','custom_leave','leave_range','event_add_remove','todo_add_remove','explicit_reminder']
},null,2));
console.log('PASS Meow Assistant natural-language action corpus:',tested,'cases passed');
