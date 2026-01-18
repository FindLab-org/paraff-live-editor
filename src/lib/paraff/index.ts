// Paraff parser and MEI encoder
// Browser-compatible version with comprehensive token support

// Token definitions
const KEYS: Record<number, string> = {
	0: '0',
	1: '1s',
	2: '2s',
	3: '3s',
	4: '4s',
	5: '5s',
	6: '6s',
	[-1]: '1f',
	[-2]: '2f',
	[-3]: '3f',
	[-4]: '4f',
	[-5]: '5f',
	[-6]: '6f'
};

const CLEF_SHAPES: Record<string, { shape: string; line: number }> = {
	Cg: { shape: 'G', line: 2 },
	Cf: { shape: 'F', line: 4 },
	Cc: { shape: 'C', line: 3 }
};

const DURATION_VALUES: Record<number, string> = {
	1: '1',
	2: '2',
	4: '4',
	8: '8',
	16: '16',
	32: '32',
	64: '64'
};

const PITCH_NAMES = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];

// Accidental mappings
const ACCIDENTALS: Record<string, string> = {
	As: 's',     // sharp
	Af: 'f',     // flat
	An: 'n',     // natural
	Ass: 'ss',   // double sharp
	Aff: 'ff'    // double flat
};

// Expressive marks that create MEI elements
const EXPRESSIVE_MARKS = [
	'EslurL', 'EslurR', 'Etie', 'Earp', 'Etr', 'Efer', 'Esf',
	'Est', 'Estm', 'Eac', 'Emor', 'Epr', 'Eturn', 'Epor', 'Eten', 'Emar',
	'Ecre', 'Edim', 'Ecds',
	'EDf', 'EDp', 'EDm', 'EDr', 'EDs', 'EDz',
	'EsusOn', 'EsusOff'
];

interface ParsedPitch {
	pname: string;
	oct: number;
	accid?: string;
}

interface ParsedNote {
	pitches: ParsedPitch[];  // Single note has 1 pitch, chord has multiple
	dur: string;
	rest?: boolean;
	dots?: number;
	grace?: boolean;
	tie?: 'i' | 'm' | 't';  // initial, medial, terminal
	beam?: 'i' | 'm' | 't'; // initial, medial, terminal
	stemDir?: 'up' | 'down';
	artic?: string[];       // articulations
	slurStart?: boolean;
	slurEnd?: boolean;
	fermata?: boolean;
	trill?: boolean;
	staccato?: boolean;
	accent?: boolean;
	tenuto?: boolean;
	marcato?: boolean;
}

// Legacy interface for backward compatibility
interface LegacyNote {
	pname: string;
	oct: number;
	dur: string;
	accid?: string;
	rest?: boolean;
	dots?: number;
	grace?: boolean;
	tie?: 'i' | 'm' | 't';
	beam?: 'i' | 'm' | 't';
	stemDir?: 'up' | 'down';
	slurStart?: boolean;
	slurEnd?: boolean;
	fermata?: boolean;
	trill?: boolean;
	staccato?: boolean;
	accent?: boolean;
	tenuto?: boolean;
	marcato?: boolean;
}

interface ParsedMeasure {
	key: number;
	timeNum: number;
	timeDen: number;
	clef: string;
	staffN: number;
	notes: ParsedNote[][];
	dynamics?: { type: string; voiceIdx: number; noteIdx: number }[];
	// Multi-staff support
	staffClefs: Record<number, string>;  // staff number -> clef
	voiceStaff: number[];                 // voice index -> staff number
}

interface ParsedScore {
	measures: ParsedMeasure[];
}

function parseKey(token: string): number | null {
	const match = token.match(/^K(-?\d+)$/);
	if (match) return parseInt(match[1]);
	if (token.startsWith('K_')) return -parseInt(token.slice(2));
	return null;
}

function parseTimeNum(token: string): number | null {
	const match = token.match(/^TN(\d+)$/);
	return match ? parseInt(match[1]) : null;
}

function parseTimeDen(token: string): number | null {
	const match = token.match(/^TD(\d+)$/);
	return match ? parseInt(match[1]) : null;
}

function parseStaff(token: string): number | null {
	const match = token.match(/^S(\d+)$/);
	return match ? parseInt(match[1]) : null;
}

function parseDuration(token: string): number | null {
	const match = token.match(/^D(\d+)$/);
	if (!match) return null;
	return parseInt(match[1]);
}

