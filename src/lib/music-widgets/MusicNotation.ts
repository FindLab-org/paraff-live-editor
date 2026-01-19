
import * as MIDI from "./MIDI";

import { midiToSequence, trimSequence, fixOverlapNotes } from "./MidiSequence";



const PedalControllerTypes = {
	64: "Sustain",
	65: "Portamento",
	66: "Sostenuto",
	67: "Soft",
};


interface Note {
	channel: number;
	startTick: number;
	endTick: number;
	pitch: number;
	start: number;
	duration: number;
	velocity?: number;
	beats?: number;
	track?: number;
	finger?: number;

	index?: number;
	deltaSi?: number;
	softIndex?: number;

	id?: string;
	ids?: string[];
};


interface NotationEvent {
	data: MIDI.MidiEvent;
	track: number;
	deltaTime: number;
	deltaTicks: number;
	time?: number;
	ticks?: number;
	index?: number;
};


interface Tempo {
	tempo: number;
	tick: number;
	time: number;
};


interface BeatInfo {
	beatIndex?: number;
	beatsUnit: number;
	beats: number;
	tick: number;
};


interface NotationMetaInfo {
	beatInfos?: BeatInfo[];

	[key: string]: any;
}


interface MeasureRange {
	startTick: number;
	endTick: number;
	index: number;
}


interface NotationData {
	ticksPerBeat?: number;

	notes: Note[];
	channels?: Note[][];
	events?: NotationEvent[];
	tempos?: Tempo[];

	endTime?: number;
	endTick?: number;

	pitchMap?: {[key: number]: Note[]};

	measures?: MeasureRange[];

	meta?: NotationMetaInfo;
}


interface FromToRange {
	from: number;
	to: number;
}


interface Pedal {
	type: string;
	start: number;
	duration: number;
	value: number;
}


interface Bar {
	time: number;
	index: number;
}


interface NotationProtoData {
	channels: Note[][];
	meta: NotationMetaInfo;
	ticksPerBeat: number;
	tempos: Tempo[];

	keyRange?: {low: number, high: number};
	pedals?: {[channel: number]: Pedal[]};
	bars?: Bar[];
	endTime?: number;
	endTick?: number;
	correspondences?: number[];
	events?: NotationEvent[];
	measures?: MeasureRange[];
}


interface Logger {
	assert(condition?: boolean, ...data: any[]): void;
	debug(...data: any[]): void;
	error(...data: any[]): void;
	info(...data: any[]): void;
	log(...data: any[]): void;
	warn(...data: any[]): void;
}


class Notation implements NotationProtoData {
	ticksPerBeat: number;

	channels: Note[][];
	notes: Note[];
	events?: NotationEvent[];
	tempos: Tempo[];

	endTime: number;
	endTick: number;

	duration: number;
	pitchMap: Note[][];
	measures?: MeasureRange[];

	keyRange?: {low: number, high: number};
	pedals?: {[channel: number]: Pedal[]};
	bars?: Bar[];

	meta: NotationMetaInfo;
	microsecondsPerBeat?: number;

	logger: Logger;


