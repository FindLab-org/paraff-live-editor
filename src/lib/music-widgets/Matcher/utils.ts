

import type {Note, Notation} from "./types";

import MatchNode from "./node";
import Navigator from "./navigator";
import * as MusicNotation from "../MusicNotation";



const HEART_BEAT = 800;	// in ms
const SIMULTANEOUS_INTERVAL = HEART_BEAT * 0.24;


const normalizeInterval = (interval: number): number => Math.tanh(interval / SIMULTANEOUS_INTERVAL);


// greater softIndexFactor make 'harder' soft index
const makeNoteSoftIndex = function (notes: MusicNotation.Note[], index: number, {softIndexFactor = 1} = {}): void {
	index = Number(index);

	const note = notes[index];

	// make soft index
	if (index > 0) {
		const lastNote = notes[index - 1];

		console.assert(note.start != null, "note.start is null", note);
		console.assert(lastNote.start != null, "lastNote.start is null", lastNote);

		note.deltaSi = normalizeInterval((note.start - lastNote.start) * softIndexFactor);
		note.softIndex = lastNote.softIndex + note.deltaSi;

		console.assert(!Number.isNaN(note.deltaSi), "note.deltaSi is NaN.", note.start, lastNote.start);
	}
	else {
		note.softIndex = 0;
		note.deltaSi = 0;
	}
};


const makeMatchNodes = function (note: MusicNotation.Note, criterion: MusicNotation.NotationData, zeroNode = MatchNode.zero()): void {
	const mnote = note as Note;
	mnote.matches = [];

	const targetList = criterion.pitchMap[note.pitch];
	if (targetList) {
		for (const targetNote of targetList) {
			const node = new MatchNode(note, targetNote);
			if (zeroNode)
				node.evaluatePrev(zeroNode);

			mnote.matches.push(node);
		}
	}
};


const genNotationContext = function (notation: MusicNotation.NotationData, {softIndexFactor = 1} = {}): void {
	for (let i = 0; i < notation.notes.length; ++i)
		makeNoteSoftIndex(notation.notes, i, {softIndexFactor});
};


const runNavigation = async function(criterion: MusicNotation.NotationData, sample: MusicNotation.NotationData, onStep: ((index: number, navigator: Navigator) => any) | null = null): Promise<Navigator> {
	const navigator = new Navigator(criterion as Notation, sample as Notation);
	navigator.resetCursor(-1);

	for (let i = 0; i < sample.notes.length; ++i) {
		navigator.step(i);

		const next = await (onStep && onStep(i, navigator));
		if (next === Symbol.for("end")) {
			console.log("Navigation interrupted.");

			return Promise.reject("Navigation interrupted.");
		}
	}

	return navigator;
};



export {
	normalizeInterval,
	makeNoteSoftIndex,
	makeMatchNodes,
	genNotationContext,
	runNavigation,
};