function parsePitch(token: string): { pname: string; octShift: number } | null {
	const lower = token.toLowerCase();
	if (PITCH_NAMES.includes(lower)) {
		const isUpper = token === token.toUpperCase();
		return {
			pname: lower,
			octShift: isUpper ? -1 : 0
		};
	}
	return null;
}

// Parse a single measure from tokens
function parseMeasure(tokens: string[], startKey: number, startTimeNum: number, startTimeDen: number, startClef: string): ParsedMeasure {
	const measure: ParsedMeasure = {
		key: startKey,
		timeNum: startTimeNum,
		timeDen: startTimeDen,
		clef: startClef,
		staffN: 1,
		notes: [[]],
		dynamics: [],
		staffClefs: { 1: startClef },  // Initialize with default clef for staff 1
		voiceStaff: [1]                 // Voice 0 starts on staff 1
	};

	let currentVoice = 0;
	let currentStaff = 1;  // Track current staff number
	let currentOct = 4;
	let lastDur = 4; // last used duration (for notes without explicit duration)
	let isGrace = false;
	let pendingBeam: 'i' | 'm' | null = null;
	let pendingSlurStart = false;
	let pendingStemDir: 'up' | 'down' | undefined = undefined;

	// Pending pitches for chord building
	let pendingPitches: ParsedPitch[] = [];
	let pendingModifiers: {
		staccato?: boolean;
		accent?: boolean;
		tenuto?: boolean;
		marcato?: boolean;
		tie?: 'i' | 'm' | 't';
		fermata?: boolean;
		trill?: boolean;
		slurEnd?: boolean;
	} = {};

	// Finalize pending pitches into a note/chord
	function finalizePendingPitches(dur: number) {
		if (pendingPitches.length === 0) return;

		const note: ParsedNote = {
			pitches: [...pendingPitches],
			dur: DURATION_VALUES[dur] || '4',
			grace: isGrace,
			stemDir: pendingStemDir,
			...pendingModifiers
		};

		if (pendingBeam === 'i') {
			note.beam = 'i';
			pendingBeam = 'm';
		} else if (pendingBeam === 'm') {
			note.beam = 'm';
		}

		if (pendingSlurStart) {
			note.slurStart = true;
			pendingSlurStart = false;
		}

		measure.notes[currentVoice].push(note);

		// Reset pending state
		pendingPitches = [];
		pendingModifiers = {};
		isGrace = false;
		lastDur = dur;
	}

	for (const token of tokens) {
		// Key signature
		const key = parseKey(token);
		if (key !== null) {
			measure.key = key;
			continue;
		}

		// Time signature
		const timeNum = parseTimeNum(token);
		if (timeNum !== null) {
			measure.timeNum = timeNum;
			continue;
		}

		const timeDen = parseTimeDen(token);
		if (timeDen !== null) {
			measure.timeDen = timeDen;
			continue;
		}

		// Staff
		const staff = parseStaff(token);
		if (staff !== null) {
			currentStaff = staff;
			measure.staffN = Math.max(measure.staffN, staff);
			// Update current voice's staff assignment
			measure.voiceStaff[currentVoice] = staff;
			continue;
		}

		// Clef - associate with current staff
		if (token in CLEF_SHAPES) {
			measure.clef = token;
			measure.staffClefs[currentStaff] = token;
			continue;
		}

		// Octave shifts - apply to pending pitches or current octave
		if (token === 'Osup') {
			if (pendingPitches.length > 0) {
				// Apply to last pending pitch
				pendingPitches[pendingPitches.length - 1].oct++;
			} else {
				currentOct++;
			}
			continue;
		}
		if (token === 'Osub') {
			if (pendingPitches.length > 0) {
				// Apply to last pending pitch
				pendingPitches[pendingPitches.length - 1].oct--;
			} else {
				currentOct--;
			}
			continue;
		}

		// Ottava marks
		if (token === 'Ova' || token === 'Ovb' || token === 'O0') {
			continue;
		}

		// Voice break - finalize any pending pitches first
		if (token === 'VB') {
			finalizePendingPitches(lastDur);
			currentVoice++;
			measure.notes[currentVoice] = [];
			// New voice inherits current staff until S# is seen
			measure.voiceStaff[currentVoice] = currentStaff;
			currentOct = 4;
			isGrace = false;
			pendingBeam = null;
			pendingSlurStart = false;
			continue;
		}

		// Duration - finalize pending pitches with this duration
		const dur = parseDuration(token);
		if (dur !== null) {
			finalizePendingPitches(dur);
			continue;
		}

		// Rest - finalize any pending pitches first
		if (token === 'Rest' || token === 'RSpace') {
			finalizePendingPitches(lastDur);
			const restNote: ParsedNote = {
				pitches: [{ pname: 'c', oct: currentOct }],
				dur: DURATION_VALUES[lastDur] || '4',
				rest: true,
				grace: isGrace,
				stemDir: pendingStemDir
			};
			measure.notes[currentVoice].push(restNote);
			isGrace = false;
			continue;
		}

		// Beam tokens
		if (token === 'Bl') {
			pendingBeam = 'i';
			continue;
		}
		if (token === 'Bm') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].beam = 'm';
			}
			pendingBeam = 'm';
			continue;
		}
		if (token === 'Br') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].beam = 't';
			}
			pendingBeam = null;
			continue;
		}

		// Stem direction
		if (token === 'Mu') {
			pendingStemDir = 'up';
			continue;
		}
		if (token === 'Md') {
			pendingStemDir = 'down';
			continue;
		}

		// Dots - apply to last finalized note
		if (token === 'Dot') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				const note = voice[voice.length - 1];
				note.dots = (note.dots || 0) + 1;
			}
			continue;
		}

		// Grace notes
		if (token === 'G') {
			isGrace = true;
			continue;
		}

		// Accidentals - apply to last pending pitch
		if (token in ACCIDENTALS) {
			if (pendingPitches.length > 0) {
				pendingPitches[pendingPitches.length - 1].accid = ACCIDENTALS[token];
			}
			continue;
		}

		// Expressive marks - store for pending note
		if (token === 'EslurL') {
			pendingSlurStart = true;
			continue;
		}
		if (token === 'EslurR') {
			if (pendingPitches.length > 0) {
				pendingModifiers.slurEnd = true;
			} else {
				const voice = measure.notes[currentVoice];
				if (voice.length > 0) {
					voice[voice.length - 1].slurEnd = true;
				}
			}
			continue;
		}
		if (token === 'Etie') {
			if (pendingPitches.length > 0) {
				pendingModifiers.tie = 'i';
			} else {
				const voice = measure.notes[currentVoice];
				if (voice.length > 0) {
					voice[voice.length - 1].tie = 'i';
				}
			}
			continue;
		}
		if (token === 'Efer') {
			if (pendingPitches.length > 0) {
				pendingModifiers.fermata = true;
			} else {
				const voice = measure.notes[currentVoice];
				if (voice.length > 0) {
					voice[voice.length - 1].fermata = true;
				}
			}
			continue;
		}
		if (token === 'Etr') {
			if (pendingPitches.length > 0) {
				pendingModifiers.trill = true;
			} else {
				const voice = measure.notes[currentVoice];
				if (voice.length > 0) {
					voice[voice.length - 1].trill = true;
				}
			}
			continue;
		}
		if (token === 'Est') {
			if (pendingPitches.length > 0) {
				pendingModifiers.staccato = true;
			} else {
				const voice = measure.notes[currentVoice];
				if (voice.length > 0) {
					voice[voice.length - 1].staccato = true;
				}
			}
			continue;
		}
		if (token === 'Eac') {
			if (pendingPitches.length > 0) {
				pendingModifiers.accent = true;
			} else {
				const voice = measure.notes[currentVoice];
				if (voice.length > 0) {
					voice[voice.length - 1].accent = true;
				}
			}
			continue;
		}
		if (token === 'Eten') {
			if (pendingPitches.length > 0) {
				pendingModifiers.tenuto = true;
			} else {
				const voice = measure.notes[currentVoice];
				if (voice.length > 0) {
					voice[voice.length - 1].tenuto = true;
				}
			}
			continue;
		}
		if (token === 'Emar') {
			if (pendingPitches.length > 0) {
				pendingModifiers.marcato = true;
			} else {
				const voice = measure.notes[currentVoice];
				if (voice.length > 0) {
					voice[voice.length - 1].marcato = true;
				}
			}
			continue;
		}

		// Dynamics
		if (token.startsWith('ED')) {
			const dynType = token.slice(2);
			measure.dynamics!.push({
				type: dynType,
				voiceIdx: currentVoice,
				noteIdx: measure.notes[currentVoice].length
			});
			continue;
		}

		// Pitch - add to pending pitches
		const pitch = parsePitch(token);
		if (pitch) {
			pendingPitches.push({
				pname: pitch.pname,
				oct: currentOct + pitch.octShift
			});
			continue;
		}

		// Tremolo (Tr1, Tr2, etc.) - just consume
		if (/^Tr\d+$/.test(token)) {
			continue;
		}

		// Other expressive marks - consume
		if (EXPRESSIVE_MARKS.includes(token)) {
			continue;
		}
	}

	// Finalize any remaining pending pitches at end of measure
	finalizePendingPitches(lastDur);

	return measure;
}

