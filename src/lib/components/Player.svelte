<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { editorStore } from '$lib/stores/editor';
	import { getToolkit } from '$lib/verovio/toolkit';
	import MidiPlayer from '$lib/music-widgets/MidiPlayer';
	import * as MIDI from '$lib/music-widgets/MIDI';

	let isPlaying = false;
	let currentTime = 0;
	let duration = 0;
	let player: MidiPlayer | null = null;
	let midiAudio: any = null;

	async function initPlayer() {
		if (!$editorStore.mei) return;

		try {
			const toolkit = getToolkit();
			if (!toolkit) return;

			// Get MIDI data from Verovio
			const midiBase64 = toolkit.renderToMIDI();
			
			// Convert base64 to ArrayBuffer
			const binaryString = atob(midiBase64);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			// Parse MIDI
			const midi = MIDI.parseMidiData(bytes.buffer);
			
			// Initialize MidiAudio if not already done
			if (!midiAudio) {
				const { default: MidiAudio } = await import('$lib/music-widgets/MidiAudio');
				midiAudio = new MidiAudio();
				await midiAudio.loadPlugin();
			}

			// Create player with callbacks
			player = new MidiPlayer(midi, {
				onMidi: (event: any, when: number) => {
					if (midiAudio) {
						midiAudio.send(event, when);
					}
				},
				onPlayFinish: () => {
					stop();
				},
				onTurnCursor: (time: number) => {
					currentTime = time;
					highlightAtTime(time);
				}
			});

			duration = player.duration;
			currentTime = 0;
		} catch (error) {
			console.error('Failed to initialize player:', error);
		}
	}

	async function play() {
		if (!player || isPlaying) return;

		try {
			isPlaying = true;
			await player.play();
		} catch (error) {
			console.error('Playback error:', error);
			isPlaying = false;
		}
	}

	function pause() {
		if (player) {
			player.pause();
			isPlaying = false;
		}
	}

	function stop() {
		if (player) {
			player.pause();
			player.progressTime = 0;
			isPlaying = false;
			currentTime = 0;
			clearHighlights();
		}
	}

	function seekTo(percent: number) {
		if (!player) return;
		const targetTime = duration * percent;
		player.turnCursor(targetTime);
		currentTime = targetTime;
		if (!isPlaying) {
			highlightAtTime(targetTime);
		}
	}

	function highlightAtTime(time: number) {
		const toolkit = getToolkit();
		if (!toolkit) return;

		try {
			const elements = toolkit.getElementsAtTime(time);
			if (elements && elements.notes) {
				highlightNotes(elements.notes);
			}
		} catch (e) {
			// Timing API may fail at edges
		}
	}

	function highlightNotes(noteIds: string[]) {
		clearHighlights();
		noteIds.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				element.classList.add('verovio-highlight');
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

	$: if ($editorStore.mei) {
		initPlayer();
	}

	onDestroy(() => {
		stop();
		if (midiAudio) {
			midiAudio.dispose();
		}
	});
</script>

<div class="player-container">
	<div class="controls">
		{#if !isPlaying}
			<button class="control-btn play-btn" on:click={play} disabled={!player} title="Play">
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
		<button class="control-btn stop-btn" on:click={stop} disabled={!player || (!isPlaying && currentTime === 0)} title="Stop">
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<rect x="3" y="3" width="10" height="10" />
			</svg>
		</button>
	</div>

	<div class="time-display">
		<span class="time">{formatTime(currentTime)}</span>
		<span class="separator">/</span>
		<span class="duration">{formatTime(duration)}</span>
	</div>

	<div class="progress-bar" role="progressbar" on:click={(e) => {
		if (!player) return;
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
