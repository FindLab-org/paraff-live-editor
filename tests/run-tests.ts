/**
 * Simple test runner for Paraff MEI tests
 */

import { parseParaff, parseParaffScore, toMEI, paraffToMEI } from '../src/lib/paraff/index.js';

// Helper to extract note elements from MEI
function extractNotes(mei: string): string[] {
	const noteRegex = /<note[^>]*\/>/g;
	return mei.match(noteRegex) || [];
}

// Helper to extract chord elements from MEI
function extractChords(mei: string): string[] {
	const chordRegex = /<chord[^>]*>[\s\S]*?<\/chord>/g;
	return mei.match(chordRegex) || [];
}

// Helper to extract rest elements from MEI
function extractRests(mei: string): string[] {
	const restRegex = /<rest[^>]*\/>/g;
	return mei.match(restRegex) || [];
}

// Helper to get attribute value
function getAttr(element: string, attr: string): string | null {
	const regex = new RegExp(`${attr}="([^"]*)"`);
	const match = element.match(regex);
	return match ? match[1] : null;
}

interface TestResult {
	name: string;
	passed: boolean;
	error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
	try {
		fn();
		results.push({ name, passed: true });
		console.log(`✓ ${name}`);
	} catch (e) {
		results.push({ name, passed: false, error: (e as Error).message });
		console.log(`✗ ${name}`);
		console.log(`  ERROR: ${(e as Error).message}`);
	}
}

function expect(actual: any) {
	return {
		toBe: (expected: any) => {
			if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
		},
		toBeNull: () => {
			if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
		},
		toBeFalsy: () => {
			if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
		},
		toHaveLength: (len: number) => {
			if (actual?.length !== len) throw new Error(`Expected length ${len}, got ${actual?.length}`);
		},
		toContain: (substr: string) => {
			if (!actual?.includes(substr)) throw new Error(`Expected to contain "${substr}"`);
		},
		toMatch: (regex: RegExp) => {
			if (!regex.test(actual)) throw new Error(`Expected to match ${regex}`);
		},
		toBeGreaterThan: (n: number) => {
			if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
		},
		not: {
			toBeNull: () => {
				if (actual === null) throw new Error(`Expected not null`);
			}
		}
	};
}

console.log('=== Paraff to MEI Translation Tests ===\n');

// ============ PARSER TESTS ============
console.log('--- Parser Tests ---\n');

test('single note with duration', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0]).toHaveLength(1);
	expect(result!.notes[0][0].pitches[0].pname).toBe('c');
	expect(result!.notes[0][0].dur).toBe('4');
});

test('multiple notes with different durations', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D4 d D8 e D2 EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0]).toHaveLength(3);
	expect(result!.notes[0][0].dur).toBe('4');
	expect(result!.notes[0][1].dur).toBe('8');
	expect(result!.notes[0][2].dur).toBe('2');
});

test('octave shifts', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D4 Osup d D4 Osup e D4 Osub f D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0][0].pitches[0].oct).toBe(4);
	expect(result!.notes[0][1].pitches[0].oct).toBe(5);
	expect(result!.notes[0][2].pitches[0].oct).toBe(6);
	expect(result!.notes[0][3].pitches[0].oct).toBe(5);
});

test('sharp accidental', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c As D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0][0].pitches[0].accid).toBe('s');
});

test('flat accidental', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg b Af D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0][0].pitches[0].accid).toBe('f');
});

test('dotted note', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D2 Dot EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0][0].dots).toBe(1);
});

test('rest', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg D4 Rest EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0][0].rest).toBe(true);
});

test('staccato articulation', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c Est D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0][0].staccato).toBe(true);
});

test('tie', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c Etie D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0][0].tie).toBe('i');
});

test('grace note', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg G d D8 c D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0][0].grace).toBe(true);
	expect(result!.notes[0][1].grace).toBeFalsy();
});

test('key signature K2', () => {
	const result = parseParaff('BOM K2 TN4 TD4 S1 Cg c D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.key).toBe(2);
});

test('flat key signature K_3', () => {
	const result = parseParaff('BOM K_3 TN4 TD4 S1 Cg c D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.key).toBe(-3);
});

test('time signature 6/8', () => {
	const result = parseParaff('BOM K0 TN6 TD8 S1 Cg c D8 EOM');
	expect(result).not.toBeNull();
	expect(result!.timeNum).toBe(6);
	expect(result!.timeDen).toBe(8);
});

test('bass clef', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cf c D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.clef).toBe('Cf');
});

test('stem direction up', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg Mu c D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.notes[0][0].stemDir).toBe('up');
});

test('two voices', () => {
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D2 VB e D2 EOM');
	expect(result).not.toBeNull();
	expect(result!.notes).toHaveLength(2);
});

