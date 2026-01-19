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

					if (data.ids) {
						highlightNotes(data.ids, data.subtype === 'noteOn');
					}
				},
				onTurnCursor: (time: number) => {
					currentTime = time;
				},
				onPlayFinish: () => {
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

	async function play() {
		if (!midiPlayer || isPlaying) return;
		isPlaying = true;
		await midiPlayer.play();
	}

	function pause() {
		if (midiPlayer) {
			midiPlayer.pause();
			isPlaying = false;
		}
	}

	function stop() {
		if (midiPlayer) {
			midiPlayer.pause();
			midiPlayer.progressTime = 0;
			isPlaying = false;
			currentTime = 0;
			clearHighlights();
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
		const highlighted = document.querySelectorAll('.verovio-highlight');
		highlighted.forEach(el => el.classList.remove('verovio-highlight'));
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

	$: if (midiPlayer) {
		currentTime = midiPlayer.progressTime;
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
