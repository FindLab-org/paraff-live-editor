import { parseParaff, toMEI } from "../src/lib/paraff/index.ts";

// Test: P3 features - arpeggio, ornaments, sforzando, articulations
const code = "BOM K0 TN4 TD4 S1 Cg Earp c e g D4 Eturn d D4 Emor e D4 Esf f D4 Estm g D4 Epor a D4 EOM";
const parsed = parseParaff(code);

console.log("=== P3 Features Test ===");
console.log("Paraff code:", code);
console.log("Notes parsed:", parsed.notes[0].length);

console.log("--- Parsed Properties ---");
parsed.notes[0].forEach((note, i) => {
  const props = [];
  if (note.arpeggio) props.push("arpeggio");
  if (note.turn) props.push("turn");
  if (note.mordent) props.push("mordent");
  if (note.sforzando) props.push("sforzando");
  if (note.staccatissimo) props.push("staccatissimo");
  if (note.portato) props.push("portato");
  console.log(`  Note ${i}: ${note.pitches.map(p => p.pname).join("-")} - ${props.join(", ") || "none"}`);
});

console.log("--- MEI Output ---");
const mei = toMEI(parsed);

const hasArpeg = mei.includes("<arpeg");
const hasTurn = mei.includes("<turn");
const hasMordent = mei.includes("<mordent");
const hasSforzando = mei.includes(">sf</dynam>");
const hasStaccatissimo = mei.includes("staccatissimo");
const hasPortato = mei.includes("ten-stacc");

console.log("Has <arpeg>:", hasArpeg ? "✓" : "✗");
console.log("Has <turn>:", hasTurn ? "✓" : "✗");
console.log("Has <mordent>:", hasMordent ? "✓" : "✗");
console.log("Has sforzando:", hasSforzando ? "✓" : "✗");
console.log("Has staccatissimo:", hasStaccatissimo ? "✓" : "✗");
console.log("Has portato:", hasPortato ? "✓" : "✗");

const allPass = hasArpeg && hasTurn && hasMordent && hasSforzando && hasStaccatissimo && hasPortato;

if (allPass) {
  console.log("✓ All P3 features working correctly!");
} else {
  console.log("✗ Some P3 features failed!");
  process.exit(1);
}
