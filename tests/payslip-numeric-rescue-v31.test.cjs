const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const html=fs.readFileSync('index.html','utf8');

function extractFunction(source,name){
  const start=source.indexOf('function '+name+'(');
  assert(start>=0,'missing '+name);
  const brace=source.indexOf('{',start);
  assert(brace>=0,'missing opening brace for '+name);
  let depth=0,quote='',escape=false;
  for(let i=brace;i<source.length;i++){
    const ch=source[i];
    if(quote){
      if(escape){escape=false;continue}
      if(ch==='\\'){escape=true;continue}
      if(ch===quote)quote='';
      continue;
    }
    if(ch==="'"||ch==='"'||ch==='\x60'){quote=ch;continue}
    if(ch==='{')depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0)return source.slice(start,i+1);
    }
  }
  throw new Error('unterminated '+name);
}

const sandbox={};
vm.createContext(sandbox);
vm.runInContext(extractFunction(html,'fusePayslipVisionNumericData')+';this.fn=fusePayslipVisionNumericData;',sandbox);
const fuse=sandbox.fn;

const base={
  text:'健保費 69\n實發金額 43,900',
  words:[
    {text:'健保費',confidence:98,bbox:{x0:10,y0:10,x1:70,y1:30}},
    {text:'69',confidence:91,bbox:{x0:150,y0:10,x1:180,y1:30}},
    {text:'43,900',confidence:94,bbox:{x0:150,y0:60,x1:230,y1:82}}
  ]
};
const numeric={
  words:[
    {text:'690',confidence:88,bbox:{x0:149,y0:10,x1:181,y1:30}},
    {text:'690',confidence:84,bbox:{x0:149,y0:10,x1:181,y1:30}},
    {text:'43900',confidence:96,bbox:{x0:150,y0:60,x1:230,y1:82}},
    {text:'NT$2600',confidence:82,bbox:{x0:150,y0:100,x1:215,y1:122}},
    {text:'1234567890',confidence:99,bbox:{x0:10,y0:140,x1:100,y1:160}}
  ]
};

const convertedRankContract=/candidateRank:Math\.max\(0,Math\.min\(9/.test(html);
assert(convertedRankContract,'Vision candidate rank must survive the web OCR conversion layer');

const out=fuse(base,numeric);
assert.strictEqual(out.text,base.text,'numeric rescue must not pollute label/text parsing');
const texts=out.words.map(x=>x.text);
assert(texts.includes('69'),'original literal OCR must remain available');
assert(texts.includes('690'),'missing leading/trailing digit rescue candidate');
assert(texts.some(x=>String(x).replace(/[^0-9]/g,'')==='43900'),'actualNet must remain numerically available regardless of comma formatting');
assert(texts.includes('2600'),'currency-decorated numeric candidate must normalize to digits');
assert(!texts.includes('1234567890'),'implausibly long numeric noise must be rejected');
assert.strictEqual(texts.filter(x=>x==='690').length,1,'same-location duplicate rescue candidate must be deduplicated');

// Same value at a materially different location must remain: payroll rows can
// legitimately repeat an amount such as 1,200 in multiple fields.
const repeated=fuse({text:'',words:[]},{words:[
  {text:'1200',confidence:90,bbox:{x0:100,y0:10,x1:140,y1:30}},
  {text:'1200',confidence:89,bbox:{x0:100,y0:80,x1:140,y1:100}}
]});
assert.strictEqual(repeated.words.filter(x=>x.text==='1200').length,2,'same amount on different payroll rows must not be collapsed');

assert(html.includes('score-=Math.min(.10,Math.max(0,Number(a.candidateRank)||0)*.04)'),'lower-ranked Vision alternatives must lose geometry ties while remaining available');
console.log('PASS payslip V3.1 numeric rescue fusion behavior');