export function parseParaff(code: string): ParsedMeasure | null {
	const tokens = code.trim().split(/\s+/);

	// Handle BOS/EOS wrapper if present
	let startIdx = 0;
	let endIdx = tokens.length;

	if (tokens[0] === 'BOS') startIdx = 1;
	if (tokens[tokens.length - 1] === 'EOS') endIdx = tokens.length - 1;

	// Find measure boundaries
	const measureTokens: string[][] = [];
	let currentMeasureTokens: string[] = [];
	let inMeasure = false;

	for (let i = startIdx; i < endIdx; i++) {
		const token = tokens[i];
		if (token === 'BOM') {
			inMeasure = true;
			currentMeasureTokens = [];
		} else if (token === 'EOM') {
			if (inMeasure) {
				measureTokens.push(currentMeasureTokens);
				inMeasure = false;
			}
		} else if (inMeasure) {
			currentMeasureTokens.push(token);
		}
	}

	if (measureTokens.length === 0) {
		return null;
	}

	// Parse first measure (for backward compatibility)
	return parseMeasure(measureTokens[0], 0, 4, 4, 'Cg');
}

export function parseParaffScore(code: string): ParsedScore | null {
	const tokens = code.trim().split(/\s+/);

	// Handle BOS/EOS wrapper if present
	let startIdx = 0;
	let endIdx = tokens.length;

	if (tokens[0] === 'BOS') startIdx = 1;
	if (tokens[tokens.length - 1] === 'EOS') endIdx = tokens.length - 1;

	// Find measure boundaries
	const measureTokens: string[][] = [];
	let currentMeasureTokens: string[] = [];
	let inMeasure = false;

	for (let i = startIdx; i < endIdx; i++) {
		const token = tokens[i];
		if (token === 'BOM') {
			inMeasure = true;
			currentMeasureTokens = [];
		} else if (token === 'EOM') {
			if (inMeasure) {
				measureTokens.push(currentMeasureTokens);
				inMeasure = false;
			}
		} else if (inMeasure) {
			currentMeasureTokens.push(token);
		}
	}

	if (measureTokens.length === 0) {
		return null;
	}

	// Parse all measures, carrying context forward
	const measures: ParsedMeasure[] = [];
	let currentKey = 0;
	let currentTimeNum = 4;
	let currentTimeDen = 4;
	let currentClef = 'Cg';

	for (const mTokens of measureTokens) {
		const measure = parseMeasure(mTokens, currentKey, currentTimeNum, currentTimeDen, currentClef);
		measures.push(measure);

		// Carry context forward
		currentKey = measure.key;
		currentTimeNum = measure.timeNum;
		currentTimeDen = measure.timeDen;
		currentClef = measure.clef;
	}

	return { measures };
}

