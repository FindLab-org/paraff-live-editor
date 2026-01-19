/*
	loadPlugin({
		targetFormat: "mp3", // optionally can force to use MP3 (for instance on mobile networks)
		instrument: "acoustic_grand_piano", // or 1 (default)
		instruments: [ "acoustic_grand_piano", "acoustic_guitar_nylon" ], // or multiple instruments
		callback: function() { }
	});
*/

import audioDetect from "./AudioDetect.js";
import MIDI from "./Plugin.js";
import script from "./Window/DOMLoader.script.js";
import sendRequest from "./Window/DOMLoader.XMLHttp.js";



const DOMLoader = { script, sendRequest };


// inherit global soundfont resource
MIDI.Soundfont = window.MIDI && window.MIDI.Soundfont || {};


// This is required, because soundfont script suppose window.MIDI is the MIDI API root.
window.MIDI = MIDI;


MIDI.audioDetect = audioDetect;


const USE_JAZZMIDI = false; // Turn on to support JazzMIDI Plugin

const connect = {};


MIDI.loadPlugin = function (conf = {}) {
	if (typeof (conf) === "function") {
		conf = {
			callback: conf,
		};
	}
	/// Get the instrument name.
	var instruments = conf.instruments || conf.instrument || "acoustic_grand_piano";
	if (typeof (instruments) !== "object")
		instruments = [ instruments ];
	///
	for (var n = 0; n < instruments.length; n++) {
		var instrument = instruments[n];
		if (typeof (instrument) === "number")
			instruments[n] = MIDI.GeneralMIDI.byId[instrument];
	};
	///
	MIDI.soundfontUrl = conf.soundfontUrl || MIDI.soundfontUrl || "./soundfont/";
	/// Detect the best type of audio to use.
	MIDI.audioDetect(function (types) {
		var api = "";
		// use the most appropriate plugin if not specified
		if (apis[conf.api])
			api = conf.api;
		else if (USE_JAZZMIDI && navigator.requestMIDIAccess)
			api = "webmidi";
		else if (window.webkitAudioContext || window.AudioContext) { // Chrome
			api = "webaudio";
		}
		else if (window.Audio) { // Firefox
			api = "audiotag";
		}
		else { // Internet Explorer
			api = "flash";
		}
		///
		if (!connect[api]) return;
		// use audio/ogg when supported
		let filetype;
		if (conf.targetFormat)
			filetype = conf.targetFormat;
		else { // use best quality
			filetype = types["audio/ogg"] ? "ogg" : "mp3";
		}
		// load the specified plugin
		MIDI.lang = api;
		MIDI.supports = types;
		connect[api](filetype, instruments, conf);
	});

	if (!conf.callback)
		return new Promise(resolve => conf.callback = resolve);
};

///

connect.webmidi = function (filetype, instruments, conf) {
	if (MIDI.loader) MIDI.loader.message("Web MIDI API...");
	MIDI.WebMIDI.connect(conf);
};

connect.flash = function (filetype, instruments, conf) {
	// fairly quick, but requires loading of individual MP3s (more http requests).
	if (MIDI.loader) MIDI.loader.message("Flash API...");
	DOMLoader.script.add({
		src: conf.soundManagerUrl || "./inc/SoundManager2/script/soundmanager2.js",
		verify: "SoundManager",
		callback: function () {
			MIDI.Flash.connect(instruments, conf);
		},
	});
};

connect.audiotag = function (filetype, instruments, conf) {
	if (MIDI.loader)
		MIDI.loader.message("HTML5 Audio API...");
	// works ok, kinda like a drunken tuna fish, across the board.
	const queue = createQueue({
		items: instruments,
		getNext (instrumentId) {
			if (MIDI.Soundfont[instrumentId])
				queue.getNext();
			else
				DOMLoader.sendRequest({
					url: MIDI.soundfontUrl + instrumentId + "-" + filetype + ".js",
					onprogress: getPercent,
					onload (response) {
						addSoundfont(response.responseText);
						if (MIDI.loader)
							MIDI.loader.update(null, "Downloading", 100);
						queue.getNext();
					},
				});
		},
		onComplete () {
			MIDI.AudioTag.connect(conf);
		},
	});
};

connect.webaudio = function (filetype, instruments, conf) {
	if (MIDI.loader)
		MIDI.loader.message("Web Audio API...");
	// works awesome! safari, chrome and firefox support.
	const queue = createQueue({
		items: instruments,
		getNext (instrumentId) {
			if (MIDI.Soundfont[instrumentId]) {
				queue.getNext();
				return;
			}

			MIDI.WebAudio.pendingInstruments[instruments] = true;

			DOMLoader.sendRequest({
				url: MIDI.soundfontUrl + instrumentId + "-" + filetype + ".js",
				onprogress: getPercent,
				onload (response) {
					addSoundfont(response.responseText);
					if (MIDI.loader)
						MIDI.loader.update(null, "Downloading...", 100);
					queue.getNext();

					delete MIDI.WebAudio.pendingInstruments[instruments];
				},
				onerror (err) {
					if (MIDI.loader)
						MIDI.loader.update(err, "Download failed.");

					delete MIDI.WebAudio.pendingInstruments[instruments];
				},
			});
		},
		onComplete () {
			//console.log("connect.webaudio.onComplete", MIDI.WebAudio.connect);
			MIDI.WebAudio.connect(conf);
		},
	});
};

/// Helpers

const apis = {
	webmidi: true,
	webaudio: true,
	audiotag: true,
	flash: true,
};

const addSoundfont = function (text) {
	var script = document.createElement("script");
	script.language = "javascript";
	script.type = "text/javascript";
	script.text = text;
	document.body.appendChild(script);
};

const getPercent = function (event) {
	if (!this.totalSize) {
		if (this.getResponseHeader("Content-Length-Raw"))
			this.totalSize = parseInt(this.getResponseHeader("Content-Length-Raw"));
		else
			this.totalSize = event.total;
	}
	///
	const percent = this.totalSize ? Math.round(event.loaded / this.totalSize * 100) : "";
	if (MIDI.loader)
		MIDI.loader.update(null, "Downloading...", percent);
};

const createQueue = function (conf) {
	const self = {};
	self.queue = [];
	for (const key in conf.items) {
		if (conf.items.hasOwnProperty(key))
			self.queue.push(conf.items[key]);
	}
	self.getNext = function () {
		if (!self.queue.length)
			return conf.onComplete();
		conf.getNext(self.queue.shift());
	};
	setTimeout(self.getNext, 1);
	return self;
};



export default MIDI.loadPlugin;
