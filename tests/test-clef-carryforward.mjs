import { parseParaffScore, scoreToMEI } from '../src/lib/paraff/index.ts';

// Test: Two measures, first measure sets staff 2 to bass clef (Cf)
// Second measure should carry forward staff 2's clef correctly
const code = `
BOS
BOM K0 TN4 TD4 S1 Cg c D4 VB S2 Cf c Osub D4 EOM
BOM c D4 VB c D4 EOM
EOS
`;

const score = parseParaffScore(code);
console.log("Measure 1 staffClefs:", score?.measures[0]?.staffClefs);
console.log("Measure 2 staffClefs:", score?.measures[1]?.staffClefs);

console.log("\nMeasure 1 clef (staff 1):", score?.measures[0]?.clef);
console.log("Measure 2 clef (staff 1):", score?.measures[1]?.clef);

// The second measure should still have Cf for staff 2 (carried forward)
// and Cg for staff 1 (not overwritten by staff 2's clef)
const expectedStaff1Clef = 'Cg';
const expectedStaff2Clef = 'Cf';

const m2Staff1Clef = score?.measures[1]?.staffClefs[1];
const m2Staff2Clef = score?.measures[1]?.staffClefs[2];

console.log("\n--- Verification ---");
console.log("Measure 2 staff 1 clef:", m2Staff1Clef, m2Staff1Clef === expectedStaff1Clef ? "✓" : "✗");
console.log("Measure 2 staff 2 clef:", m2Staff2Clef, m2Staff2Clef === expectedStaff2Clef ? "✓" : "✗");

if (m2Staff1Clef === expectedStaff1Clef && m2Staff2Clef === expectedStaff2Clef) {
  console.log("\n✓ Bug B fix verified: Per-staff clef carry-forward works correctly!");
} else {
  console.log("\n✗ Bug B fix failed!");
}
