/**
 * Comprehensive unit tests for Paraff to MEI translation
 * Tests: notes, chords, rests, accidentals, articulations, dynamics,
 * time signatures, key signatures, dots, ties, beams, grace notes
 */

import { parseParaff, parseParaffScore, toMEI, paraffToMEI } from '../src/lib/paraff/index';

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
	const regex = new RegExp(`${attr}="([^"]*)"`)
	const match = element.match(regex);
	return match ? match[1] : null;
}

describe('Paraff Parser', () => {
	describe('Basic Notes', () => {
		test('single note with duration', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0]).toHaveLength(1);
			expect(result!.notes[0][0].pitches[0].pname).toBe('c');
			expect(result!.notes[0][0].dur).toBe('4');
			expect(result!.notes[0][0].pitches[0].oct).toBe(4);
		});

		test('multiple notes with different durations', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D4 d D8 e D2 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0]).toHaveLength(3);
			expect(result!.notes[0][0].dur).toBe('4');
			expect(result!.notes[0][1].dur).toBe('8');
			expect(result!.notes[0][2].dur).toBe('2');
		});

		test('octave shifts with Osup and Osub', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D4 Osup d D4 Osup e D4 Osub f D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].pitches[0].oct).toBe(4);
			expect(result!.notes[0][1].pitches[0].oct).toBe(5);
			expect(result!.notes[0][2].pitches[0].oct).toBe(6);
			expect(result!.notes[0][3].pitches[0].oct).toBe(5);
		});

		test('uppercase pitch for lower octave', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg C D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].pitches[0].pname).toBe('c');
			expect(result!.notes[0][0].pitches[0].oct).toBe(3); // C = c one octave lower
		});
	});

	describe('Chords', () => {
		test('simple triad chord - c e g', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c e g D4 EOM');
			expect(result).not.toBeNull();
			// Should be 1 note event with 3 pitches (a chord)
			expect(result!.notes[0]).toHaveLength(1);
			expect(result!.notes[0][0].pitches).toHaveLength(3);
			expect(result!.notes[0][0].pitches[0].pname).toBe('c');
			expect(result!.notes[0][0].pitches[1].pname).toBe('e');
			expect(result!.notes[0][0].pitches[2].pname).toBe('g');
		});

		test('chord with accidentals', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c As e g D4 EOM');
			expect(result).not.toBeNull();
			// Should be a chord with c#, e, g
			expect(result!.notes[0]).toHaveLength(1);
			expect(result!.notes[0][0].pitches).toHaveLength(3);
			expect(result!.notes[0][0].pitches[0].accid).toBe('s');
		});

		test('multiple chords in sequence', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c e g D4 d f a D4 EOM');
			expect(result).not.toBeNull();
			// Should be 2 chords: C-E-G and D-F-A
			expect(result!.notes[0]).toHaveLength(2);
			expect(result!.notes[0][0].pitches).toHaveLength(3);
			expect(result!.notes[0][1].pitches).toHaveLength(3);
		});
	});

	describe('Rests', () => {
		test('single rest', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg D4 Rest EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0]).toHaveLength(1);
			expect(result!.notes[0][0].rest).toBe(true);
		});

		test('rest with different duration', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg D2 Rest EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].rest).toBe(true);
			expect(result!.notes[0][0].dur).toBe('2');
		});
	});

	describe('Accidentals', () => {
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

		test('natural accidental', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg f An D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].pitches[0].accid).toBe('n');
		});

		test('double sharp', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c Ass D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].pitches[0].accid).toBe('ss');
		});

		test('double flat', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg b Aff D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].pitches[0].accid).toBe('ff');
		});
	});

	describe('Dots', () => {
		test('single dot', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D2 Dot EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].dots).toBe(1);
		});

		test('double dot', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D2 Dot Dot EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].dots).toBe(2);
		});
	});

	describe('Articulations', () => {
		test('staccato', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c Est D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].staccato).toBe(true);
		});

		test('accent', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c Eac D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].accent).toBe(true);
		});

		test('tenuto', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c Eten D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].tenuto).toBe(true);
		});

		test('marcato', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c Emar D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].marcato).toBe(true);
		});

		test('multiple articulations', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c Est Eac D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].staccato).toBe(true);
			expect(result!.notes[0][0].accent).toBe(true);
		});
	});

	describe('Ties and Slurs', () => {
		test('tie', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c Etie D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].tie).toBe('i');
		});

		test('slur start', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg EslurL c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].slurStart).toBe(true);
		});

		test('slur end', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c EslurR D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].slurEnd).toBe(true);
		});
	});

	describe('Grace Notes', () => {
		test('grace note before main note', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg G d D8 c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].grace).toBe(true);
			expect(result!.notes[0][1].grace).toBeFalsy();
		});
	});

	describe('Key Signatures', () => {
		test('C major (K0)', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.key).toBe(0);
		});

		test('G major (K1)', () => {
			const result = parseParaff('BOM K1 TN4 TD4 S1 Cg c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.key).toBe(1);
		});

		test('D major (K2)', () => {
			const result = parseParaff('BOM K2 TN4 TD4 S1 Cg c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.key).toBe(2);
		});

		test('F major (K_1)', () => {
			const result = parseParaff('BOM K_1 TN4 TD4 S1 Cg c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.key).toBe(-1);
		});

		test('Bb major (K_2)', () => {
			const result = parseParaff('BOM K_2 TN4 TD4 S1 Cg c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.key).toBe(-2);
		});
	});

	describe('Time Signatures', () => {
		test('4/4 time', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.timeNum).toBe(4);
			expect(result!.timeDen).toBe(4);
		});

		test('3/4 time', () => {
			const result = parseParaff('BOM K0 TN3 TD4 S1 Cg c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.timeNum).toBe(3);
			expect(result!.timeDen).toBe(4);
		});

		test('6/8 time', () => {
			const result = parseParaff('BOM K0 TN6 TD8 S1 Cg c D8 EOM');
			expect(result).not.toBeNull();
			expect(result!.timeNum).toBe(6);
			expect(result!.timeDen).toBe(8);
		});

		test('2/2 time', () => {
			const result = parseParaff('BOM K0 TN2 TD2 S1 Cg c D2 EOM');
			expect(result).not.toBeNull();
			expect(result!.timeNum).toBe(2);
			expect(result!.timeDen).toBe(2);
		});
	});

	describe('Clefs', () => {
		test('treble clef (Cg)', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.clef).toBe('Cg');
		});

		test('bass clef (Cf)', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cf c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.clef).toBe('Cf');
		});

		test('alto clef (Cc)', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cc c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.clef).toBe('Cc');
		});
	});

	describe('Stem Direction', () => {
		test('stem up', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg Mu c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].stemDir).toBe('up');
		});

		test('stem down', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg Md c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].stemDir).toBe('down');
		});
	});

	describe('Beams', () => {
		test('beam group', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg Bl c D8 d D8 e D8 f D8 Br EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0][0].beam).toBe('i');
			expect(result!.notes[0][1].beam).toBe('m');
			expect(result!.notes[0][2].beam).toBe('m');
			expect(result!.notes[0][3].beam).toBe('t');
		});
	});

	describe('Tuplets', () => {
		test('triplet - 3 eighth notes in time of 2 (2:3)', () => {
			// W2 means fit into 2 eighth note units - 3 eighth notes in time of 2 (quarter note)
			// Full 4/4 measure: triplet (1 beat) + 3 quarter notes (3 beats)
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c W2 D8 d W D8 e W D8 f D4 g D4 a D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0]).toHaveLength(6);
		});

		test('quadruplet - 4 eighth notes in time of 3 (3:4)', () => {
			// W3 means fit into 3 eighth note units - 4 eighth notes in time of 3
			// 4/4 measure: quadruplet (1.5 beats) + dotted quarter + quarter
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c W3 D8 d W D8 e W D8 f W D8 g D4 Dot a D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes[0]).toHaveLength(6);
		});
	});

	describe('Multiple Voices', () => {
		test('two voices with VB separator', () => {
			const result = parseParaff('BOM K0 TN4 TD4 S1 Cg c D2 VB e D2 EOM');
			expect(result).not.toBeNull();
			expect(result!.notes).toHaveLength(2);
			expect(result!.notes[0][0].pitches[0].pname).toBe('c');
			expect(result!.notes[1][0].pitches[0].pname).toBe('e');
		});
	});

	describe('Multiple Measures', () => {
		test('two measures with context carry-forward', () => {
			const result = parseParaffScore('BOM K2 TN4 TD4 S1 Cg c D4 d D4 e D4 f D4 EOM BOM g D4 a D4 b D4 Osup c D4 EOM');
			expect(result).not.toBeNull();
			expect(result!.measures).toHaveLength(2);
			expect(result!.measures[0].key).toBe(2);
			expect(result!.measures[1].key).toBe(2); // Carried forward
		});
	});
});

