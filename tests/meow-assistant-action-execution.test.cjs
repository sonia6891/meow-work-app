const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');

function extractFunction(name){
  const start=html.indexOf('function '+name+'(');assert(start>=0,'missing '+name);
  const brace=html.indexOf('{',start);let depth=0,inStr='',esc=false,inRegex=false,inClass=false;
  for(let i=brace;i<html.length;i++){const ch=html[i],prev=html[i-1]||'';
    if(inStr){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch===inStr)inStr='';continue}
    if(inRegex){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch==='[')inClass=true;else if(ch===']')inClass=false;else if(ch==='/'&&!inClass)inRegex=false;continue}
    if(ch==="'"||ch==='"'||ch==='\`'){inStr=ch;continue}
    if(ch==='/'&&prev!=='/'&&html[i+1]!=='/'&&html[i+1]!=='*'){inRegex=true;continue}
    if(ch==='{')depth++;if(ch==='}'&&--depth===0)return html.slice(start,i+1);
  }
  throw new Error('unterminated '+name);
}
function extractConstBlock(startMarker,endMarker){
  const start=html.indexOf(startMarker),end=html.indexOf(endMarker,start);
  assert(start>=0&&end>start,'missing block '+startMarker);
  return html.slice(start,end);
}

const leaveBlock=extractConstBlock('const MEOW_ASSISTANT_LEAVE_META=','function meowAssistantShiftTarget');
const sources=[
  extractFunction('itineraryEvents'),
  extractFunction('todoItems'),
  extractFunction('eventMinutes'),
  extractFunction('meowAssistantDateLabel'),
  extractFunction('meowAssistantMatchText'),
  extractFunction('meowAssistantResolvePersonalItem'),
  extractFunction('meowAssistantPlanCheck'),
  extractFunction('executeMeowAssistantPlan'),
  extractFunction('undoMeowAssistant')
].join('\n');

const factory=new Function(`
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const num=v=>Number(v)||0;
  let current=new Date(2026,8,1);
  let state={
    settings:{dailyWorkHours:10,defaultOvertimeHours:10},
    dayStatus:{},personalEvents:{},scheduleOverrides:{}
  };
  let meowAssistantUndo=null,meowAssistantPending=null;
  const messages=[],scheduled=[],cancelled=[];
  const $=()=>null;
  const changedAndSync=()=>{};
  const render=()=>{};
  const syncMonthOvertimeFromCalendar=()=>{};
  const renderMeowAssistantReply=(msg,type)=>messages.push({msg,type});
  const scheduleItemReminder=async item=>{scheduled.push(item.id);return{scheduled:true}};
  const cancelItemReminder=async(kind,id)=>{cancelled.push({kind,id})};
  const meowAssistantOvertimeRecord=(date,hours)=>({type:'overtime',hours});
  ${leaveBlock}
  ${sources}
  return{
    get state(){return state},
    get current(){return current},
    get undo(){return meowAssistantUndo},
    messages,scheduled,cancelled,
    meowAssistantPlanCheck,executeMeowAssistantPlan,undoMeowAssistant
  };
`);

const api=factory();

function execute(plan){
  const checked=api.meowAssistantPlanCheck(plan);
  assert.equal(checked.ok,true,checked.message||'plan should pass');
  assert.equal(api.executeMeowAssistantPlan(checked),true);
  return checked;
}

// Statutory leave writes through the same calendar status engine.
execute({ok:true,type:'leave',leaveType:'marriage',leaveLabel:'婚假',dates:['2026-10-01'],hours:10,hoursSource:'schedule-default'});
assert.equal(api.state.dayStatus['2026-10-01'].type,'marriage');

execute({ok:true,type:'leave',leaveType:'familyCare',leaveLabel:'家庭照顧假',dates:['2026-10-02'],hours:4,hoursSource:'explicit-hours'});
assert.equal(api.state.dayStatus['2026-10-02'].type,'familyCare');
assert.equal(api.state.dayStatus['2026-10-02'].hours,4);

execute({ok:true,type:'leave',leaveType:'parentalLeave',leaveLabel:'育嬰留職停薪',dates:['2026-10-03','2026-10-04','2026-10-05'],hours:10,hoursSource:'schedule-default'});
for(const d of ['2026-10-03','2026-10-04','2026-10-05'])assert.equal(api.state.dayStatus[d].type,'parentalLeave');

execute({ok:true,type:'leave',leaveType:'custom',leaveLabel:'生日假',dates:['2026-10-06'],hours:10,hoursSource:'schedule-default'});
assert.equal(api.state.dayStatus['2026-10-06'].type,'custom');
assert.equal(api.state.dayStatus['2026-10-06'].label,'生日假');

// Event creation is linked to the existing personalEvents store.
execute({ok:true,type:'addEvent',dates:['2026-10-07'],title:'看牙醫',note:'看牙醫',startTime:'15:00',endTime:'16:00',reminder:'1h'});
let events=Object.values(api.state.personalEvents).filter(x=>x.kind==='event');
assert.equal(events.length,1);
assert.equal(events[0].title,'看牙醫');
assert.equal(events[0].date,'2026-10-07');
assert.equal(events[0].start,'15:00');
assert.equal(events[0].end,'16:00');
assert.equal(events[0].reminder,'1h');

// Unique natural-language cancellation resolves and removes only that item.
let removeEvent=api.meowAssistantPlanCheck({ok:true,type:'removeEvent',dates:['2026-10-07'],title:'看牙醫'});
assert.equal(removeEvent.ok,true);
assert.equal(removeEvent.targetId,events[0].id);
api.executeMeowAssistantPlan(removeEvent);
assert.equal(Object.values(api.state.personalEvents).filter(x=>x.kind==='event').length,0);

// Todo creation uses the same personalEvents data as the UI.
execute({ok:true,type:'addTodo',dates:['2026-10-08'],title:'繳房租',note:'',startTime:'18:30',endTime:'',reminder:'1d'});
let todos=Object.values(api.state.personalEvents).filter(x=>x.kind==='todo');
assert.equal(todos.length,1);
assert.equal(todos[0].title,'繳房租');
assert.equal(todos[0].date,'2026-10-08');
assert.equal(todos[0].time,'18:30');
assert.equal(todos[0].reminder,'1d');

// Undo restores the previous personalEvents snapshot.
api.undoMeowAssistant();
assert.equal(Object.values(api.state.personalEvents).filter(x=>x.kind==='todo').length,0);

// Ambiguous deletion is blocked instead of guessing.
execute({ok:true,type:'addTodo',dates:['2026-10-09'],title:'繳費',note:'A',startTime:'',endTime:'',reminder:'none'});
execute({ok:true,type:'addTodo',dates:['2026-10-10'],title:'繳費',note:'B',startTime:'',endTime:'',reminder:'none'});
const ambiguous=api.meowAssistantPlanCheck({ok:true,type:'removeTodo',dates:[],title:'繳費'});
assert.equal(ambiguous.ok,false);
assert(/不只一個/.test(ambiguous.message));

// Date-qualified deletion becomes unique.
const unique=api.meowAssistantPlanCheck({ok:true,type:'removeTodo',dates:['2026-10-09'],title:'繳費'});
assert.equal(unique.ok,true);
api.executeMeowAssistantPlan(unique);
todos=Object.values(api.state.personalEvents).filter(x=>x.kind==='todo');
assert.equal(todos.length,1);
assert.equal(todos[0].date,'2026-10-10');

console.log('PASS Meow Assistant action execution / undo / ambiguity safety');
