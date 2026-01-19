import { paraffToMEI } from '@k-l-lambda/paraff/browser';

const chordCode = 'BOM K0 TN4 TD4 S1 Cg c e g D4 EOM';
const mei = paraffToMEI(chordCode);

console.log('Input:', chordCode);
console.log('\nMEI Output:');
console.log(mei);

console.log('\nHas <chord> element:', mei.includes('<chord'));