	static parseMidi (data: MIDI.MidiData, {fixOverlap = true, logger = null} = {}): Notation {
		const channelStatus = [];
		const pedalStatus = {};
		const pedals = {};
		const channels = [];
		const bars = [];
		let time = 0;
		let millisecondsPerBeat = 600000 / 120;
		let beats = 0;
		let numerator = 4;
		let barIndex = 0;
		const keyRange: {low: number, high: number} = {low: null, high: null};
		let rawTicks = 0;
		let ticks = 0;
		let correspondences: number[];
		const tempos = [];

		const ticksPerBeat = data.header.ticksPerBeat;

		let rawEvents = midiToSequence(data);

		if (fixOverlap)
			rawEvents = trimSequence(fixOverlapNotes(rawEvents));

		const events: NotationEvent[] = rawEvents.map((d: any) => ({
			data: d[0].event,
			track: d[0].track,
			deltaTime: d[1],
			deltaTicks: d[0].ticksToEvent,
		}));

		let index = 0;

		const ticksNormal = 1;

		for (const ev of events as any[]) {
			rawTicks += ev.deltaTicks;
			ticks = Math.round(rawTicks * ticksNormal);

			if (ev.deltaTicks > 0) {
				// append bars
				const deltaBeats = ev.deltaTicks / ticksPerBeat;
				for (let b = Math.ceil(beats); b < beats + deltaBeats; ++b) {
					const t = time + (b - beats) * millisecondsPerBeat;
					bars.push({time: t, index: barIndex % numerator});

					++barIndex;
				}

				beats += deltaBeats;
			}

			time += ev.deltaTime;

			ev.time = time;
			ev.ticks = ticks;

			const event: any = ev.data;
			switch (event.type) {
			case "channel":
				//channelStatus[event.channel] = channelStatus[event.channel] || [];

				switch (event.subtype) {
				case "noteOn":
					{
						const pitch = event.noteNumber;
						//channelStatus[event.channel][pitch] = {
						channelStatus.push({
							channel: event.channel,
							pitch,
							startTick: ticks,
							start: time,
							velocity: event.velocity,
							beats: beats,
							track: ev.track,
						});

					keyRange.low = Math.min(keyRange.low || pitch, pitch);

						ev.index = index;
						++index;
					}

					break;
				case "noteOff":
					{
						const pitch = event.noteNumber;

						channels[event.channel] = channels[event.channel] || [];

						const statusIndex = channelStatus.findIndex(status => status.channel == event.channel && status.pitch == pitch);
						if (statusIndex >= 0) {
							const status = channelStatus.splice(statusIndex, 1)[0];

							channels[event.channel].push({
								channel: event.channel,
								startTick: status.startTick,
								endTick: ticks,
								pitch,
								start: status.start,
								duration: time - status.start,
								velocity: status.velocity,
								beats: status.beats,
								track: status.track,
								finger: status.finger,
							});
						}
						else
					logger && logger.debug && logger.debug("unexpected noteOff: ", time, event);

						keyRange.high = Math.max(keyRange.high || pitch, pitch);
					}

					break;
				case "controller":
					switch (event.controllerType) {
					// pedal controllers
					case 64:
					case 65:
					case 66:
					case 67:
						const pedalType = PedalControllerTypes[event.controllerType];

						pedalStatus[event.channel] = pedalStatus[event.channel] || {};
						pedals[event.channel] = pedals[event.channel] || [];

						const status = pedalStatus[event.channel][pedalType];

						if (status)
							pedals[event.channel].push({type: pedalType, start: status.start, duration: time - status.start, value: status.value});
						pedalStatus[event.channel][pedalType] = {start: time, value: event.value};

						break;
					}

					break;
				}

				break;
			case "meta":
				switch (event.subtype) {
				case "setTempo":
					millisecondsPerBeat = event.microsecondsPerBeat / 1000;
					tempos.push({tempo: event.microsecondsPerBeat, tick: ticks, time});

					break;
				case "timeSignature":
					numerator = event.numerator;
					barIndex = 0;

					break;
				case "text":
					if (!correspondences && /^find-corres:/.test(event.text)) {
						const captures = event.text.match(/:([\d\,-]+)/);
						const str = captures && captures[1] || "";
						correspondences = str.split(",").map(s => Number(s));
					}
					else if (/fingering\(.*\)/.test(event.text)) {
						const [_, fingers] = event.text.match(/\((.+)\)/);
						const finger = Number(fingers);
						if (!Number.isNaN(finger)) {
							const status = channelStatus[channelStatus.length - 1];
							if (status)
								status.finger = finger;

							const event = events.find(e => e.index == index - 1);
							if (event)
								event.data.finger = finger;
						}
					}

					break;
				case "copyrightNotice":
					logger && logger.log && logger.log("MIDI copyright:", event.text);

					break;
				}

				break;
			}
		}

		channelStatus.forEach((status: any) => {
			logger && logger.debug && logger.debug("unclosed noteOn event at", status.startTick, status);

			channels[status.channel] = channels[status.channel] || [];
			channels[status.channel].push({
				startTick: status.startTick,
				endTick: ticks,
				pitch: status.pitch,
				start: status.start,
				duration: time - status.start,
				velocity: status.velocity,
				beats: status.beats,
				track: status.track,
				finger: status.finger,
			});
		});

		return new Notation({
			channels,
			keyRange,
			pedals,
			bars,
			endTime: time,
			endTick: ticks,
			correspondences,
			events,
			tempos,
			ticksPerBeat,
			meta: {},
			logger,
		});
	}


