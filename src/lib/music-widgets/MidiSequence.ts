
import * as MIDI from "./MIDI";


interface TickEvent {
	ticksToEvent: number;
	event: MIDI.MidiEvent;
	track: number;
};

type SeqEvent = [TickEvent, number];

export type MIDISequence = SeqEvent[];


interface TrackState {
	nextEventIndex: number;
	ticksToNextEvent: number | null;
};


export const midiToSequence = (midiFile: MIDI.MidiData, {timeWarp = 1} = {}): MIDISequence => {
	const trackStates: TrackState[] = [];
	let beatsPerMinute = 120;
	const ticksPerBeat = midiFile.header.ticksPerBeat;

	for (let i = 0; i < midiFile.tracks.length; i++) {
		trackStates[i] = {
			nextEventIndex: 0,
			ticksToNextEvent: (
				midiFile.tracks[i].length ?
					midiFile.tracks[i][0].deltaTime :
					null
			),
		};
	}

	function getNextEvent (): TickEvent | null {
		let ticksToNextEvent = null;
		let nextEventTrack = null;
		let nextEventIndex = null;

		for (let i = 0; i < trackStates.length; i++) {
			if (
				trackStates[i].ticksToNextEvent != null
				&& (ticksToNextEvent == null || trackStates[i].ticksToNextEvent < ticksToNextEvent)
			) {
				ticksToNextEvent = trackStates[i].ticksToNextEvent;
				nextEventTrack = i;
				nextEventIndex = trackStates[i].nextEventIndex;
			}
		}
		if (nextEventTrack != null) {
			/* consume event from that track */
			const nextEvent = midiFile.tracks[nextEventTrack][nextEventIndex];
			if (midiFile.tracks[nextEventTrack][nextEventIndex + 1]) 
				trackStates[nextEventTrack].ticksToNextEvent += midiFile.tracks[nextEventTrack][nextEventIndex + 1].deltaTime;
			else 
				trackStates[nextEventTrack].ticksToNextEvent = null;

			trackStates[nextEventTrack].nextEventIndex += 1;
			/* advance timings on all tracks by ticksToNextEvent */
			for (let i = 0; i < trackStates.length; i++) {
				if (trackStates[i].ticksToNextEvent != null) 
					trackStates[i].ticksToNextEvent -= ticksToNextEvent;
			}
			return {
				ticksToEvent: ticksToNextEvent,
				event: nextEvent,
				track: nextEventTrack,
			};
		}
		else 
			return null;
		
	};
	//
	let midiEvent: TickEvent | null = null;
	const events: SeqEvent[] = [];
	//
	function processEvents () {
		function processNext () {
			let secondsToGenerate = 0;
			if (midiEvent.ticksToEvent > 0) {
				const beatsToGenerate = midiEvent.ticksToEvent / ticksPerBeat;
				secondsToGenerate = beatsToGenerate / (beatsPerMinute / 60);
			}

			// beatsPerMinute must be changed after secondsToGenerate calculation
			if ( midiEvent.event.type == "meta" && midiEvent.event.subtype == "setTempo" ) {
				// tempo change events can occur anywhere in the middle and affect events that follow
				beatsPerMinute = 60e+6 / midiEvent.event.microsecondsPerBeat;
			}

			const time = (secondsToGenerate * 1000 * timeWarp) || 0;
			events.push([ midiEvent, time ]);
			midiEvent = getNextEvent();
		};
		//
		if (midiEvent = getNextEvent()) {
			while (midiEvent)
				processNext();
		}
	};

	processEvents();

	return events;
};


export const trimSequence = (seq: MIDISequence): MIDISequence => {
	const status = new Map<string, MIDI.MidiEvent>();

	return seq.filter(([{event, ticksToEvent}]) => {
		if (ticksToEvent > 0)
			status.clear();

		if (event.type !== "channel")
			return true;

		const key = `${event.subtype}|${event.channel}|${event.noteNumber}`;

		if (status.get(key)) {
			//console.debug("event trimmed:", event, ticksToEvent);
			return false;
		}

		status.set(key, event);

		return true;
	});
};


export const fixOverlapNotes = (seq: MIDISequence): MIDISequence => {
	const noteMap = new Map<string, number>();
	const overlapMap = new Map<string, number>();
	const swaps: [number, number][] = [];

	let leapIndex = -1;

	seq.forEach(([{event, ticksToEvent}], index) => {
		if (ticksToEvent > 0)
			leapIndex = index;

		if (event.type !== "channel")
			return;

		const key = `${event.channel}|${event.noteNumber}`;

		switch (event.subtype) {
		case "noteOn":
			if (noteMap.get(key))
				overlapMap.set(key, leapIndex);
			else
				noteMap.set(key, leapIndex);

			break;
		case "noteOff":
			if (overlapMap.get(key)) {
				swaps.push([overlapMap.get(key), index]);
				overlapMap.delete(key);
			}
			else
				noteMap.delete(key);

			break;
		}
	});

	// shift overlapped swaps
	swaps.forEach((swap, i) => {
		for (let ii = i - 1; ii >= 0; --ii) {
			const pre = swaps[ii];
			if (pre[1] < swap[0])
				break;

			if (swap[0] > pre[0])
				++swap[0];
		}
	});

	//console.debug("swaps:", swaps);
	swaps.forEach(([front, back]) => {
		if (back >= seq.length - 1 || front < 0)
			return;

		const offEvent = seq[back];
		const nextEvent = seq[back + 1];
		const leapEvent = seq[front];

		if (!leapEvent[0].ticksToEvent) {
			console.warn("invalid front index:", front, back, leapEvent);
			return;
		}

		// ms per tick
		const tempo = leapEvent[1] / leapEvent[0].ticksToEvent;

		nextEvent[1] += offEvent[1];
		nextEvent[0].ticksToEvent += offEvent[0].ticksToEvent;

		offEvent[0].ticksToEvent = leapEvent[0].ticksToEvent - 1;
		leapEvent[0].ticksToEvent = 1;

		offEvent[1] = offEvent[0].ticksToEvent * tempo;
		leapEvent[1] = leapEvent[0].ticksToEvent * tempo;
		//console.debug("swap:", [front, back], offEvent, nextEvent, leapEvent);

		seq.splice(back, 1);
		seq.splice(front, 0, offEvent);
	});

	return seq;
};
