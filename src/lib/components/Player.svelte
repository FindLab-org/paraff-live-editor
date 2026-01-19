<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { editorStore } from '$lib/stores/editor';
	import { getToolkit } from '$lib/verovio/toolkit';
	import { MIDI, MidiPlayer, MusicNotation } from '@k-l-lambda/music-widgets';
	import { MidiAudio } from '@k-l-lambda/music-widgets/dist/musicWidgetsBrowser.es.js';

	let isPlaying = false;
	let currentTime = 0;
	let duration = 0;
	let midiPlayer: any = null;
	let midiData: any = null;
	let isAudioLoaded = false;
	let highlightedNotes: Set<string> = new Set();

	onMount(async () => {
		try {
			await MidiAudio.loadPlugin({
				soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/',
				api: 'webaudio'
			});
			isAudioLoaded = true;
			console.log('MidiAudio loaded');
		} catch (error) {
			console.error('Failed to load MidiAudio:', error);
		}
	});

	async function initPlayer() {
		if (!$editorStore.mei || !isAudioLoaded) return;

		try {
			const toolkit = getToolkit();
			if (!toolkit) return;

			const midiBase64 = toolkit.renderToMIDI();
			const binaryString = atob(midiBase64);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			const rawMidiData = MIDI.parseMidiData(bytes.buffer);
			// Parse to notation and add default tempo if missing
			const notation = MusicNotation.Notation.parseMidi(rawMidiData);
			if (!notation.tempos || notation.tempos.length === 0) {
				// Add default tempo (120 BPM = 500000 microseconds per beat)
				notation.tempos = [{ tempo: 500000, tick: 0, time: 0 }];
			}
			midiData = notation;

			if (midiPlayer) {
				midiPlayer.dispose();
			}

			midiPlayer = new MidiPlayer(midiData, {
				cacheSpan: 400,
				onMidi: (data: any, timestamp: number) => {
					switch (data.subtype) {
						case 'noteOn':
							MidiAudio.noteOn(data.channel, data.noteNumber, data.velocity, timestamp);
							break;
						case 'noteOff':
							MidiAudio.noteOff(data.channel, data.noteNumber, timestamp);
							break;
						case 'programChange':
							MidiAudio.programChange(data.channel, data.programNumber);
							break;
					}

					// Update highlights based on current playback time
					if (midiPlayer) {
						updateHighlights(midiPlayer.progressTime);
					}
				},
				onTurnCursor: (time: number) => {
					currentTime = time;
				},
				onPlayFinish: () => {
					if (updateInterval) {
						clearInterval(updateInterval);
						updateInterval = null;
					}
					isPlaying = false;
					currentTime = 0;
					clearHighlights();
				}
			});

			duration = midiData.endTime;
		} catch (error) {
			console.error('Failed to initialize player:', error);
		}
	}

	let updateInterval: number | null = null;

	let playStartTime = 0;
	let lastEventIndex = 0;

	async function play() {
		if (!midiPlayer || !midiData || isPlaying) return;
		isPlaying = true;
		playStartTime = performance.now();
		lastEventIndex = 0;

		// Start interval to drive playback manually
		updateInterval = setInterval(() => {
			if (!isPlaying || !midiData) return;

			const now = performance.now();
			const elapsed = now - playStartTime;
			currentTime = elapsed;

			// Send MIDI events that should have played by now
			const events = midiData.events;
			for (; lastEventIndex < events.length; lastEventIndex++) {
				const event = events[lastEventIndex];
				if (event.time > elapsed) break;

				// Send channel events (noteOn, noteOff, etc.)
				if (event.data.type === 'channel') {
					const timestamp = playStartTime + event.time;
					switch (event.data.subtype) {
						case 'noteOn':
							MidiAudio.noteOn(event.data.channel, event.data.noteNumber, event.data.velocity, timestamp);
							break;
						case 'noteOff':
							MidiAudio.noteOff(event.data.channel, event.data.noteNumber, timestamp);
							break;
						case 'programChange':
							MidiAudio.programChange(event.data.channel, event.data.programNumber);
							break;
					}
				}
			}

			// Update highlights
			updateHighlights(currentTime);

			// Check if playback finished
			if (elapsed >= duration) {
				stop();
			}
		}, 30) as unknown as number;
	}

	let pausedTime = 0;

	function pause() {
		if (updateInterval) {
			clearInterval(updateInterval);
			updateInterval = null;
		}
		pausedTime = currentTime;
		isPlaying = false;
		// Stop all notes
		MidiAudio.stopAllNotes?.();
	}

	function stop() {
		if (updateInterval) {
			clearInterval(updateInterval);
			updateInterval = null;
		}
		isPlaying = false;
		currentTime = 0;
		pausedTime = 0;
		lastEventIndex = 0;
		clearHighlights();
		// Stop all notes
		MidiAudio.stopAllNotes?.();
	}

	function updateHighlights(time: number) {
		const toolkit = getToolkit();
		if (!toolkit) return;

		try {
			// Get elements at current time (time is in ms)
			const result = toolkit.getElementsAtTime(time);
			const newNotes = new Set<string>(result.notes || []);

			// Remove highlights from notes no longer playing
			highlightedNotes.forEach(id => {
				if (!newNotes.has(id)) {
					const element = document.getElementById(id);
					if (element) {
						element.classList.remove('verovio-highlight');
					}
				}
			});

			// Add highlights to new notes
			newNotes.forEach(id => {
				if (!highlightedNotes.has(id)) {
					const element = document.getElementById(id);
					if (element) {
						element.classList.add('verovio-highlight');
					}
				}
			});

			highlightedNotes = newNotes;

			// Update cursor position - use the first note as cursor position
			const noteIds = result.notes || [];
			if (noteIds.length > 0) {
				editorStore.setCursorElement(noteIds[0]);
			}
		} catch (error) {
			// Ignore errors during highlight update
		}
	}

	function highlightNotes(noteIds: string[], on: boolean) {
		noteIds.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				if (on) {
					element.classList.add('verovio-highlight');
				} else {
					element.classList.remove('verovio-highlight');
				}
			}
		});
	}

	function clearHighlights() {
		highlightedNotes.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				element.classList.remove('verovio-highlight');
			}
		});
		highlightedNotes = new Set();
		editorStore.setCursorElement(null);
	}

	function formatTime(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	function seekTo(percent: number) {
		if (!midiPlayer) return;
		const targetTime = duration * percent;
		midiPlayer.turnCursor(targetTime);
	}

	$: if ($editorStore.mei && isAudioLoaded) {
		initPlayer();
	}

	onDestroy(() => {
		stop();
		if (midiPlayer) {
			midiPlayer.dispose();
		}
	});
</script>

<div class="player-container">
	<div class="controls">
		{#if !isPlaying}
			<button class="control-btn play-btn" on:click={play} disabled={!midiPlayer || !isAudioLoaded} title="Play">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path d="M3 2v12l10-6z" />
				</svg>
			</button>
		{:else}
			<button class="control-btn pause-btn" on:click={pause} title="Pause">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path d="M4 2h3v12H4zM9 2h3v12H9z" />
				</svg>
			</button>
		{/if}
		<button class="control-btn stop-btn" on:click={stop} disabled={!isPlaying && currentTime === 0} title="Stop">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<rect x="3" y="3" width="10" height="10" />
			</svg>
		</button>
		{#if !isAudioLoaded}
			<span class="loading-text">Loading audio...</span>
		{/if}
	</div>

	<div class="time-display">
		<span class="time">{formatTime(currentTime)}</span>
		<span class="separator">/</span>
		<span class="duration">{formatTime(duration)}</span>
	</div>

	<div class="progress-bar" role="progressbar" on:click={(e) => {
		if (!midiPlayer) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const percent = x / rect.width;
		seekTo(percent);
	}}>
		<div class="progress-fill" style="width: {duration > 0 ? (currentTime / duration) * 100 : 0}%"></div>
	</div>
</div>

<style>
	.player-container {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		background: #2d2d30;
		border-top: 1px solid #1e1e1e;
	}

	.controls {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.control-btn {
		background: transparent;
		border: 1px solid #3c3c3c;
		color: #cccccc;
		width: 32px;
		height: 32px;
		border-radius: 4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.control-btn:hover:not(:disabled) {
		background: #3c3c3c;
		border-color: #569cd6;
	}

	.control-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.play-btn:hover:not(:disabled) {
		color: #4ec9b0;
	}

	.pause-btn {
		color: #dcdcaa;
	}

	.stop-btn:hover:not(:disabled) {
		color: #f48771;
	}

	.loading-text {
		color: #858585;
		font-size: 11px;
		margin-left: 8px;
	}

	.time-display {
		display: flex;
		gap: 4px;
		font-size: 12px;
		color: #cccccc;
		font-family: 'Consolas', 'Monaco', monospace;
		min-width: 80px;
	}

	.separator {
		color: #858585;
	}

	.progress-bar {
		flex: 1;
		height: 4px;
		background: #3c3c3c;
		border-radius: 2px;
		cursor: pointer;
		position: relative;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: #569cd6;
		transition: width 0.1s linear;
	}

	:global(.verovio-highlight) {
		fill: #007acc !important;
		opacity: 0.8;
	}
</style>