	constructor (fields: NotationProtoData & {logger?: Logger}) {
		Object.assign(this, fields);

		// channels to notes
		this.notes = [];
		for (const channel of this.channels) {
			if (channel) {
				for (const note of channel)
					this.notes.push(note);
			}
		}
		this.notes.sort(function (n1, n2) {
			return n1.start - n2.start;
		});

		for (const i in this.notes)
			this.notes[i].index = Number(i);


		// duration
		this.duration = this.notes.length > 0 ? (this.endTime - this.notes[0].start) : 0,

		//this.endSoftIndex = this.notes.length ? this.notes[this.notes.length - 1].softIndex : 0;


		// pitch map
		this.pitchMap = [];
		for (const c in this.channels) {
			for (const n in this.channels[c]) {
				const pitch = this.channels[c][n].pitch;
				this.pitchMap[pitch] = this.pitchMap[pitch] || [];

				this.pitchMap[pitch].push(this.channels[c][n]);
			}
		}

		this.pitchMap.forEach(notes => notes.sort((n1, n2) => n1.start - n2.start));


		// prepare beats info
		if (this.meta.beatInfos) {
			for (let i = 0; i < this.meta.beatInfos.length; ++i) {
				const info = this.meta.beatInfos[i];
				if (i > 0) {
					const lastInfo = this.meta.beatInfos[i - 1];
					info.beatIndex = lastInfo.beatIndex + Math.ceil((info.tick - lastInfo.tick) / this.ticksPerBeat);
				}
				else
					info.beatIndex = 0;
			}
		}


		// compute tempos tick -> time
		{
			let time = 0;
			let ticks = 0;
			let tempo = 500000;
			for (const entry of this.tempos) {
				const deltaTicks = entry.tick - ticks;
				time += (tempo / 1000) * deltaTicks / this.ticksPerBeat;

				ticks = entry.tick;
				tempo = entry.tempo;

				entry.time = time;
			}
		}
	}


	findChordBySoftindex (softIndex: any, radius = 0.8): Note[] {
		return this.notes.filter(note => Math.abs(note.softIndex - softIndex) < radius);
	}


	averageTempo (tickRange: FromToRange | null = null): number {
		tickRange = tickRange || {from: 0, to: this.endTick};

		this.logger && this.logger.assert(!!this.tempos, "no tempos.");
		this.logger && this.logger.assert(tickRange.to > tickRange.from, "range is invalid:", tickRange);

		const span = index => {
			const from = Math.max(tickRange.from, this.tempos[index].tick);
			const to = (index < this.tempos.length - 1) ? Math.min(this.tempos[index + 1].tick, tickRange.to) : tickRange.to;

			return Math.max(0, to - from);
		};

		const tempo_sum = this.tempos.reduce((sum, tempo, index) => sum + tempo.tempo * span(index), 0);

		const average = tempo_sum / (tickRange.to - tickRange.from);

		// convert microseconds per beat to beats per minute
		return 60e+6 / average;
	}


	ticksToTime (tick: number): number {
		this.logger && this.logger.assert(Number.isFinite(tick), "invalid tick value:", tick);
		this.logger && this.logger.assert(!!this.tempos && !!this.tempos.length, "no tempos.");

		const next_tempo_index = this.tempos.findIndex(tempo => tempo.tick > tick);
		const tempo_index = next_tempo_index < 0 ? this.tempos.length - 1 : Math.max(next_tempo_index - 1, 0);

		const tempo = this.tempos[tempo_index];

		return tempo.time + (tick - tempo.tick) * tempo.tempo * 1e-3 / this.ticksPerBeat;
	}


	timeToTicks (time: number): number {
		this.logger && this.logger.assert(Number.isFinite(time), "invalid time value:", time);
		this.logger && this.logger.assert(!!this.tempos && !!this.tempos.length, "no tempos.");

		const next_tempo_index = this.tempos.findIndex(tempo => tempo.time > time);
		const tempo_index = next_tempo_index < 0 ? this.tempos.length - 1 : Math.max(next_tempo_index - 1, 0);

		const tempo = this.tempos[tempo_index];

		return tempo.tick + (time - tempo.time) * this.ticksPerBeat / (tempo.tempo * 1e-3);
	}


	tickRangeToTimeRange (tickRange: FromToRange): FromToRange {
		this.logger && this.logger.assert(tickRange.to >= tickRange.from, "invalid tick range:", tickRange);

		return {
			from: this.ticksToTime(tickRange.from),
			to: this.ticksToTime(tickRange.to),
		};
	}


	scaleTempo ({factor, headTempo}: {factor?: number; headTempo?: number}): void {
		this.logger && this.logger.assert(!!this.tempos && !!this.tempos.length, "[Notation.scaleTempo] tempos is empty.");

		if (headTempo)
			factor = headTempo / this.tempos[0].tempo;

		this.logger && this.logger.assert(Number.isFinite(factor) && factor > 0, "[Notation.scaleTempo] invalid factor:", factor);

		this.tempos.forEach(tempo => {
			tempo.tempo *= factor;
			tempo.time *= factor;
		});
		this.events.forEach(event => {
			event.deltaTime *= factor;
			event.time *= factor;
		});
		this.notes.forEach(note => {
			note.start *= factor;
			note.duration *= factor;
		});

		this.endTime *= factor;
	}
};



export {
	NotationData,
	Note,
	NotationEvent,
	Notation,
};