test('multiple measures', () => {
	const result = parseParaffScore('BOM K2 TN4 TD4 S1 Cg c D4 EOM BOM d D4 EOM');
	expect(result).not.toBeNull();
	expect(result!.measures).toHaveLength(2);
	expect(result!.measures[1].key).toBe(2); // Carried forward
});

// ============ CHORD TESTS (Expected to fail with current implementation) ============
console.log('\n--- Chord Tests (CRITICAL) ---\n');

test('CHORD: c-e-g triad should be parsed as chord', () => {
	// In Paraff: multiple pitches followed by duration = chord
	const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c e g D4 EOM');
	expect(result).not.toBeNull();

	// Should be 1 note event with 3 pitches (a chord)
	expect(result!.notes[0]).toHaveLength(1);
	expect(result!.notes[0][0].pitches).toHaveLength(3);
	expect(result!.notes[0][0].pitches[0].pname).toBe('c');
	expect(result!.notes[0][0].pitches[1].pname).toBe('e');
	expect(result!.notes[0][0].pitches[2].pname).toBe('g');
	expect(result!.notes[0][0].dur).toBe('4');
});

test('CHORD: MEI should output <chord> element', () => {
	const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c e g D4 EOM');
	expect(mei).not.toBeNull();

	const chords = extractChords(mei!);
	expect(chords).toHaveLength(1);

	// Check chord has correct duration
	expect(mei).toContain('<chord');
	expect(mei).toContain('dur="4"');

	// Check chord contains 3 notes (c, e, g)
	const notesInChord = chords[0].match(/<note[^>]*\/>/g) || [];
	expect(notesInChord).toHaveLength(3);
});

// ============ MEI OUTPUT TESTS ============
console.log('\n--- MEI Output Tests ---\n');

test('MEI: single note output', () => {
	const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c D4 EOM');
	expect(mei).not.toBeNull();
	const notes = extractNotes(mei!);
	expect(notes).toHaveLength(1);
	expect(getAttr(notes[0], 'pname')).toBe('c');
	expect(getAttr(notes[0], 'dur')).toBe('4');
});

test('MEI: accidental attribute', () => {
	const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c As D4 EOM');
	expect(mei).not.toBeNull();
	expect(mei).toContain('accid="s"');
});

test('MEI: dotted note', () => {
	const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c D2 Dot EOM');
	expect(mei).not.toBeNull();
	expect(mei).toContain('dots="1"');
});

test('MEI: rest element', () => {
	const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg D4 Rest EOM');
	expect(mei).not.toBeNull();
	const rests = extractRests(mei!);
	expect(rests).toHaveLength(1);
});

test('MEI: key signature', () => {
	const mei = paraffToMEI('BOM K2 TN4 TD4 S1 Cg c D4 EOM');
	expect(mei).not.toBeNull();
	expect(mei).toContain('key.sig="2s"');
});

test('MEI: flat key signature', () => {
	const mei = paraffToMEI('BOM K_3 TN4 TD4 S1 Cg c D4 EOM');
	expect(mei).not.toBeNull();
	expect(mei).toContain('key.sig="3f"');
});

test('MEI: time signature', () => {
	const mei = paraffToMEI('BOM K0 TN6 TD8 S1 Cg c D8 EOM');
	expect(mei).not.toBeNull();
	expect(mei).toContain('meter.count="6"');
	expect(mei).toContain('meter.unit="8"');
});

test('MEI: treble clef', () => {
	const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c D4 EOM');
	expect(mei).not.toBeNull();
	expect(mei).toContain('clef.shape="G"');
});

test('MEI: bass clef', () => {
	const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cf c D4 EOM');
	expect(mei).not.toBeNull();
	expect(mei).toContain('clef.shape="F"');
});

test('MEI: staccato articulation', () => {
	const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c Est D4 EOM');
	expect(mei).not.toBeNull();
	expect(mei).toContain('artic="stacc"');
});

test('MEI: grace note attribute', () => {
	const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg G d D8 c D4 EOM');
	expect(mei).not.toBeNull();
	expect(mei).toContain('grace="unacc"');
});

test('MEI: tie attribute', () => {
	const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c Etie D4 EOM');
	expect(mei).not.toBeNull();
	expect(mei).toContain('tie="i"');
});

// ============ SUMMARY ============
console.log('\n=== Test Summary ===\n');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

console.log(`Total: ${results.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
	console.log('\nFailed tests:');
	results.filter(r => !r.passed).forEach(r => {
		console.log(`  - ${r.name}: ${r.error}`);
	});
}

process.exit(failed > 0 ? 1 : 0);