let idCounter = 0;

function generateId(prefix: string): string {
	return `${prefix}-${String(++idCounter).padStart(10, '0')}`;
}

// Helper to build a single note element
function buildNoteElement(pitch: ParsedPitch, dur: string, note: ParsedNote, indent: string, inChord: boolean): string {
	let attrs = `xml:id="${generateId('note')}" pname="${pitch.pname}" oct="${pitch.oct}"`;
	if (!inChord) {
		attrs += ` dur="${dur}"`;
	}
	if (pitch.accid) attrs += ` accid="${pitch.accid}"`;
	if (!inChord && note.dots) attrs += ` dots="${note.dots}"`;
	if (!inChord && note.grace) attrs += ` grace="unacc"`;
	if (!inChord && note.tie) attrs += ` tie="${note.tie}"`;
	if (!inChord && note.stemDir) attrs += ` stem.dir="${note.stemDir}"`;

	// Check if we need child elements (only for non-chord notes)
	const hasChildren = !inChord && (note.fermata || note.trill || note.staccato || note.accent || note.tenuto || note.marcato);

	if (!hasChildren) {
		return `${indent}<note ${attrs} />\n`;
	}

	// Note with children
	let result = `${indent}<note ${attrs}>\n`;

	// Articulations
	const artics: string[] = [];
	if (note.staccato) artics.push('stacc');
	if (note.accent) artics.push('acc');
	if (note.tenuto) artics.push('ten');
	if (note.marcato) artics.push('marc');

	if (artics.length > 0) {
		result += `${indent}    <artic artic="${artics.join(' ')}" />\n`;
	}

	result += `${indent}</note>\n`;

	return result;
}

