// Does float math on DECIMAL(10,2) money actually drift?
let mulFail = 0, mulEx = [];
for (let c = 1; c <= 200000; c++) {           // cents 0.01 .. 2000.00
  const p = c / 100;                           // a 2dp price as JS float
  if (Math.round(p * 100) !== c) { mulFail++; if (mulEx.length < 5) mulEx.push({price:p, want:c, got:Math.round(p*100)}); }
}
console.log('A) Math.round(price*100) wrong for', mulFail, 'of 200000 two-dp prices', mulEx);

// price * quantity
let pqFail = 0, pqEx = [];
for (let c = 1; c <= 20000; c++) for (const q of [2,3,5,7,12]) {
  const p = c/100, exact = c*q;                 // exact cents
  if (Math.round((p*q)*100) !== exact) { pqFail++; if (pqEx.length<5) pqEx.push({price:p,qty:q,want:exact/100,got:p*q}); }
}
console.log('B) round(price*qty*100) wrong in', pqFail, 'cases', pqEx);

// raw (unrounded) price*qty — what actually gets STORED as subtotal
let rawFail = 0, rawEx = [];
for (let c = 1; c <= 20000; c++) for (const q of [2,3,5,7,12]) {
  const p = c/100, raw = p*q, exact = (c*q)/100;
  if (raw !== exact) { rawFail++; if (rawEx.length<6) rawEx.push({price:p,qty:q,exact,raw}); }
}
console.log('C) RAW price*qty !== exact in', rawFail, 'cases', rawEx);

// summation drift across a multi-item cart
let sumFail = 0, sumEx = [];
for (let t = 0; t < 60000; t++) {
  const items = Array.from({length: 5}, () => ({ c: 1 + Math.floor(Math.random()*20000), q: 1 + Math.floor(Math.random()*5) }));
  const float = items.reduce((s,i) => s + ((i.c/100) * i.q), 0);
  const exactCents = items.reduce((s,i) => s + i.c*i.q, 0);
  if (Math.round(float*100) !== exactCents) { sumFail++; if (sumEx.length<3) sumEx.push({float, exact: exactCents/100}); }
  else if (float !== exactCents/100 && sumEx.length<3 && t<100) sumEx.push({note:'representation differs but rounds equal', float, exact: exactCents/100});
}
console.log('D) 5-item cart total mis-rounds in', sumFail, 'of 60000 random carts', sumEx);

// Sean's REAL catalog
const cat = [175, 110, 8400, 16800, 33600];
console.log('E) live catalog price*qty exact?', cat.every(p => [1,2,3,10,12].every(q => p*q === p*q && Number.isInteger(p*q))));
