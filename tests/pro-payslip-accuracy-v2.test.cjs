const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const edge=fs.readFileSync('supabase/functions/payslip-verify/index.ts','utf8');
const swift=fs.readFileSync('native/ios-sources/ViewController.swift','utf8');

function extractFunction(name){
  const start=html.indexOf('function '+name+'(');assert(start>=0,'missing '+name);
  const brace=html.indexOf('{',start);let depth=0,inStr='',esc=false,inRegex=false,inClass=false;
  for(let i=brace;i<html.length;i++){
    const ch=html[i],prev=html[i-1]||'',next=html[i+1]||'';
    if(inStr){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch===inStr)inStr='';continue}
    if(inRegex){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch==='[')inClass=true;else if(ch===']')inClass=false;else if(ch==='/'&&!inClass)inRegex=false;continue}
    if(ch==="'"||ch==='"'||ch==='\`'){inStr=ch;continue}
    if(ch==='/'&&next!=='/'&&next!=='*'&&prev!=='\\'){inRegex=true;continue}
    if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return html.slice(start,i+1);
  }
  throw new Error('unterminated '+name);
}
const payslipMathAudit=new Function(extractFunction('payslipMathAudit')+';return payslipMathAudit')();

let tested=0;
for(let i=0;i<20000;i++){
  const base=28000+i%22000,shift=(i%5)*1200,meal=(i%3)*500,performance=(i%7)*350,transport=(i%4)*300,ot=(i%9)*420;
  const labor=650+i%120,health=430+i%90,welfare=(i%2)*180,pension=(i%4)*500,attendance=(i%6)*173,tax=(i%5)*260;
  const extras=i%4===0?[{label:'餐費補助',amount:1200,kind:'income'}]:[];
  const f={base,shiftAllowance:shift,meal,performance,transport,otherIncome:0,otPay:ot,dedLabor:labor,dedHealth:health,dedWelfare:welfare,dedPension:pension,dedAttendance:attendance,dedTax:tax,dedHealthExtra:0,dedOther:0};
  f.actualNet=base+shift+meal+performance+transport+ot+(extras[0]?.amount||0)-labor-health-welfare-pension-attendance-tax;
  const a=payslipMathAudit(f,extras,{...f});tested++;assert(a.comparable&&a.mathOk);assert.strictEqual(a.digitShiftKeys.length,0);
}
const corruptKeys=['base','shiftAllowance','otPay','dedLabor','dedHealth','dedAttendance'];
for(let i=0;i<20000;i++){
  const f={base:32000,shiftAllowance:6000,meal:1800,performance:1000,transport:500,otherIncome:0,otPay:2400,dedLabor:780,dedHealth:520,dedWelfare:200,dedPension:0,dedAttendance:673,dedTax:300,dedHealthExtra:0,dedOther:0};
  const e={...f};f.actualNet=32000+6000+1800+1000+500+2400-780-520-200-673-300;e.actualNet=f.actualNet;
  const key=corruptKeys[i%corruptKeys.length];f[key]=e[key]*10;const a=payslipMathAudit(f,[],e);tested++;
  assert(a.digitShiftKeys.includes(key),'10x error '+key);assert(!a.mathOk);
}
for(let i=0;i<10000;i++){
  const f={base:40000,shiftAllowance:0,meal:0,performance:0,transport:0,otherIncome:0,otPay:0,dedLabor:800,dedHealth:500,dedWelfare:0,dedPension:0,dedAttendance:0,dedTax:0,dedHealthExtra:0,dedOther:0};
  const extras=[{label:'專案獎金',amount:2000+i%500,kind:'income'},{label:'工會費',amount:100+i%50,kind:'deduction'}];
  f.actualNet=40000+extras[0].amount-800-500-extras[1].amount;tested++;
  assert(payslipMathAudit(f,extras,{base:40000,dedLabor:800,dedHealth:500}).mathOk);
}
assert(tested>=50000);
for(const n of ['assessPayslipImageQuality','imageQuality.blocked','buildPayslipFieldCrops','applyPayslipArbitration',"num(payslipOcrResult.__confidence?.[key])<.85","num(payslipOcrResult.__confidence?.[key])<.9",'meow-work-payslip-format-memory-v4','實發金額是 Pro 薪資對帳的核心欄位'])assert(html.includes(n),'missing '+n);
for(const n of ['fieldCropRead','fieldRechecks','錯誤的自信答案比待確認更糟'])assert(edge.includes(n),'edge missing '+n);
assert(swift.includes('request.recognitionLevel = .accurate'));assert(swift.includes('request.usesLanguageCorrection = false'));assert(swift.includes('purpose == "payslip" ? 0.0025 : 0.008'));
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/pro-payslip-accuracy-v2.json',JSON.stringify({tested,failed:0},null,2));
console.log('PASS Pro payslip Accuracy V2:',tested,'cases');
