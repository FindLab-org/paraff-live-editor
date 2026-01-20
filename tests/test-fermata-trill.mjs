import { meiEncoder } from '@findlab-org/paraff/browser';

// Test: Fermata and trill output in MEI
// Efer = fermata (Expression fermata)
// Etr = trill (Expression trill)
const code = "BOM K0 TN4 TD4 S1 Cg c D4 Efer d D4 Etr e D4 Efer Etr f D4 EOM";
const parsed = meiEncoder.parseParaff(code);

console.log("Voice 0 notes:");
parsed?.notes[0]?.forEach((note, i) => {
  console.log("  note " + i + ": pname=" + note.pitches[0]?.pname +
    ", fermata=" + (note.fermata || false) +
    ", trill=" + (note.trill || false));
});

console.log("\n--- MEI Output (note and ornament elements) ---");
const mei = meiEncoder.toMEI(parsed);
const lines = mei.split('\n').filter(line =>
  line.includes('<note') || line.includes('<fermata') || line.includes('<trill') || line.includes('</note')
);
lines.forEach(line => console.log(line.trim()));

// Verify fermata and trill elements are present
const hasFermata = mei.includes('<fermata');
const hasTrill = mei.includes('<trill');

console.log("\n--- Verification ---");
console.log("Has <fermata> element:", hasFermata ? "✓" : "✗");
console.log("Has <trill> element:", hasTrill ? "✓" : "✗");

if (hasFermata && hasTrill) {
  console.log("\n✓ Bug E fix verified: Fermata and trill output works correctly!");
} else {
  console.log("\n✗ Bug E fix failed!");
  process.exit(1);
}