function noteToMEI(note: ParsedNote, indent: string): string {
	if (note.rest) {
		let attrs = `xml:id="${generateId('rest')}" dur="${note.dur}"`;
		if (note.dots) attrs += ` dots="${note.dots}"`;
		return `${indent}<rest ${attrs} />\n`;
	}

	// Single note
	if (note.pitches.length === 1) {
		return buildNoteElement(note.pitches[0], note.dur, note, indent, false);
	}

	// Chord - multiple pitches
	let chordAttrs = `xml:id="${generateId('chord')}" dur="${note.dur}"`;
	if (note.dots) chordAttrs += ` dots="${note.dots}"`;
	if (note.grace) chordAttrs += ` grace="unacc"`;
	if (note.tie) chordAttrs += ` tie="${note.tie}"`;
	if (note.stemDir) chordAttrs += ` stem.dir="${note.stemDir}"`;

	let result = `${indent}<chord ${chordAttrs}>\n`;

	// Add each note in the chord
	for (const pitch of note.pitches) {
		result += buildNoteElement(pitch, note.dur, note, indent + '    ', true);
	}

	// Articulations at chord level
	const artics: string[] = [];
	if (note.staccato) artics.push('stacc');
	if (note.accent) artics.push('acc');
	if (note.tenuto) artics.push('ten');
	if (note.marcato) artics.push('marc');

	if (artics.length > 0) {
		result += `${indent}    <artic artic="${artics.join(' ')}" />\n`;
	}

	result += `${indent}</chord>\n`;

	return result;
}

export function toMEI(measure: ParsedMeasure): string {
	idCounter = 0;

	const keySig = KEYS[measure.key] || '0';

	// Build staffDef elements for all staves
	let staffDefs = '';
	for (let s = 1; s <= measure.staffN; s++) {
		const clef = measure.staffClefs[s] || 'Cg';
		const clefInfo = CLEF_SHAPES[clef] || CLEF_SHAPES['Cg'];
		staffDefs += `                            <staffDef xml:id="${generateId('staffdef')}" n="${s}" lines="5" clef.shape="${clefInfo.shape}" clef.line="${clefInfo.line}" />\n`;
	}

	let mei = `<?xml version="1.0" encoding="UTF-8"?>
<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0">
    <meiHead>
        <fileDesc>
            <titleStmt>
                <title>Paraff Live Editor</title>
            </titleStmt>
            <pubStmt />
        </fileDesc>
    </meiHead>
    <music>
        <body>
            <mdiv xml:id="${generateId('mdiv')}">
                <score xml:id="${generateId('score')}">
                    <scoreDef xml:id="${generateId('scoredef')}" key.sig="${keySig}" meter.count="${measure.timeNum}" meter.unit="${measure.timeDen}">
                        <staffGrp xml:id="${generateId('staffgrp')}">
${staffDefs}                        </staffGrp>
                    </scoreDef>
                    <section xml:id="${generateId('section')}">
                        <measure xml:id="${generateId('measure')}" n="1">
`;

	const indent = '                                    ';

	// Group voices by staff
	const voicesByStaff: Record<number, { voiceIdx: number; notes: ParsedNote[] }[]> = {};

	measure.notes.forEach((voice, vi) => {
		const staffNum = measure.voiceStaff[vi] || 1;
		if (!voicesByStaff[staffNum]) {
			voicesByStaff[staffNum] = [];
		}
		voicesByStaff[staffNum].push({ voiceIdx: vi, notes: voice });
	});

	// Output staff elements in order
	for (let s = 1; s <= measure.staffN; s++) {
		mei += `                            <staff xml:id="${generateId('staff')}" n="${s}">\n`;

		const voices = voicesByStaff[s] || [];
		voices.forEach((v, layerIdx) => {
			mei += `                                <layer xml:id="${generateId('layer')}" n="${layerIdx + 1}">\n`;

			v.notes.forEach((note) => {
				mei += noteToMEI(note, indent);
			});

			mei += `                                </layer>\n`;
		});

		// If no voices for this staff, add an empty layer
		if (voices.length === 0) {
			mei += `                                <layer xml:id="${generateId('layer')}" n="1" />\n`;
		}

		mei += `                            </staff>\n`;
	}

	mei += `                        </measure>
                    </section>
                </score>
            </mdiv>
        </body>
    </music>
</mei>`;

	return mei;
}

