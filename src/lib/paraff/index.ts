// Paraff parser and MEI encoder
// This is a simplified version for the browser

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

const DURATIONS: Record<number, string> = {
	0: '1',
	1: '2',
	2: '4',
	3: '8',
	4: '16',
	5: '32',
	6: '64'
};

const PITCH_NAMES = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];

interface ParsedNote {
	pname: string;
	oct: number;
	dur: string;
	accid?: string;
	rest?: boolean;
}

interface ParsedMeasure {
	key: number;
	timeNum: number;
	timeDen: number;
	clef: string;
	staffN: number;
	notes: ParsedNote[][];
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
	const dur = parseInt(match[1]);
	// Convert to division (D1=0, D2=1, D4=2, etc.)
	return Math.log2(dur);
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

export function parseParaff(code: string): ParsedMeasure | null {
	const tokens = code.trim().split(/\s+/);

	if (tokens[0] !== 'BOM' || tokens[tokens.length - 1] !== 'EOM') {
		return null;
	}

	const measure: ParsedMeasure = {
		key: 0,
		timeNum: 4,
		timeDen: 4,
		clef: 'Cg',
		staffN: 1,
		notes: [[]]
	};

	let currentVoice = 0;
	let currentOct = 4;
	let currentDur = 2; // quarter note

	for (let i = 1; i < tokens.length - 1; i++) {
		const token = tokens[i];

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

		// Voice break
		if (token === 'VB') {
			currentVoice++;
			measure.notes[currentVoice] = [];
			continue;
		}

		// Duration
		const dur = parseDuration(token);
		if (dur !== null) {
			currentDur = dur;
			// Apply duration to last note if exists
			const voice = measure.notes[currentVoice];
			if (voice.length > 0 && !voice[voice.length - 1].dur) {
				voice[voice.length - 1].dur = DURATIONS[currentDur] || '4';
			}
			continue;
		}

		// Rest
		if (token === 'Rest') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].rest = true;
			}
			continue;
		}

		// Pitch
		const pitch = parsePitch(token);
		if (pitch) {
			measure.notes[currentVoice].push({
				pname: pitch.pname,
				oct: currentOct + pitch.octShift,
				dur: DURATIONS[currentDur] || '4'
			});
			continue;
		}

		// Accidentals
		if (token === 'As') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].accid = 's';
			}
			continue;
		}
		if (token === 'Af') {
			const voice = measure.notes[currentVoice];
			if (voice.length > 0) {
				voice[voice.length - 1].accid = 'f';
			}
			continue;
		}
	}

	return measure;
}

let idCounter = 0;

function generateId(prefix: string): string {
	return `${prefix}-${String(++idCounter).padStart(10, '0')}`;
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

	// Add layers (voices)
	measure.notes.forEach((voice, vi) => {
		mei += `                                <layer xml:id="${generateId('layer')}" n="${vi + 1}">\n`;

		voice.forEach((note) => {
			if (note.rest) {
				mei += `                                    <rest xml:id="${generateId('rest')}" dur="${note.dur}" />\n`;
			} else {
				let attrs = `xml:id="${generateId('note')}" dur="${note.dur}" oct="${note.oct}" pname="${note.pname}"`;
				if (note.accid) {
					attrs += ` accid="${note.accid}"`;
				}
				mei += `                                    <note ${attrs} />\n`;
			}
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

export function paraffToMEI(code: string): string | null {
	const parsed = parseParaff(code);
	if (!parsed) return null;
	return toMEI(parsed);
}
