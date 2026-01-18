import { parseParaff, toMEI } from '../src/lib/paraff/index.ts';

// Test: Dynamics output in MEI
// EDf = forte, EDp = piano, etc.
const code = "BOM K0 TN4 TD4 S1 Cg EDf c D4 d D4 EDp e D4 f D4 EOM";
const parsed = parseParaff(code);

console.log("=== Dynamics Test ===\n");
console.log("Paraff code:", code);

console.log("\nParsed dynamics:");
parsed?.dynamics?.forEach((dyn, i) => {
  console.log(`  ${i}: type=${dyn.type}, voiceIdx=${dyn.voiceIdx}, noteIdx=${dyn.noteIdx}`);
});

console.log("\n--- MEI Output (note and dynam elements) ---");
const mei = toMEI(parsed);
const lines = mei.split('\n').filter(line =>
  line.includes('<note') || line.includes('<dynam') || line.includes('</note')
);
lines.forEach(line => console.log(line.trim()));

// Verify dynam elements are present
const hasDynam = mei.includes('<dynam');
const hasForte = mei.includes('>f</dynam>');
const hasPiano = mei.includes('>p</dynam>');

console.log("\n--- Verification ---");
console.log("Has <dynam> element:", hasDynam ? "✓" : "✗");
console.log("Has forte (f):", hasForte ? "✓" : "✗");
console.log("Has piano (p):", hasPiano ? "✓" : "✗");

if (hasDynam && hasForte && hasPiano) {
  console.log("\n✓ Dynamics output works correctly!");
} else {
  console.log("\n✗ Dynamics output failed!");
  process.exit(1);
}
