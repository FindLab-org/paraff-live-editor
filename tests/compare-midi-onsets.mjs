#!/usr/bin/env node

/**
 * Test suite to compare MIDI onsets from Paraff→LilyPond vs Paraff→MEI(Verovio)
 * This verifies that the MEI translation produces the same musical timing as LilyPond
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Test cases from simple to complex
const testCases = [
  {
    name: 'single-note',
    paraff: 'BOM K0 TN4 TD4 S1 Cg c D4 EOM',
    description: 'Single quarter note C'
  },
  {
    name: 'simple-scale',
    paraff: 'BOM K0 TN4 TD4 S1 Cg c D4 d e f EOM',
    description: 'Four quarter notes: C D E F'
  },
  {
    name: 'chord-simple',
    paraff: 'BOM K0 TN4 TD4 S1 Cg c e g D4 EOM',
    description: 'Single chord: C-E-G quarter note'
  },
  {
    name: 'two-voices-same-staff',
    paraff: 'BOM K0 TN4 TD4 S1 Cg c D4 d VB e D4 f EOM',
    description: 'Two voices on same staff'
  },
  {
    name: 'two-staves-different-clefs',
    paraff: 'BOM K0 TN4 TD4 S1 Cg c D4 d VB S2 Cf c D4 Mu b EOM',
    description: 'Two staves: treble C-D, bass C-B'
  },
  {
    name: 'bach-excerpt',
    paraff: 'BOM K1 TN3 TD4 S1 Cg Md d Osup D4 EDp EslurL Mu g Osub D8 Bl a D8 b D8 c D8 Br VB S2 Cf Md g b d D2 a D4 EOM',
    description: 'Bach BWV-114 first measure'
  }
];

const testDir = join(process.cwd(), 'tests', 'midi-comparison');
mkdirSync(testDir, { recursive: true });

// Parse MIDI file to extract note onsets
function parseMidiOnsets(midiPath) {
  try {
    // Use mido or music21 to parse MIDI - for now use a simple approach
    // We'll need to install midi-parser-js or similar
    console.log();
    
    // TODO: Implement MIDI parsing
    // For now, return a placeholder
    return [];
  } catch (error) {
    console.error();
    return null;
  }
}

// Convert Paraff to LilyPond and generate MIDI
function paraffToLilypondMidi(paraff, outputPath) {
  try {
    // TODO: Need to implement or call existing Paraff→LilyPond converter
    console.log();
    return null; // Placeholder
  } catch (error) {
    console.error();
    return null;
  }
}

// Convert Paraff to MEI, then use Verovio to generate MIDI
function paraffToMeiMidi(paraff, outputPath) {
  try {
    // Import our Paraff parser
    // TODO: Need to set up proper ES module import
    console.log();
    return null; // Placeholder
  } catch (error) {
    console.error();
    return null;
  }
}

// Compare two sets of onsets
function compareOnsets(onsets1, onsets2, tolerance = 0.01) {
  if (!onsets1 || !onsets2) return { match: false, details: 'Missing data' };
  
  if (onsets1.length !== onsets2.length) {
    return {
      match: false,
      details: 
    };
  }
  
  const differences = [];
  for (let i = 0; i < onsets1.length; i++) {
    const diff = Math.abs(onsets1[i].time - onsets2[i].time);
    if (diff > tolerance) {
      differences.push({
        index: i,
        onset1: onsets1[i],
        onset2: onsets2[i],
        diff
      });
    }
  }
  
  return {
    match: differences.length === 0,
    differences
  };
}

// Run all tests
async function runTests() {
  console.log('MIDI Onset Comparison Tests\n');
  console.log('Comparing Paraff→LilyPond→MIDI vs Paraff→MEI(Verovio)→MIDI\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log();
    console.log();
    console.log();
    
    const lilypondMidiPath = join(testDir, );
    const meiMidiPath = join(testDir, );
    
    // Generate MIDI from both paths
    const lilypondOnsets = paraffToLilypondMidi(testCase.paraff, lilypondMidiPath);
    const meiOnsets = paraffToMeiMidi(testCase.paraff, meiMidiPath);
    
    // Compare onsets
    const comparison = compareOnsets(lilypondOnsets, meiOnsets);
    
    if (comparison.match) {
      console.log('  ✓ PASSED - Onsets match');
      passed++;
    } else {
      console.log();
      if (comparison.differences) {
        comparison.differences.forEach(d => {
          console.log();
        });
      }
      failed++;
    }
  }
  
  console.log();
}

runTests().catch(console.error);
