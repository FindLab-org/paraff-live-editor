import { parseParaff, paraffToMEI } from '@k-l-lambda/paraff/browser';

const code = `BOM K1 TN3 TD4 S1 Cg Md d Osup D4 EDp EslurL Mu g Osub D8 Bl a D8 b D8 c D8 Br VB S2 Cf Md g b d D2 a D4 EOM`;

console.log('Input:', code);
console.log();

const result = parseParaff(code);
console.log('Parsed:', result ? 'YES' : 'NO');
console.log('Staff N:', result?.staffN);
console.log('Voices:', result?.notes.length);
result?.notes.forEach((v, i) => {
    console.log(`  Voice ${i+1}: ${v.length} notes`);
    v.forEach((n, j) => {
        if (n.pitches.length > 1) {
            console.log(`    ${j+1}. CHORD: ${n.pitches.map(p => p.pname + p.oct).join('-')}`);
        } else {
            console.log(`    ${j+1}. ${n.pitches[0].pname}${n.pitches[0].oct} dur:${n.dur}`);
        }
    });
});

console.log('\nMEI has S2 staff:', paraffToMEI(code).includes('n="2"') ? 'YES' : 'NO');
