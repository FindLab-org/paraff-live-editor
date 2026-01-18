// Paraff syntax highlighting for CodeMirror 6
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { StreamLanguage } from '@codemirror/language';

// Token categories for Paraff
const KEYWORDS = ['BOM', 'EOM', 'BOS', 'EOS'];
const VOICE_BREAK = ['VB'];
const STAFF = ['S1', 'S2', 'S3'];
const CLEFS = ['Cg', 'Cf', 'Cc'];
const OCTAVE_SHIFTS = ['Ova', 'Ovb', 'O0'];

// Key signatures: K0, K1, K2, ... K6, K_1, K_2, ... K_6
const KEY_PATTERN = /^K_?[0-6]$/;

// Time signature numerators: TN1, TN2, TN3, ... TN12
const TIME_NUM_PATTERN = /^TN\d+$/;

// Time signature denominators: TD1, TD2, TD4, TD8, TD16, TD32
const TIME_DEN_PATTERN = /^TD\d+$/;

// Durations: D1, D2, D4, D8, D16, D32, D64
const DURATION_PATTERN = /^D\d+$/;

// Pitch names (lowercase)
const PITCHES = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];

// Octave modifiers
const OCTAVE_MOD = ['Osup', 'Osub'];

// Accidentals
const ACCIDENTALS = ['As', 'Af', 'An', 'Ass', 'Aff'];

// Rest and space
const RESTS = ['Rest', 'RSpace'];

// Beam tokens
const BEAMS = ['Bl', 'Br', 'Bm'];

// Stem direction
const STEMS = ['Mu', 'Md'];

// Dots
const DOTS = ['Dot'];

// Grace notes
const GRACE = ['G'];

// Tremolo
const TREMOLO_PATTERN = /^Tr\d+$/;

// Expressive marks
const EXPRESSIVE = [
	'EslurL', 'EslurR', 'Etie', 'Earp', 'Etr', 'Efer', 'Esf',
	'Est', 'Estm', 'Eac', 'Emor', 'Epr', 'Eturn', 'Epor', 'Eten', 'Emar',
	'Ecre', 'Edim', 'Ecds',
	'EDf', 'EDp', 'EDm', 'EDr', 'EDs', 'EDz',
	'EsusOn', 'EsusOff'
];

// Define the Paraff language
const paraffLanguage = StreamLanguage.define({
	token(stream) {
		// Skip whitespace
		if (stream.eatSpace()) return null;

		// Read the next token
		const token = stream.match(/\S+/)?.[0];
		if (!token) return null;

		// Keywords (BOM, EOM, etc.)
		if (KEYWORDS.includes(token)) {
			return 'keyword';
		}

		// Voice break
		if (VOICE_BREAK.includes(token)) {
			return 'separator';
		}

		// Staff
		if (STAFF.includes(token)) {
			return 'labelName';
		}

		// Clefs
		if (CLEFS.includes(token)) {
			return 'className';
		}

		// Key signature
		if (KEY_PATTERN.test(token)) {
			return 'typeName';
		}

		// Time signature numerator
		if (TIME_NUM_PATTERN.test(token)) {
			return 'number';
		}

		// Time signature denominator
		if (TIME_DEN_PATTERN.test(token)) {
			return 'number';
		}

		// Duration
		if (DURATION_PATTERN.test(token)) {
			return 'literal';
		}

		// Pitch (single lowercase letter)
		if (PITCHES.includes(token)) {
			return 'variableName';
		}

		// Octave modifiers
		if (OCTAVE_MOD.includes(token)) {
			return 'modifier';
		}

		// Octave shifts
		if (OCTAVE_SHIFTS.includes(token)) {
			return 'meta';
		}

		// Accidentals
		if (ACCIDENTALS.includes(token)) {
			return 'changed';
		}

		// Rests
		if (RESTS.includes(token)) {
			return 'comment';
		}

		// Beams
		if (BEAMS.includes(token)) {
			return 'bracket';
		}

		// Stems
		if (STEMS.includes(token)) {
			return 'operator';
		}

		// Dots
		if (DOTS.includes(token)) {
			return 'punctuation';
		}

		// Grace notes
		if (GRACE.includes(token)) {
			return 'special';
		}

		// Tremolo
		if (TREMOLO_PATTERN.test(token)) {
			return 'special';
		}

		// Expressive marks
		if (EXPRESSIVE.includes(token)) {
			return 'annotation';
		}

		// Unknown token
		return 'invalid';
	}
});

// Custom highlight style for Paraff
const paraffHighlightStyle = HighlightStyle.define([
	{ tag: t.keyword, color: '#c678dd', fontWeight: 'bold' },           // BOM, EOM
	{ tag: t.separator, color: '#e06c75', fontWeight: 'bold' },         // VB
	{ tag: t.labelName, color: '#61afef' },                              // S1, S2, S3
	{ tag: t.className, color: '#e5c07b' },                              // Cg, Cf, Cc
	{ tag: t.typeName, color: '#56b6c2' },                               // K0, K_1, etc.
	{ tag: t.number, color: '#d19a66' },                                 // TN4, TD4
	{ tag: t.literal, color: '#98c379' },                                // D1, D2, D4
	{ tag: t.variableName, color: '#e06c75', fontWeight: 'bold' },      // c, d, e, f, g, a, b
	{ tag: t.modifier, color: '#c678dd' },                               // Osup, Osub
	{ tag: t.meta, color: '#abb2bf' },                                   // Ova, Ovb
	{ tag: t.changed, color: '#e5c07b' },                                // As, Af
	{ tag: t.comment, color: '#5c6370', fontStyle: 'italic' },          // Rest
	{ tag: t.bracket, color: '#61afef' },                                // Bl, Br, Bm
	{ tag: t.operator, color: '#56b6c2' },                               // Mu, Md
	{ tag: t.punctuation, color: '#abb2bf' },                            // Dot
	{ tag: t.special, color: '#c678dd', fontStyle: 'italic' },          // G, Tr
	{ tag: t.annotation, color: '#98c379' },                             // Expressive marks
	{ tag: t.invalid, color: '#e06c75', textDecoration: 'underline' }   // Unknown
]);

// Export the language and highlighting
export const paraff = () => [
	paraffLanguage,
	syntaxHighlighting(paraffHighlightStyle)
];

export { paraffLanguage, paraffHighlightStyle };
