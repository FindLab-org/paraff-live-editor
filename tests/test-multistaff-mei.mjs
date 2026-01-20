import { meiEncoder } from '@findlab-org/paraff/browser';

const code = `BOM K1 TN3 TD4 S1 Cg Md d Osup D4 EDp EslurL Mu g Osub D8 Bl a D8 b D8 c D8 Br VB S2 Cf Md g b d D2 a D4 EOM`;

console.log('=== Testing Multi-Staff MEI Output ===\n');
console.log('Input:', code);
console.log();

// Parse to check structure
const parsed = meiEncoder.parseParaff(code);
console.log('Parsed structure:');
console.log('  staffN:', parsed.staffN);
console.log('  staffClefs:', parsed.staffClefs);
console.log('  voiceStaff:', parsed.voiceStaff);
console.log('  voices:', parsed.notes.length);
console.log();

// Generate MEI
const mei = meiEncoder.paraffToMEI(code);

// Check for multiple staffDef elements
const staffDefMatches = mei.match(/<staffDef[^>]+>/g) || [];
console.log('StaffDef count:', staffDefMatches.length);
staffDefMatches.forEach((sd, i) => console.log(`  ${i+1}:`, sd));
console.log();

// Check for multiple staff elements in measure
const staffMatches = mei.match(/<staff[^>]+>/g) || [];
console.log('Staff element count:', staffMatches.length);
staffMatches.forEach((s, i) => console.log(`  ${i+1}:`, s));
console.log();

// Check clefs
console.log('Has G clef:', mei.includes('clef.shape="G"'));
console.log('Has F clef:', mei.includes('clef.shape="F"'));
console.log();

// Print a section of MEI for inspection
const scoreDefStart = mei.indexOf('<scoreDef');
const scoreDefEnd = mei.indexOf('</scoreDef>') + 11;
console.log('ScoreDef section:');
console.log(mei.slice(scoreDefStart, scoreDefEnd));
console.log();

// Print measure section
const measureStart = mei.indexOf('<measure');
const measureEnd = mei.indexOf('</measure>') + 10;
console.log('Measure section:');
console.log(mei.slice(measureStart, measureEnd));
