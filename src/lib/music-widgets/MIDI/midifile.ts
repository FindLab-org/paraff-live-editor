/*
class to parse the .mid file format
(depends on stream.js)
*/

import type { MidiData, MidiHeader, MidiTrack, MidiEvent } from "./types";
import MidiStream from "./stream";



export class MidiFile implements MidiData {
	header: MidiHeader;
	tracks: MidiTrack[];


	constructor (fields: MidiData) {
		Object.assign(this, fields);
	}


	static parse (data: any): MidiFile {
		function readChunk (stream) {
			const id = stream.readString(4);
			const length = stream.readInt32();

			return {
				id,
				length,
				data: stream.read(length),
			};
		}

		let lastEventTypeByte: any;

		function readEvent (stream: any) {
			const event: MidiEvent = {
				deltaTime: null,
				type: null,
			};
			event.deltaTime = stream.readVarInt();
			let eventTypeByte = stream.readInt8();
			if ((eventTypeByte & 0xf0) === 0xf0) {
				if (eventTypeByte === 0xff) {
					event.type = "meta";
					const subtypeByte = stream.readInt8();
					const length = stream.readVarInt();

					switch (subtypeByte) {
					case 0x00:
						event.subtype = "sequenceNumber";
						if (length !== 2)
							throw new Error("Expected length for sequenceNumber event is 2, got " + length);
						event.number = stream.readInt16();

						return event;
					case 0x01:
						event.subtype = "text";
						event.text = stream.readString(length);

						return event;
					case 0x02:
						event.subtype = "copyrightNotice";
						event.text = stream.readString(length);

						return event;
					case 0x03:
						event.subtype = "trackName";
						event.text = stream.readString(length);

						return event;
					case 0x04:
						event.subtype = "instrumentName";
						event.text = stream.readString(length);

						return event;
					case 0x05:
						event.subtype = "lyrics";
						event.text = stream.readString(length);

						return event;
					case 0x06:
						event.subtype = "marker";
						event.text = stream.readString(length);

						return event;
					case 0x07:
						event.subtype = "cuePoint";
						event.text = stream.readString(length);

						return event;
					case 0x20:
						event.subtype = "midiChannelPrefix";
						if (length !== 1)
							throw new Error("Expected length for midiChannelPrefix event is 1, got " + length);
						event.channel = stream.readInt8();

						return event;
					case 0x2f:
						event.subtype = "endOfTrack";
						if (length !== 0)
							throw new Error("Expected length for endOfTrack event is 0, got " + length);

						return event;
					case 0x51:
						event.subtype = "setTempo";
						if (length !== 3)
							throw new Error("Expected length for setTempo event is 3, got " + length);
						event.microsecondsPerBeat = (
							(stream.readInt8() << 16) +
								(stream.readInt8() << 8) +
								stream.readInt8()
						);

						return event;
					case 0x54:
						event.subtype = "smpteOffset";
						if (length !== 5)
							throw new Error("Expected length for smpteOffset event is 5, got " + length);
						const hourByte = stream.readInt8();
						event.frameRate = {
							0x00: 24, 0x20: 25, 0x40: 29, 0x60: 30,
						}[hourByte & 0x60];
						event.hour = hourByte & 0x1f;
						event.min = stream.readInt8();
						event.sec = stream.readInt8();
						event.frame = stream.readInt8();
						event.subframe = stream.readInt8();

						return event;
					case 0x58:
						event.subtype = "timeSignature";
						if (length !== 4)
							throw new Error("Expected length for timeSignature event is 4, got " + length);
						event.numerator = stream.readInt8();
						event.denominator = Math.pow(2, stream.readInt8());
						event.metronome = stream.readInt8();
						event.thirtyseconds = stream.readInt8();

						return event;
					case 0x59:
						event.subtype = "keySignature";
						if (length !== 2)
							throw new Error("Expected length for keySignature event is 2, got " + length);
						event.key = stream.readInt8();
						event.scale = stream.readInt8();

						return event;
					case 0x7f:
						event.subtype = "sequencerSpecific";
						event.data = stream.readString(length);

						return event;
					default:
						event.subtype = "unknown";
						event.data = stream.readString(length);

						return event;
				}

			}
			else if (eventTypeByte === 0xf0) {
				event.type = "sysEx";
				const length = stream.readVarInt();
				event.data = stream.readString(length);

				return event;
			}
			else if (eventTypeByte === 0xf7) {
				event.type = "dividedSysEx";
				const length = stream.readVarInt();
				event.data = stream.readString(length);

				return event;
			}
			else
				throw new Error("Unrecognised MIDI event type byte: " + eventTypeByte);
		}
		else {
			let param1;
			if ((eventTypeByte & 0x80) === 0) {
				param1 = eventTypeByte;
				eventTypeByte = lastEventTypeByte;
			}
			else {
				param1 = stream.readInt8();
				lastEventTypeByte = eventTypeByte;
			}

			const eventType = eventTypeByte >> 4;
			event.channel = eventTypeByte & 0x0f;
			event.type = "channel";

			switch (eventType) {
			case 0x08:
				event.subtype = "noteOff";
				event.noteNumber = param1;
				event.velocity = stream.readInt8();

				return event;
			case 0x09:
				event.noteNumber = param1;
				event.velocity = stream.readInt8();
				if (event.velocity === 0)
					event.subtype = "noteOff";
				else
					event.subtype = "noteOn";

				return event;
			case 0x0a:
				event.subtype = "noteAftertouch";
				event.noteNumber = param1;
				event.amount = stream.readInt8();

				return event;
			case 0x0b:
				event.subtype = "controller";
				event.controllerType = param1;
				event.value = stream.readInt8();

				return event;
			case 0x0c:
				event.subtype = "programChange";
				event.programNumber = param1;

				return event;
			case 0x0d:
				event.subtype = "channelAftertouch";
				event.amount = param1;

				return event;
			case 0x0e:
				event.subtype = "pitchBend";
				event.value = param1 + (stream.readInt8() << 7);

				return event;
			default:
				throw new Error("Unrecognised MIDI event type: " + eventType);
			}
		}
		}

		let source = data;
		if (typeof data === "string")
			source = new Uint8Array(data.split("").map((c: string) => c.charCodeAt(0))).buffer;
		else if (source instanceof Uint8Array)
			source = source.buffer;

		const stream = new MidiStream(source);
		const headerChunk = readChunk(stream);
		if (headerChunk.id !== "MThd" || headerChunk.length !== 6)
			throw new Error("Bad .mid file - header not found");

		const headerStream = new MidiStream(headerChunk.data);
		const formatType = headerStream.readInt16();
		const trackCount = headerStream.readInt16();
		const timeDivision = headerStream.readInt16();

		let ticksPerBeat;
		if (timeDivision & 0x8000)
			throw new Error("Expressing time division in SMTPE frames is not supported yet");
		else
			ticksPerBeat = timeDivision;

		const header = { formatType, trackCount, ticksPerBeat };

		const tracks = [];
		for (let i = 0; i < header.trackCount; i++) {
			const trackChunk = readChunk(stream);
			if (trackChunk.id !== "MTrk")
				throw new Error("Unexpected chunk - expected MTrk, got " + trackChunk.id);

			const trackStream = new MidiStream(trackChunk.data);
			const track = [];
			let containsEndTrack = false;

			while (!trackStream.eof()) {
				const event = readEvent(trackStream);
				track.push(event);

				if (event.subtype === "endOfTrack")
					containsEndTrack = true;
			}

			if (!containsEndTrack)
				track.push({deltaTime: 0, type: "meta", subtype: "endOfTrack"});

			tracks.push(track);
		}

		return new MidiFile({header, tracks});
	}
}



export default (data: any) => MidiFile.parse(data);
