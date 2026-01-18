import { parseParaff, paraffToMEI } from '../src/lib/paraff/index.js';

// Test various multi-voice examples from the dataset

// Example 1: Simple 2-voice from BWV-114
const example1 = `BOM K1 TN3 TD4 S1 Cg Md d Osup D4 EDp EslurL Mu g Osub D8 Bl a D8 b D8 c D8 Br VB S2 Cf Md g b d D2 EslurL a D4 EOM`;

// Example 2: From s17007 - simplified single staff
const example2 = `BOM K1 TN4 TD4 S1 Cg Mu b Osup D8 Dot Bl c D16 Br c D8 Dot Bl b D32 c D32 Br d D4 Etie VB Md g D4 a D4 b D4 Dot b D8 EOM`;

// Example 3: Bach chorale with chord in bass
const example3 = `BOM K1 TN3 TD4 S1 Cg Mu f As D4 EslurL g D8 Bl a D8 b D8 g D8 Br VB Cf Md d D4 b D4 g D4 EOM`;

console.log('=== Testing Multi-Voice Examples ===\n');

[example1, example2, example3].forEach((code, i) => {
    console.log(`\n--- Example ${i + 1} ---`);
    console.log('Input:', code.slice(0, 80) + '...');

    const result = parseParaff(code);
    if (result) {
        console.log('Parsed successfully!');
        console.log(`  Voices: ${result.notes.length}`);
        result.notes.forEach((voice, vi) => {
            console.log(`  Voice ${vi + 1}: ${voice.length} notes`);
            voice.slice(0, 3).forEach((note, ni) => {
                if (note.pitches.length > 1) {
                    console.log(`    - CHORD: ${note.pitches.map(p => p.pname).join('-')} dur:${note.dur}`);
                } else {
                    console.log(`    - ${note.pitches[0].pname}${note.pitches[0].oct} dur:${note.dur}${note.dots ? ' dotted' : ''}${note.beam || ''}`);
                }
            });
            if (voice.length > 3) console.log(`    ... and ${voice.length - 3} more`);
        });

        const mei = paraffToMEI(code);
        const layerCount = (mei.match(/<layer/g) || []).length;
        console.log(`  MEI layers: ${layerCount}`);
    } else {
        console.log('FAILED to parse!');
    }
});

// Final test: The proposed default example
console.log('\n\n=== Testing Proposed Default Example ===\n');

const proposedDefault = `BOM K1 TN3 TD4 S1 Cg Md d Osup D4 EDp EslurL Mu g Osub D8 Bl a D8 b D8 c D8 Br VB Cf Md g b d D2 a D4 EOM
BOM K1 TN3 TD4 S1 Cg Md d Osup D4 EslurR Mu g Osub D4 Est g D4 Est VB Cf Md b D2 Dot EOM
BOM K1 TN3 TD4 S1 Cg Mu f As D4 EslurL g D8 Bl a D8 b D8 g D8 Br VB Cf Md d D4 b D4 g D4 EOM
BOM K1 TN3 TD4 S1 Cg Mu b d g D2 Dot VB Cf Md g D2 Dot EOM`;

console.log('Proposed default:');
console.log(proposedDefault);
console.log();

const lines = proposedDefault.split('\n');
lines.forEach((line, i) => {
    const result = parseParaff(line);
    if (result) {
        console.log(`Measure ${i + 1}: ${result.notes.length} voices`);
        result.notes.forEach((voice, vi) => {
            const hasChords = voice.some(n => n.pitches.length > 1);
            console.log(`  Voice ${vi + 1}: ${voice.length} notes${hasChords ? ' (has chords)' : ''}`);
        });
    }
});

const mei = paraffToMEI(proposedDefault);
console.log(`\nTotal MEI length: ${mei.length} chars`);
console.log('Has multiple layers:', (mei.match(/<layer/g) || []).length > 4 ? 'YES' : 'NO');
