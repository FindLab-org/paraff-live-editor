import { parseParaff, toMEI } from '@findlab-org/paraff/browser';

const code = "BOM K0 TN4 TD4 S1 Cg c D4 d D4 S2 e D4 S1 f D4 VB S2 Cf c Osub D1 EOM";
const parsed = parseParaff(code);

console.log("Parsed voiceStaff:", parsed?.voiceStaff);
console.log("Parsed staffN:", parsed?.staffN);
console.log("\nVoice 0 notes staff values:");
parsed?.notes[0]?.forEach((note, i) => {
  console.log("  note " + i + ": staff=" + note.staff + ", pname=" + note.pitches[0]?.pname);
});

console.log("\n--- MEI Output (note elements only) ---");
const mei = toMEI(parsed);
const noteLines = mei.split('\n').filter(line => line.includes('<note') || line.includes('<rest') || line.includes('<staff'));
noteLines.forEach(line => console.log(line.trim()));
