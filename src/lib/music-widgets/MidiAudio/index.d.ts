
interface Plugin {
	empty (): boolean;
	hasPending (): boolean;
	setVolume (channel: number, volume: number): void;
	programChange (channel: number, program: number): void;
	noteOn (channel: number, note: number, velocity: number, timestamp: number): void;
	noteOff (channel: number, note: number, timestamp: number): void;
	chordOn (channel: number, chord: number[], velocity: number, delay: number): void;
	chordOff (channel: number, chord: number[], delay: number): void;
	stopAllNotes (): void;
}


type PluginCallback = () => any;


interface PluginConfig {
	instrument?: string | number;
	instruments?: string[] | number[];
	soundfontUrl?: string;
	api: "webmidi" | "webaudio" | "audiotag" | "flash";
	targetFormat?: "ogg" | "mp3";
	callback?: PluginCallback;
	outputDeviceIndex?: number;
}


declare const WebMIDI: Plugin;
declare const WebAudio: Plugin;
declare const AudioTag: Plugin;


declare const loadPlugin: (config: PluginConfig | PluginCallback) => Promise<any>;
declare const noteOn: (channel: number, note: number, velocity: number, timestamp: number) => void;
declare const noteOff: (channel: number, note: number, timestamp: number) => void;
declare const stopAllNotes: () => void;
declare const setVolume: (channel: number, volume: number) => void;
declare const programChange: (channel: number, program: number) => void;



export {
	WebMIDI,
	WebAudio,
	AudioTag,
	loadPlugin,
	noteOn,
	noteOff,
	stopAllNotes,
	setVolume,
	programChange,
};