describe('MEI Encoder', () => {
	describe('Basic Notes', () => {
		test('single note MEI output', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c D4 EOM');
			expect(mei).not.toBeNull();
			const notes = extractNotes(mei!);
			expect(notes).toHaveLength(1);
			expect(getAttr(notes[0], 'pname')).toBe('c');
			expect(getAttr(notes[0], 'oct')).toBe('4');
			expect(getAttr(notes[0], 'dur')).toBe('4');
		});

		test('note with accidental', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c As D4 EOM');
			expect(mei).not.toBeNull();
			const notes = extractNotes(mei!);
			expect(getAttr(notes[0], 'accid')).toBe('s');
		});

		test('note with dot', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c D2 Dot EOM');
			expect(mei).not.toBeNull();
			const notes = extractNotes(mei!);
			expect(getAttr(notes[0], 'dots')).toBe('1');
		});
	});

	describe('Chords', () => {
		test('chord MEI output - should use <chord> element', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c e g D4 EOM');
			expect(mei).not.toBeNull();

			// CORRECT: Should have 1 chord element containing 3 notes
			const chords = extractChords(mei!);
			expect(chords.length).toBeGreaterThan(0);

			if (chords.length > 0) {
				// Check chord has correct duration
				expect(getAttr(chords[0], 'dur')).toBe('4');

				// Check chord contains 3 notes
				const notesInChord = chords[0].match(/<note[^>]*\/>/g) || [];
				expect(notesInChord).toHaveLength(3);
			}
		});

		test('chord with accidental', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c As e g D4 EOM');
			expect(mei).not.toBeNull();

			// Should have chord with c#, e, g
			const chords = extractChords(mei!);
			if (chords.length > 0) {
				expect(chords[0]).toContain('accid="s"');
			}
		});
	});

	describe('Rests', () => {
		test('rest MEI output', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg D4 Rest EOM');
			expect(mei).not.toBeNull();
			const rests = extractRests(mei!);
			expect(rests).toHaveLength(1);
			expect(getAttr(rests[0], 'dur')).toBe('4');
		});
	});

	describe('Key Signatures', () => {
		test('key signature in scoreDef', () => {
			const mei = paraffToMEI('BOM K2 TN4 TD4 S1 Cg c D4 EOM');
			expect(mei).not.toBeNull();
			expect(mei).toContain('key.sig="2s"');
		});

		test('flat key signature', () => {
			const mei = paraffToMEI('BOM K_3 TN4 TD4 S1 Cg c D4 EOM');
			expect(mei).not.toBeNull();
			expect(mei).toContain('key.sig="3f"');
		});
	});

	describe('Time Signatures', () => {
		test('time signature in scoreDef', () => {
			const mei = paraffToMEI('BOM K0 TN6 TD8 S1 Cg c D8 EOM');
			expect(mei).not.toBeNull();
			expect(mei).toContain('meter.count="6"');
			expect(mei).toContain('meter.unit="8"');
		});
	});

	describe('Clefs', () => {
		test('treble clef in staffDef', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c D4 EOM');
			expect(mei).not.toBeNull();
			expect(mei).toContain('clef.shape="G"');
			expect(mei).toContain('clef.line="2"');
		});

		test('bass clef in staffDef', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cf c D4 EOM');
			expect(mei).not.toBeNull();
			expect(mei).toContain('clef.shape="F"');
			expect(mei).toContain('clef.line="4"');
		});
	});

	describe('Articulations', () => {
		test('articulation in note', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c Est D4 EOM');
			expect(mei).not.toBeNull();
			expect(mei).toContain('artic="stacc"');
		});

		test('multiple articulations', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c Est Eac D4 EOM');
			expect(mei).not.toBeNull();
			// Should contain both articulations
			expect(mei).toMatch(/artic="[^"]*stacc[^"]*"/);
			expect(mei).toMatch(/artic="[^"]*acc[^"]*"/);
		});
	});

	describe('Grace Notes', () => {
		test('grace note attribute', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg G d D8 c D4 EOM');
			expect(mei).not.toBeNull();
			expect(mei).toContain('grace="unacc"');
		});
	});

	describe('Ties', () => {
		test('tie attribute', () => {
			const mei = paraffToMEI('BOM K0 TN4 TD4 S1 Cg c Etie D4 EOM');
			expect(mei).not.toBeNull();
			expect(mei).toContain('tie="i"');
		});
	});
});

// Test runner for Node.js (without Jest)
if (typeof describe === 'undefined') {
	console.log('Running tests without Jest...\n');

	const tests: { name: string; fn: () => void; error?: Error }[] = [];
	let currentSuite = '';

	(global as any).describe = (name: string, fn: () => void) => {
		currentSuite = name;
		fn();
	};

	(global as any).test = (name: string, fn: () => void) => {
		tests.push({ name: `${currentSuite} > ${name}`, fn });
	};

	(global as any).expect = (actual: any) => ({
		toBe: (expected: any) => {
			if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
		},
		toBeNull: () => {
			if (actual !== null) throw new Error(`Expected null, got ${actual}`);
		},
		toBeFalsy: () => {
			if (actual) throw new Error(`Expected falsy, got ${actual}`);
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
	});

	// Run all tests
	let passed = 0;
	let failed = 0;

	for (const t of tests) {
		try {
			t.fn();
			console.log(`✓ ${t.name}`);
			passed++;
		} catch (e) {
			console.log(`✗ ${t.name}`);
			console.log(`  ${(e as Error).message}`);
			failed++;
		}
	}

	console.log(`\n${passed} passed, ${failed} failed`);
}
