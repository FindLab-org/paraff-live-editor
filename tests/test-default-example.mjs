import { paraffToMEI, parseParaffScore } from '../src/lib/paraff/index.js';

const exampleCode = `BOM K1 TN3 TD4 S1 Cg Md d Osup D4 EDp EslurL Mu g Osub D8 Bl a D8 b D8 c D8 Br EOM
BOM K1 TN3 TD4 S1 Cg Md d Osup D4 EslurR Mu g Osub D4 Est g D4 Est EOM
BOM K1 TN3 TD4 S1 Cg Md e Osup D4 EslurL c D8 Bl d D8 e D8 f As D8 Br EOM
BOM K1 TN3 TD4 S1 Cg Mu b d g D2 Dot EOM`;

console.log('Testing default example code:\n');
console.log(exampleCode);
console.log('\n---\n');

// Parse the score
const score = parseParaffScore(exampleCode);

if (score) {
    console.log('Parsed successfully!');
    console.log(`Number of measures: ${score.measures.length}`);

    score.measures.forEach((m, i) => {
        console.log(`\nMeasure ${i + 1}:`);
        console.log(`  Key: ${m.key}, Time: ${m.timeNum}/${m.timeDen}, Clef: ${m.clef}`);
        console.log(`  Notes/Chords: ${m.notes[0].length}`);

        m.notes[0].forEach((note, j) => {
            if (note.pitches.length > 1) {
                console.log(`    ${j + 1}. CHORD: ${note.pitches.map(p => p.pname + p.oct + (p.accid || '')).join('-')} (dur: ${note.dur})`);
            } else {
                const p = note.pitches[0];
                console.log(`    ${j + 1}. Note: ${p.pname}${p.oct}${p.accid || ''} (dur: ${note.dur}${note.dots ? ' dotted' : ''}${note.staccato ? ' stacc' : ''}${note.beam ? ' beam:' + note.beam : ''})`);
            }
        });
    });

    console.log('\n--- MEI Output ---\n');
    const mei = paraffToMEI(exampleCode);

    // Show key parts of MEI
    console.log('Key signature:', mei.match(/key\.sig="([^"]+)"/)?.[1]);
    console.log('Time signature:', mei.match(/meter\.count="([^"]+)"/)?.[1] + '/' + mei.match(/meter\.unit="([^"]+)"/)?.[1]);
    console.log('Has chord elements:', mei.includes('<chord'));
    console.log('Has articulations:', mei.includes('artic='));

    console.log('\nMEI length:', mei.length, 'characters');
} else {
    console.error('Failed to parse!');
}
