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

interface ParsedNote {
	pname: string;
	oct: number;
	dur: string;
	accid?: string;
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

interface ParsedMeasure {
	key: number;
	timeNum: number;
	timeDen: number;
	clef: string;
	staffN: number;
	notes: ParsedNote[][];
	dynamics?: { type: string; voiceIdx: number; noteIdx: number }[];
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
		dynamics: []
	};

	let currentVoice = 0;
	let currentOct = 4;
	let currentDur = 4; // quarter note
	let isGrace = false;
	let pendingBeam: 'i' | 'm' | null = null;
	let pendingSlurStart = false;
	let pendingStemDir: 'up' | 'down' | undefined = undefined;

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
			measure.staffN = Math.max(measure.staffN, staff);
			continue;
		}

		// Clef
		if (token in CLEF_SHAPES) {
			measure.clef = token;
			continue;
		}

		// Octave shifts
		if (token === 'Osup') {
			currentOct++;
			continue;
		}
		if (token === 'Osub') {
			currentOct--;
			continue;
		}

		// Ottava marks
		if (token === 'Ova' || token === 'Ovb' || token === 'O0') {
			// Ottava marks - handled in rendering
			continue;
		}

		// Voice break
		if (token === 'VB') {
			currentVoice++;
			measure.notes[currentVoice] = [];
			currentOct = 4;
			isGrace = false;
			pendingBeam = null;
			pendingSlurStart = false;
			continue;
		}

		// Duration
		const dur = parseDuration(token);
		if (dur !== null) {
			currentDur = dur;
			continue;
		}

		// Rest
		if (token === 'Rest' || token === 'RSpace') {
			measure.notes[currentVoice].push({
				pname: 'c',
				oct: currentOct,
				dur: DURATION_VALUES[currentDur] || '4',
				rest: true,
				grace: isGrace,
				stemDir: pendingStemDir
			});
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

		// Dots
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

		// Accidentals
		if (token in ACCIDENTALS) {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].accid = ACCIDENTALS[token];
			}
			continue;
		}

		// Expressive marks
		if (token === 'EslurL') {
			pendingSlurStart = true;
			continue;
		}
		if (token === 'EslurR') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].slurEnd = true;
			}
			continue;
		}
		if (token === 'Etie') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].tie = 'i';
			}
			continue;
		}
		if (token === 'Efer') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].fermata = true;
			}
			continue;
		}
		if (token === 'Etr') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].trill = true;
			}
			continue;
		}
		if (token === 'Est') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].staccato = true;
			}
			continue;
		}
		if (token === 'Eac') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].accent = true;
			}
			continue;
		}
		if (token === 'Eten') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].tenuto = true;
			}
			continue;
		}
		if (token === 'Emar') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].marcato = true;
			}
			continue;
		}

		// Dynamics
		if (token.startsWith('ED')) {
			const dynType = token.slice(2); // f, p, m, r, s, z
			measure.dynamics!.push({
				type: dynType,
				voiceIdx: currentVoice,
				noteIdx: measure.notes[currentVoice].length
			});
			continue;
		}

		// Pitch
		const pitch = parsePitch(token);
		if (pitch) {
			const note: ParsedNote = {
				pname: pitch.pname,
				oct: currentOct + pitch.octShift,
				dur: DURATION_VALUES[currentDur] || '4',
				grace: isGrace,
				stemDir: pendingStemDir
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
			isGrace = false;
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

function noteToMEI(note: ParsedNote, indent: string): string {
	if (note.rest) {
		let attrs = `xml:id="${generateId('rest')}" dur="${note.dur}"`;
		if (note.dots) attrs += ` dots="${note.dots}"`;
		return `${indent}<rest ${attrs} />\n`;
	}

	// Build note attributes
	let attrs = `xml:id="${generateId('note')}" dur="${note.dur}" oct="${note.oct}" pname="${note.pname}"`;
	if (note.accid) attrs += ` accid="${note.accid}"`;
	if (note.dots) attrs += ` dots="${note.dots}"`;
	if (note.grace) attrs += ` grace="unacc"`;
	if (note.tie) attrs += ` tie="${note.tie}"`;
	if (note.stemDir) attrs += ` stem.dir="${note.stemDir}"`;

	// Check if we need child elements
	const hasChildren = note.fermata || note.trill || note.staccato || note.accent || note.tenuto || note.marcato;

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

export function toMEI(measure: ParsedMeasure): string {
	idCounter = 0;

	const keySig = KEYS[measure.key] || '0';
	const clefInfo = CLEF_SHAPES[measure.clef] || CLEF_SHAPES['Cg'];

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
                            <staffDef xml:id="${generateId('staffdef')}" n="1" lines="5" clef.shape="${clefInfo.shape}" clef.line="${clefInfo.line}" />
                        </staffGrp>
                    </scoreDef>
                    <section xml:id="${generateId('section')}">
                        <measure xml:id="${generateId('measure')}" n="1">
                            <staff xml:id="${generateId('staff')}" n="1">
`;

	const indent = '                                    ';

	// Add layers (voices)
	measure.notes.forEach((voice, vi) => {
		mei += `                                <layer xml:id="${generateId('layer')}" n="${vi + 1}">\n`;

		voice.forEach((note) => {
			mei += noteToMEI(note, indent);
		});

		mei += `                                </layer>\n`;
	});

	mei += `                            </staff>
                        </measure>
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
	const clefInfo = CLEF_SHAPES[firstMeasure.clef] || CLEF_SHAPES['Cg'];

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
                            <staffDef xml:id="${generateId('staffdef')}" n="1" lines="5" clef.shape="${clefInfo.shape}" clef.line="${clefInfo.line}" />
                        </staffGrp>
                    </scoreDef>
                    <section xml:id="${generateId('section')}">
`;

	const indent = '                                    ';

	score.measures.forEach((measure, mi) => {
		mei += `                        <measure xml:id="${generateId('measure')}" n="${mi + 1}">\n`;
		mei += `                            <staff xml:id="${generateId('staff')}" n="1">\n`;

		measure.notes.forEach((voice, vi) => {
			mei += `                                <layer xml:id="${generateId('layer')}" n="${vi + 1}">\n`;

			voice.forEach((note) => {
				mei += noteToMEI(note, indent);
			});

			mei += `                                </layer>\n`;
		});

		mei += `                            </staff>\n`;
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
