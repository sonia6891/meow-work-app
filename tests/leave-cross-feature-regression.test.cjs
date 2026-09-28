const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');

function between(startMarker,endMarker){
  const start=html.indexOf(startMarker);
  assert(start>=0,'missing '+startMarker);
  const end=html.indexOf(endMarker,start);
  assert(end>start,'missing end marker '+endMarker);
  return html.slice(start,end);
}

// Every leave type that Meow Assistant can write must also be editable manually.
for(const [value,label] of [
  ['marriage','婚假'],['bereavement','喪假'],['occupationalInjury','公傷病假'],
  ['official','公假'],['maternity','產假'],['miscarriage','流產假'],
  ['pregnancyRest','安胎休養假'],['prenatal','產檢假'],['paternity','陪產檢及陪產假'],
  ['familyCare','家庭照顧假'],['parentalLeave','育嬰留職停薪'],['compensatory','補休']
]){
  assert(html.includes('<option value="'+value+'">'+label+'</option>'),'day editor missing '+label);
}

// Off-duty leave markers must not inflate monthly salary/attendance leave statistics.
const calcSource=between('function calcMonth()','\nfunction icon(');
const state={
  months:{},
  settings:{
    baseSalary:30000,shiftAllowancePerDay:100,mealAllowance:0,performanceAllowance:0,
    transportAllowance:0,otherIncome:0
  },
  dayStatus:{
    '2026-09-02':{type:'sick',hours:8},
    '2026-09-12':{type:'sick',hours:8}
  }
};
const calcApi=new Function('state',`
  const current=new Date(2026,8,1);
  const num=v=>Number(v)||0;
  const monthKey=(y,m)=>String(y)+'-'+String(m+1).padStart(2,'0');
  const iso=dt=>dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  const scheduleForDate=dt=>dt.getDate()<=10?'work':'off';
  const effectiveDayStatusHours=st=>Math.max(0,Number(st&&st.hours)||0);
  const typeMeta=st=>({label:st.type,type:st.type});
  const monthlyOvertimePay=()=>0;
  const attendanceDeductionEstimate=()=>({amount:0});
  ${calcSource}
  return calcMonth;
`)(state);
const month=calcApi();
assert.strictEqual(month.expected,10,'expected workdays baseline');
assert.strictEqual(month.attendance,9,'one workday sick leave should reduce attendance');
assert.strictEqual(month.leaveDays,1,'off-duty sick marker must not count as another leave day');
assert.strictEqual(month.leaveHours,8,'off-duty sick marker must not inflate leave hours');
assert.strictEqual(month.leaves.sick.days,1,'leave breakdown must match workday-only logic');

// Yearly quota counters also ignore leave records placed on rest dates.
const yearlySource=between('function yearlyLeaveUsage(type)','\nfunction fmtHours(');
const yearlyApi=new Function('state',`
  const scheduleForDate=dt=>dt.getDate()===12?'off':'work';
  const effectiveDayStatusHours=st=>Math.max(0,Number(st&&st.hours)||0);
  ${yearlySource}
  return yearlyLeaveUsage;
`)({
  dayStatus:{
    '2026-09-02':{type:'sick',hours:8},
    '2026-09-12':{type:'sick',hours:8}
  }
});
assert.strictEqual(yearlyApi('sick'),8,'rest-day leave must not consume yearly leave quota');

// Consecutive work logic must use structured leave status, not a short label regex.
const consecutiveSource=between('function meowAssistantMaxConsecutiveWorkDays(year,month)','\nfunction meowAssistantAppContext(');
const consecutiveApi=new Function('state',`
  const iso=dt=>dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  const scheduleForDate=dt=>{
    if(dt.getFullYear()!==2026||dt.getMonth()!==8)return 'off';
    return dt.getDate()>=1&&dt.getDate()<=7?'work':'off';
  };
  ${consecutiveSource}
  return meowAssistantMaxConsecutiveWorkDays;
`)({
  dayStatus:{
    '2026-09-04':{type:'familyCare',hours:8},
    '2026-09-08':{type:'overtime',hours:4}
  }
});
const streak=consecutiveApi(2026,8);
assert.strictEqual(streak.days,3,'family-care leave must break the work streak even though its label is not 病假/事假/特休');
assert.strictEqual(streak.start,'2026-09-01');
assert.strictEqual(streak.end,'2026-09-03');

console.log('leave cross-feature regression: ok');