export function scoreToMEI(score: ParsedScore): string {
	idCounter = 0;

	if (score.measures.length === 0) return '';

	const firstMeasure = score.measures[0];
	const keySig = KEYS[firstMeasure.key] || '0';

	// Determine max staff count across all measures
	let maxStaffN = 1;
	const staffClefs: Record<number, string> = { 1: firstMeasure.clef };

	for (const measure of score.measures) {
		maxStaffN = Math.max(maxStaffN, measure.staffN);
		// Collect clefs from each staff
		for (const [staffNum, clef] of Object.entries(measure.staffClefs)) {
			const sn = parseInt(staffNum);
			if (!staffClefs[sn]) {
				staffClefs[sn] = clef;
			}
		}
	}

	// Build staffDef elements
	let staffDefs = '';
	for (let s = 1; s <= maxStaffN; s++) {
		const clef = staffClefs[s] || 'Cg';
		const clefInfo = CLEF_SHAPES[clef] || CLEF_SHAPES['Cg'];
		staffDefs += `                            <staffDef xml:id="${generateId('staffdef')}" n="${s}" lines="5" clef.shape="${clefInfo.shape}" clef.line="${clefInfo.line}" />\n`;
	}

	let mei = `<?xml version="1.0" encoding="UTF-8"?>
<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.0">
    <meiHead>
        <fileDesc>
            <titleStmt>
                <title>Paraff Live Editor</title>
            </titleStmt>
            <pubStmt />
        </fileDesc>
    </meiHead>
    <music>
        <body>
            <mdiv xml:id="${generateId('mdiv')}">
                <score xml:id="${generateId('score')}">
                    <scoreDef xml:id="${generateId('scoredef')}" key.sig="${keySig}" meter.count="${firstMeasure.timeNum}" meter.unit="${firstMeasure.timeDen}">
                        <staffGrp xml:id="${generateId('staffgrp')}">
${staffDefs}                        </staffGrp>
                    </scoreDef>
                    <section xml:id="${generateId('section')}">
`;

	const indent = '                                    ';

	score.measures.forEach((measure, mi) => {
		mei += `                        <measure xml:id="${generateId('measure')}" n="${mi + 1}">\n`;

		// Group voices by staff
		const voicesByStaff: Record<number, { voiceIdx: number; notes: ParsedNote[] }[]> = {};

		measure.notes.forEach((voice, vi) => {
			const staffNum = measure.voiceStaff[vi] || 1;
			if (!voicesByStaff[staffNum]) {
				voicesByStaff[staffNum] = [];
			}
			voicesByStaff[staffNum].push({ voiceIdx: vi, notes: voice });
		});

		// Output staff elements in order
		for (let s = 1; s <= maxStaffN; s++) {
			mei += `                            <staff xml:id="${generateId('staff')}" n="${s}">\n`;

			const voices = voicesByStaff[s] || [];
			voices.forEach((v, layerIdx) => {
				mei += `                                <layer xml:id="${generateId('layer')}" n="${layerIdx + 1}">\n`;

				v.notes.forEach((note) => {
					mei += noteToMEI(note, indent);
				});

				mei += `                                </layer>\n`;
			});

			// If no voices for this staff, add an empty layer
			if (voices.length === 0) {
				mei += `                                <layer xml:id="${generateId('layer')}" n="1" />\n`;
			}

			mei += `                            </staff>\n`;
		}

		mei += `                        </measure>\n`;
	});

	mei += `                    </section>
                </score>
            </mdiv>
        </body>
    </music>
</mei>`;

	return mei;
}

export function paraffToMEI(code: string): string | null {
	// Try to parse as a full score first
	const score = parseParaffScore(code);
	if (score && score.measures.length > 1) {
		return scoreToMEI(score);
	}

	// Fall back to single measure parsing
	const parsed = parseParaff(code);
	if (!parsed) return null;
	return toMEI(parsed);
}

// Export types for external use
export type { ParsedNote, ParsedMeasure, ParsedScore };
