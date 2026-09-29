const fs = require('fs');
const assert = require('assert');

const edge = fs.readFileSync('supabase/functions/payslip-verify/index.ts', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const match = edge.match(/function resolveCropReadConsensus\(reads, aiValue = null, aiConfidence = 0\) \{([\s\S]*?)\n\}/);
assert(match, 'production crop consensus function missing');
const resolveCropReadConsensus = new Function('reads','aiValue','aiConfidence', match[1]);

const read = (value, confidence = .95) => ({ value, confidence });
const cases = [
  ['tax 97 unanimous', [read(97), read(97), read(97)], 97, .98, 97],
  ['performance 1300 unanimous', [read(1300), read(1300), read(1300)], 1300, .98, 1300],
  ['650 subsidy amount unanimous', [read(650), read(650), read(650)], 650, .97, 650],
  ['first pass wrong, later passes right', [read(15), read(97), read(97)], 97, .98, 97],
  ['high-confidence wrong first cannot beat two correct rereads', [read(15, .99), read(97, .9), read(97, .9)], 97, .98, 97],
  ['low-confidence wrong third is ignored', [read(97), read(97), read(15, .4)], 97, .98, 97],
  ['one crop plus agreeing whole-image read may resolve', [read(15), read(97), read(null)], 97, .98, 97],
  ['single agreeing crop plus whole-image read may resolve', [read(97), read(null), read(null)], 97, .98, 97],
  ['crop majority may not override conflicting high-confidence whole-image read', [read(97), read(15), read(15)], 97, .98, null],
  ['three wrong crops may not override conflicting whole-image read', [read(15), read(15), read(15)], 97, .98, null],
  ['single wrong crop vs whole-image read stays unresolved', [read(15), read(null), read(null)], 97, .98, null],
  ['without a trusted whole-image read, two crop votes may resolve', [read(97), read(97), read(15)], null, 0, 97]
];

for (const [name, reads, aiValue, aiConfidence, expected] of cases) {
  const result = resolveCropReadConsensus(reads, aiValue, aiConfidence);
  assert.strictEqual(result.value, expected, name);
  if (expected === null) assert.strictEqual(result.unanimous, false, name + ' must fail closed');
}

assert(edge.includes('key === "performance" || key === "dedTax"'), 'tax and performance must always be reread');
assert(edge.includes('recoverExtraItemsFromRows'), 'independent extra row rediscovery must remain wired');
assert(edge.includes('.slice(0, 16)'), 'extra row rediscovery must inspect enough unclaimed candidate rows');
assert(edge.includes('名稱待確認（讀到：'), 'uncertain extra-row amounts must remain visible for human label confirmation');
assert(edge.includes('rowAmount'), 'extra row rediscovery must bind labels to candidate row amounts');
assert(edge.includes('t1 === t2') && edge.includes('t1 === c1'), 'subsidy label must retain exact two-read transcription and class match');

assert(html.includes("PAYSLIP_ALWAYS_RECHECK_KEYS=new Set(['performance','dedTax'])"), 'tax and performance must be forced into field crops');
assert(html.includes("if(key==='dedTax')return"), 'whole-image tax evidence must be recognized');
assert(html.includes("if(key==='performance')return"), 'whole-image performance evidence must be recognized');
assert(html.includes('payslipFieldCropDataUrl'), 'field crops must include label/amount geometry');
assert(html.includes('mergedAmounts=new Map()'), 'money candidates must merge across OCR variants');
assert(html.includes('payslipScanEpoch'), 'rerun/clear generation guard missing');
assert(html.includes('resetPayslipScan(false,false)'), 'a new scan must reset UI without invalidating itself');
assert(html.includes("item.confidence<.45"), 'uncertain recovered extra rows must not be silently discarded');
assert(html.includes('v269-payroll-race-crop-fix'), 'test must target the new visible build');

console.log('PASS independent Pro payslip red gate:', cases.length, 'consensus cases plus rerun/crop/extra-row wiring checks');
