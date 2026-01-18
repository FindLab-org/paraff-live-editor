import { parseParaff, toMEI } from '../src/lib/paraff/index.ts';

// Understanding the Paraff relative pitch encoding:
//
// The ABC encoder calculates y = step + octave * 7 for pitch position.
// When the difference |y_new - y_old| >= 4, it emits Osup/Osub tokens.
//
// Decoder logic:
// 1. Calculate interval = step_new - step_old
// 2. octInc = floor(|interval|/4) * -sign(interval)
//    - This compensates for interval wrapping (e.g., b->c should go UP)
// 3. Each Osup adds +1 octave, each Osub adds -1 octave
//
// Example: c4 (y=28) to g4 (y=32)
//   - interval = 4-0 = 4
//   - Without Osup: g would be at oct 4 + floor(4/4)*-1 = 3, so g3
//   - With Osup: g3 + 1 = g4
//   - Encoder emits ONE Osup for c4->g4 because diff(32-28)=4 >= 4

console.log("=== Testing Relative Pitch Mode ===\n");

// Test 1: Ascending scale without octave tokens
// c4 -> d4 -> e4 -> f4 -> g4 -> a4 -> b4 -> c5
// Each step has interval 1, so no octave compensation needed
// b->c (interval -6) triggers octInc = floor(6/4)*-(-1) = +1
const code1 = "BOM K0 TN4 TD4 S1 Cg c D8 d D8 e D8 f D8 g D8 a D8 b D8 c D8 EOM";
const parsed1 = parseParaff(code1);
console.log("Test 1: Ascending scale (c d e f g a b c)");
console.log("Expected: C4 D4 E4 F4 G4 A4 B4 C5");
const actual1 = parsed1?.notes[0]?.map(n => `${n.pitches[0].pname.toUpperCase()}${n.pitches[0].oct}`).join(' ');
console.log("Actual:", actual1);
const pass1 = actual1 === "C4 D4 E4 F4 G4 A4 B4 C5";
console.log(pass1 ? "✓ PASS" : "✗ FAIL");

// Test 2: c to g with Osup (c4 -> g4)
// interval = 4, octInc = -1, so g would be g3 without Osup
// With one Osup: g3 + 1 = g4
const code2 = "BOM K0 TN4 TD4 S1 Cg c D4 g Osup D4 EOM";
const parsed2 = parseParaff(code2);
console.log("\nTest 2: c g Osup (encoding for c4 -> g4)");
console.log("Expected: C4 G4");
const actual2 = parsed2?.notes[0]?.map(n => `${n.pitches[0].pname.toUpperCase()}${n.pitches[0].oct}`).join(' ');
console.log("Actual:", actual2);
const pass2 = actual2 === "C4 G4";
console.log(pass2 ? "✓ PASS" : "✗ FAIL");

// Test 3: c to g without any octave token (c4 -> g3)
// interval = 4, octInc = -1, so g is g3
const code3 = "BOM K0 TN4 TD4 S1 Cg c D4 g D4 EOM";
const parsed3 = parseParaff(code3);
console.log("\nTest 3: c g (no Osup - should be c4 -> g3)");
console.log("Expected: C4 G3");
const actual3 = parsed3?.notes[0]?.map(n => `${n.pitches[0].pname.toUpperCase()}${n.pitches[0].oct}`).join(' ');
console.log("Actual:", actual3);
const pass3 = actual3 === "C4 G3";
console.log(pass3 ? "✓ PASS" : "✗ FAIL");

// Test 4: c to g with Osub (c4 -> g2)
// interval = 4, octInc = -1, so g would be g3 without Osub
// With Osub: g3 - 1 = g2
const code4 = "BOM K0 TN4 TD4 S1 Cg c D4 g Osub D4 EOM";
const parsed4 = parseParaff(code4);
console.log("\nTest 4: c g Osub (c4 -> g2)");
console.log("Expected: C4 G2");
const actual4 = parsed4?.notes[0]?.map(n => `${n.pitches[0].pname.toUpperCase()}${n.pitches[0].oct}`).join(' ');
console.log("Actual:", actual4);
const pass4 = actual4 === "C4 G2";
console.log(pass4 ? "✓ PASS" : "✗ FAIL");

// Test 5: Descending scale (c d c b)
// c4 -> d4 (interval +1, no octInc)
// d4 -> c4 (interval -1, no octInc)
// c4 -> b3 (interval +6, octInc = floor(6/4)*-sign(6) = -1)
const code5 = "BOM K0 TN4 TD4 S1 Cg c D4 d D4 c D4 b D4 EOM";
const parsed5 = parseParaff(code5);
console.log("\nTest 5: c d c b (c4 d4 c4 b3)");
console.log("Expected: C4 D4 C4 B3");
const actual5 = parsed5?.notes[0]?.map(n => `${n.pitches[0].pname.toUpperCase()}${n.pitches[0].oct}`).join(' ');
console.log("Actual:", actual5);
const pass5 = actual5 === "C4 D4 C4 B3";
console.log(pass5 ? "✓ PASS" : "✗ FAIL");

// Test 6: key-two-flats reproduction (b c d e)
// Start: step=0, oct=4 (initial C4 environment)
// b: step=6, interval = 6-0 = 6, octInc = floor(6/4)*-sign(6) = -1, oct = 4-1 = 3, B3
// c: step=0, interval = 0-6 = -6, octInc = floor(6/4)*-sign(-6) = +1, oct = 3+1 = 4, C4
// d: step=1, interval = 1-0 = 1, no octInc, D4
// e: step=2, interval = 2-1 = 1, no octInc, E4
const code6 = "BOM K_2 TN4 TD4 S1 Cg b D4 c D4 d D4 e D4 EOM";
const parsed6 = parseParaff(code6);
console.log("\nTest 6: b c d e (key-two-flats treble part)");
console.log("Expected: B3 C4 D4 E4");
const actual6 = parsed6?.notes[0]?.map(n => `${n.pitches[0].pname.toUpperCase()}${n.pitches[0].oct}`).join(' ');
console.log("Actual:", actual6);
const pass6 = actual6 === "B3 C4 D4 E4";
console.log(pass6 ? "✓ PASS" : "✗ FAIL");

console.log("\n=== Summary ===");
const allPass = pass1 && pass2 && pass3 && pass4 && pass5 && pass6;
console.log(`Passed: ${[pass1, pass2, pass3, pass4, pass5, pass6].filter(p => p).length}/6`);
if (allPass) {
  console.log("✓ All relative pitch tests pass!");
} else {
  console.log("✗ Some tests failed!");
}
