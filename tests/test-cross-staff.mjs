import { parseParaff } from '../src/lib/paraff/index.ts';

const code = "BOM K0 TN4 TD4 S1 Cg c D4 d D4 S2 e D4 S1 f D4 VB S2 Cf c Osub D1 EOM";
const parsed = parseParaff(code);

console.log("voiceStaff:", parsed?.voiceStaff);
console.log("staffN:", parsed?.staffN);
console.log("\nVoice 0 notes:");
parsed?.notes[0]?.forEach((note, i) => {
  console.log("  note " + i + ": staff=" + note.staff + ", pname=" + note.pitches[0]?.pname);
});
console.log("\nVoice 1 notes:");
parsed?.notes[1]?.forEach((note, i) => {
  console.log("  note " + i + ": staff=" + note.staff + ", pname=" + note.pitches[0]?.pname);
});
