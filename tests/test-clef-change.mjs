import { meiEncoder } from '@findlab-org/paraff/browser';

// Test: Start with treble clef, play some notes, then change to bass clef mid-measure
const code = "BOM K0 TN4 TD4 S1 Cg c D4 d D4 Cf e D4 f D4 EOM";
const parsed = meiEncoder.parseParaff(code);

console.log("Voice 0 notes:");
parsed?.notes[0]?.forEach((note, i) => {
  console.log("  note " + i + ": clefBefore=" + (note.clefBefore || "none") + ", pname=" + note.pitches[0]?.pname);
});

console.log("\n--- MEI Output (clef and note elements) ---");
const mei = meiEncoder.toMEI(parsed);
const lines = mei.split('\n').filter(line =>
  line.includes('<note') || line.includes('<rest') || line.includes('<clef') || line.includes('<staff')
);
lines.forEach(line => console.log(line.trim()));
