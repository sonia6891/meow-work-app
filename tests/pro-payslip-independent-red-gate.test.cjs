const fs = require('fs');
const assert = require('assert');

const edge = fs.readFileSync('supabase/functions/payslip-verify/index.ts', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const match = edge.match(/function resolveCropReadConsensus\(reads\) \{([\s\S]*?)\n\}/);
assert(match, 'production crop consensus function missing');
const resolveCropReadConsensus = new Function('reads', match[1]);

const read = (value, confidence = .95) => ({ value, confidence });
const exactRead = [read(97), read(97), read(97)];
const cases = [
  ['tax 97 unanimous', exactRead, 97],
  ['performance 1300 unanimous', [read(1300), read(1300), read(1300)], 1300],
  ['650 subsidy amount unanimous', [read(650), read(650), read(650)], 650],
  ['first pass wrong, later passes right', [read(15), read(97), read(97)], null],
  ['first pass right, later passes wrong', [read(97), read(15), read(15)], null],
  ['high confidence cannot outvote a disagreement', [read(15, .99), read(97, .9), read(97, .9)], null],
  ['low confidence disagreement cannot be discarded', [read(97), read(97), read(15, .4)], null],
  ['two conflicting reads cannot auto-fill', [read(15), read(97), read(null)], null],
  ['single read cannot auto-fill', [read(97), read(null), read(null)], null]
];

for (const [name, reads, expected] of cases) {
  const result = resolveCropReadConsensus(reads);
  assert.strictEqual(result.value, expected, name);
  if (expected === null) assert.strictEqual(result.unanimous, false, name + ' must fail closed');
}

assert(edge.includes('key === "performance" || key === "dedTax"'), 'tax and performance must always be reread');
assert(edge.includes('recoverExtraItemsFromRows'), 'independent extra row rediscovery must remain wired');
assert(edge.includes('rowAmount'), 'extra row rediscovery must bind labels to candidate row amounts');
assert(edge.includes('t1 === t2') && edge.includes('t1 === c1'), 'subsidy label must retain exact two-read transcription and class match');
assert(html.includes("'多次局部辨讀仍不一致，已清除自動帶入值；請依薪資單原圖手動確認。'"), 'unresolved tax/performance values must be cleared for manual review');
assert(html.includes("['performance','dedTax'].includes(key)"), 'fail-closed clearing must cover both reported fields');

console.log('PASS independent Pro payslip red gate:', cases.length, 'vote cases and production wiring checks');
