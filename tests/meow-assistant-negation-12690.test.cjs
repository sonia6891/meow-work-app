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
  return {meowAssistantParse,normalizeMeowAssistantText};
`);
const api=factory();

const aliases=[
  ['特休','annual'],['年假','annual'],['特修','annual'],
  ['病假','sick'],['傷病假','sick'],
  ['生理假','menstrual'],['月經假','menstrual'],['生理價','menstrual'],
  ['事假','personal']
];

const removeTemplates=[
  (d,l)=>`${d}號沒有請${l}`,
  (d,l)=>`${d}號我沒有請${l}`,
  (d,l)=>`${d}號沒請${l}`,
  (d,l)=>`${d}號我沒請${l}`,
  (d,l)=>`${d}號並沒有請${l}`,
  (d,l)=>`${d}號根本沒有請${l}`,
  (d,l)=>`${d}號從來沒有請${l}`,
  (d,l)=>`${d}號未請${l}`,
  (d,l)=>`${d}號未曾請${l}`,
  (d,l)=>`${d}號不是${l}`,
  (d,l)=>`${d}號並非${l}`,
  (d,l)=>`${d}號不算${l}`,
  (d,l)=>`${d}號不要算${l}`,
  (d,l)=>`${d}號${l}標錯了`,
  (d,l)=>`${d}號${l}記錯了`,
  (d,l)=>`${d}號${l}登記錯了`,
  (d,l)=>`${d}號${l}排錯了`,
  (d,l)=>`${d}號${l}算錯了`,
  (d,l)=>`${d}號沒有休${l}`,
  (d,l)=>`${d}號沒休${l}`,
  (d,l)=>`${d}號沒有用${l}`,
  (d,l)=>`${d}號沒用${l}`,
  (d,l)=>`${d}號沒有排${l}`,
  (d,l)=>`${d}號沒排${l}`,
  (d,l)=>`${d}號沒有登記${l}`,
  (d,l)=>`${d}號沒登記${l}`,
  (d,l)=>`${d}號沒有標記${l}`,
  (d,l)=>`${d}號沒標記${l}`,
  (d,l)=>`${d}號我實際沒有請${l}`,
  (d,l)=>`${d}號我真的沒有請${l}`,
  (d,l)=>`${d}號我並沒有請${l}`,
  (d,l)=>`${d}號我根本沒請${l}`,
  (d,l)=>`${d}號我從來沒請${l}`,
  (d,l)=>`${d}號那天不是${l}`,
  (d,l)=>`${d}號那天並非${l}`,
  (d,l)=>`${d}號那天不算${l}`,
  (d,l)=>`${d}號那天不要算${l}`,
  (d,l)=>`${d}號那個${l}標錯了`,
  (d,l)=>`${d}號那個${l}記錯了`,
  (d,l)=>`${d}號那個${l}排錯了`
];

const noChangeTemplates=[
  (d,l)=>`${d}號沒有取消${l}`,
  (d,l)=>`${d}號沒取消${l}`,
  (d,l)=>`${d}號未取消${l}`,
  (d,l)=>`${d}號不是沒有請${l}`
];

const addTemplates=[
  (d,l)=>`${d}號請${l}`,
  (d,l)=>`${d}號我要請${l}`,
  (d,l)=>`${d}號幫我登記${l}`
];

let tested=0;
const failures=[];
for(let day=1;day<=30;day++){
  const date='2026-09-'+String(day).padStart(2,'0');
  for(const [alias,type] of aliases){
    for(const make of removeTemplates){
      const q=make(day,alias),actual=api.meowAssistantParse(q);tested++;
      if(!(actual&&actual.ok===true&&actual.type==='removeLeave'&&actual.leaveType===type&&JSON.stringify(actual.dates)===JSON.stringify([date]))){
        failures.push({q,expected:{type:'removeLeave',leaveType:type,dates:[date]},actual});
      }
    }
    for(const make of noChangeTemplates){
      const q=make(day,alias),actual=api.meowAssistantParse(q);tested++;
      if(!(actual&&actual.ok===true&&actual.type==='leaveNoChange'&&actual.leaveType===type&&JSON.stringify(actual.dates)===JSON.stringify([date]))){
        failures.push({q,expected:{type:'leaveNoChange',leaveType:type,dates:[date]},actual});
      }
    }
    for(const make of addTemplates){
      const q=make(day,alias),actual=api.meowAssistantParse(q);tested++;
      if(!(actual&&actual.ok===true&&actual.type==='leave'&&actual.leaveType===type&&JSON.stringify(actual.dates)===JSON.stringify([date])&&Number(actual.hours)===10)){
        failures.push({q,expected:{type:'leave',leaveType:type,dates:[date],hours:10},actual});
      }
    }
  }
}

if(failures.length)console.error(JSON.stringify(failures.slice(0,30),null,2));
assert.strictEqual(tested,12690,'unexpected test corpus size');
assert.strictEqual(failures.length,0,'negation/correction corpus has failures');
console.log('Meow Assistant negation/correction corpus:',tested,'cases passed');
