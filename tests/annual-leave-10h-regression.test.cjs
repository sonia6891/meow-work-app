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

assert(!html.includes("leaveType==='annual'?8"),'annual leave must not be hard-coded to 8 hours in assistant parsing');
assert(html.includes("else if(/昨天|昨日/.test(t))"),'relative date parser must support yesterday');

const leaveHoursSource=extractFunction('meowAssistantLeaveHours');
const leaveHoursApi=new Function(`
  const state={settings:{dailyWorkHours:10}};
  const num=v=>Number(v)||0;
  const normalizeMeowAssistantText=v=>String(v||'');
  ${leaveHoursSource}
  return meowAssistantLeaveHours;
`)();

assert.strictEqual(leaveHoursApi('昨天請特休','annual'),10,'10-hour shift full-day annual leave must deduct 10 hours');
assert.strictEqual(leaveHoursApi('昨天請特休半天','annual'),5,'half-day annual leave on 10-hour shift must deduct 5 hours');
assert.strictEqual(leaveHoursApi('昨天請特休8小時','annual'),8,'explicit 8-hour leave must stay 8 hours');

const balanceSource=extractFunction('annualLeaveBalanceInfo');
const balanceApi=new Function(`
  const state={
    settings:{dailyWorkHours:10},
    dayStatus:{
      '2026-09-27':{type:'annual',hours:10}
    }
  };
  const num=v=>Number(v)||0;
  const annualLeavePeriod=()=>({
    missing:false,
    start:new Date(2026,5,9),
    end:new Date(2027,5,9),
    hire:new Date(2025,5,9),
    today:new Date(2026,8,28)
  });
  const annualPeriodQuota=()=>7;
  const annualSupplementHours=()=>22;
  const annualDate=value=>new Date(String(value)+'T00:00:00');
  const effectiveDayStatusHours=st=>Math.max(0,Number(st&&st.hours)||0);
  ${balanceSource}
  return annualLeaveBalanceInfo(new Date(2026,8,28));
`)();

assert.strictEqual(balanceApi.totalDays,7,'statutory annual leave should remain 7 days');
assert.strictEqual(balanceApi.totalHours,56,'7 statutory days must form a 56-hour pool');
assert.strictEqual(balanceApi.carryHours,22,'manual used annual leave should remain 22 hours');
assert.strictEqual(balanceApi.recordedHours,10,'full-day leave on a 10-hour shift must record 10 hours');
assert.strictEqual(balanceApi.usedHours,32,'22 prior + 10 new leave must equal 32 used hours');
assert.strictEqual(balanceApi.remainHours,24,'56 - 22 - 10 must equal 24 remaining hours');

console.log('annual leave 10-hour regression: ok');
