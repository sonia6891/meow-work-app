const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const edge=fs.readFileSync('supabase/functions/payslip-verify/index.ts','utf8');
const swift=fs.readFileSync('native/ios-sources/ViewController.swift','utf8');

function extractFunction(name,nextName){
  const start=html.indexOf('function '+name+'(');assert(start>=0,'missing '+name);
  const end=html.indexOf('function '+nextName+'(',start+1);assert(end>start,'missing next function '+nextName);
  return html.slice(start,end).trim();
}
const payslipMathAudit=new Function(extractFunction('payslipMathAudit','payslipTrustScore')+';return payslipMathAudit')();

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

// Regression locks for real payslip arbitration failures reported on device.
// Correct: income tax 97, performance allowance 1,300, plus a dynamic 餐費補助 row.
{
  const extras=[{label:'餐費補助',amount:1200,kind:'income'}];
  const correct={base:29300,shiftAllowance:5120,meal:0,performance:1300,transport:0,otherIncome:0,otPay:0,dedLabor:700,dedHealth:500,dedWelfare:100,dedPension:0,dedAttendance:0,dedTax:97,dedHealthExtra:0,dedOther:0};
  correct.actualNet=29300+5120+1300+1200-700-500-100-97;
  const good=payslipMathAudit(correct,extras,{...correct});
  assert(good.mathOk,'correct 97 tax / 1300 performance / 餐費補助 must balance');
  assert.strictEqual(good.extraIncome,1200,'餐費補助 must remain a separate extra income item');

  const wrongTax={...correct,dedTax:15};
  assert(!payslipMathAudit(wrongTax,extras,correct).mathOk,'15 must not be accepted when printed income tax is 97');

  const wrongPerformance={...correct,performance:300};
  assert(!payslipMathAudit(wrongPerformance,extras,correct).mathOk,'300 must not be accepted when printed performance allowance is 1300');
}
assert(html.includes("PAYSLIP_ALWAYS_RECHECK_KEYS=new Set(['actualNet','performance','dedTax','dedHealth'])"),'actualNet, tax, performance and health must always receive targeted crop recheck');
assert(html.includes("consensus>=2&&conf>=.9"),'two-pass-or-better targeted consensus must be able to override stale local OCR');
assert(!html.includes("consensus>=2&&conf>=.92&&localConf<.82"),'high-confidence stale OCR must not block a stronger crop consensus');
assert(edge.includes('forceRecheck = key === "actualNet" || key === "performance" || key === "dedTax"'),'server must force actualNet/tax/performance crop recheck');
assert(edge.includes('let third: any = null'),'disagreeing first/second crop reads must trigger a third vote');
assert(edge.includes('const digitAudit = key === "actualNet" || key === "dedHealth"'),'server must run amount-only digit audit for actualNet');
assert(edge.includes('key === "actualNet" || key === "dedHealth" || key === "dedTax" || key === "performance")'),'actualNet must receive the third crop vote');
assert(edge.includes('recoverExtraItemsFromRows'),'missing extra payroll rows must be recoverable independently of first-pass extraItems');
assert(edge.includes('payslip_extra_row_recovery'),'dynamic extra-row image recovery contract missing');

assert(tested>=50000);
for(const n of ['assessPayslipImageQuality','imageQuality.blocked','buildPayslipFieldCrops','applyPayslipArbitration',"num(payslipOcrResult.__confidence?.[key])<.85","num(payslipOcrResult.__confidence?.[key])<.9",'meow-work-payslip-format-memory-v4','實發金額是 Pro 薪資對帳的核心欄位'])assert(html.includes(n),'missing '+n);
for(const n of ['fieldCropRead','fieldRechecks','錯誤的自信答案比待確認更糟'])assert(edge.includes(n),'edge missing '+n);
assert(swift.includes('request.recognitionLevel = .accurate'));
assert(swift.includes('request.usesLanguageCorrection = isPayslipLabelPass'),'numeric pass must remain literal while label pass may use language correction');
assert(swift.includes('let isPayslipNumericPass = purpose == "payslip-numeric"'),'dedicated payroll numeric Vision pass is required');
assert(swift.includes('request.recognitionLanguages = isPayslipNumericPass ? ["en-US"] : ["zh-Hant", "en-US"]'),'numeric pass must reserve Vision candidates for literal money digits');
assert(swift.includes('request.minimumTextHeight = isPayslipNumericPass ? 0.0015 : (isPayslip ? 0.0025 : 0.008)'),'numeric rescue must use a lower text-height threshold without weakening the normal payslip pass');
assert(swift.includes('let candidateLimit = isPayslipNumericPass ? 3 : 1'),'numeric rescue must retain multiple Vision candidates');
assert(swift.includes('request.customWords = ['),'label-focused Vision pass must carry payroll vocabulary');
assert(html.includes("purpose:'payslip-numeric'"),'client must request the dedicated numeric rescue pass');
assert(html.includes('function fusePayslipVisionNumericData'),'numeric rescue candidates must be fused into spatial OCR');
assert(html.includes('candidateRank:Math.max(0,Math.min(9'),'ranked numeric Vision alternatives must survive OCR conversion');
assert(html.includes('score-=Math.min(.10,Math.max(0,Number(a.candidateRank)||0)*.04)'),'lower-ranked Vision alternatives must not beat the primary candidate on a geometry tie');
assert(html.includes('payslipAmountIsUsed(used,a)'),'one physical payroll amount cell must not be reused by another field');
assert(html.includes('markPayslipAmountUsed(used,pair.amount)'),'selecting a numeric alternative must lock all candidates from that physical cell');
assert(html.includes('function payslipNumericFragmentText'),'split numeric fragments must be stitchable before payroll field arbitration');
assert(html.includes("payslipAmountOnlyCropDataUrl(original,x.amountAnchor,'tight')"),'critical amount audit must include tight crop');
assert(html.includes("payslipAmountOnlyCropDataUrl(original,x.amountAnchor,'medium')"),'critical amount audit must include medium crop');
assert(html.includes("'wide'"),'critical amount audit must include a wider crop for leading-digit recovery');
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/pro-payslip-accuracy-v2.json',JSON.stringify({tested,failed:0},null,2));
console.log('PASS Pro payslip Accuracy V2:',tested,'cases');
