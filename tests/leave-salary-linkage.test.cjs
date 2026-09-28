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

const source=extractFunction('attendanceDeductionEstimate');
const state={
  settings:{dailyWorkHours:10},
  dayStatus:{
    '2026-09-01':{type:'personal',hours:10},
    '2026-09-02':{type:'familyCare',hours:10},
    '2026-09-03':{type:'parentalLeave',hours:10},
    '2026-09-04':{type:'sick',hours:10},
    '2026-09-05':{type:'menstrual',hours:10},
    '2026-09-06':{type:'pregnancyRest',hours:10},
    '2026-09-07':{type:'annual',hours:10},
    '2026-09-08':{type:'prenatal',hours:10},
    '2026-09-09':{type:'paternity',hours:10},
    '2026-09-10':{type:'maternity',hours:10},
    '2026-09-11':{type:'miscarriage',hours:10}
  }
};
const api=new Function('state',`
  const num=v=>Number(v)||0;
  const monthKey=(y,m)=>String(y)+'-'+String(m+1).padStart(2,'0');
  const scheduleForDate=()=> 'work';
  const effectiveDayStatusHours=st=>Math.max(0,Number(st&&st.hours)||0);
  ${source}
  return attendanceDeductionEstimate;
`)(state);

const result=api(2026,8,30000);
assert.strictEqual(result.dailyWage,1000,'daily wage baseline');
assert.strictEqual(result.personalDeduction,1000,'personal leave should be unpaid');
assert.strictEqual(result.familyCareDeduction,1000,'family-care leave should follow unpaid personal leave');
assert.strictEqual(result.parentalLeaveDeduction,1000,'parental leave without pay should remove employer wage');
assert.strictEqual(result.sickDeduction,500,'ordinary sick leave should be half-pay estimate');
assert.strictEqual(result.menstrualDeduction,500,'menstrual leave should be half-pay estimate');
assert.strictEqual(result.pregnancyRestDeduction,500,'pregnancy-rest leave should follow half-pay sick-leave estimate');
assert.strictEqual(result.amount,4500,'only linked unpaid/half-pay leave types should contribute to automatic deduction');
assert.strictEqual(result.familyCareLegalHours,8,'10-hour shift must cap normal-wage deduction at 8 statutory hours');
assert.strictEqual(result.pregnancyRestLegalHours,8,'pregnancy-rest normal-wage estimate must cap at 8 statutory hours');
assert.strictEqual(result.parentalLeaveLegalHours,8,'parental leave normal-wage estimate must cap at 8 statutory hours');

assert(html.includes('產假／流產假會依年資與法定條件不同，請以薪資單人工確認'),'conditional maternity/miscarriage pay must be surfaced for manual review');
assert(html.includes('家庭照顧假／育嬰留職停薪按未給薪估算'),'salary UI must explain full-unpaid linked leave types');
assert(html.includes('普通病假／生理假／安胎休養按半薪估算'),'salary UI must explain half-pay linked leave types');

console.log('leave salary linkage regression: ok');
