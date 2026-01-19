
interface MidiHeader {
	formatType: number;
	trackCount?: number;
	ticksPerBeat: number;
}


interface MidiEvent {
	deltaTime?: number;

	type: string;
	subtype?: string;

	channel?: number;

	text?: string;

	microsecondsPerBeat?: number;

	frameRate?: number;
	hour?: number;
	min?: number;
	sec?: number;
	frame?: number;
	subframe?: number;

	numerator?: number;
	denominator?: number;
	metronome?: number;
	thirtyseconds?: number;

	number?: number;

	key?: number;
	scale?: number;

	data?: string;

	noteNumber?: number;
	velocity?: number;

	amount?: number;

	controllerType?: number;

	programNumber?: number;

	value?: number;

	finger?: number;
}


type MidiTrack = MidiEvent[];


interface MidiData {
	header: MidiHeader;
	tracks: MidiTrack[];
}



export {
	MidiHeader,
	MidiEvent,
	MidiData,
	MidiTrack,
};
