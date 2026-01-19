<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Editor from '$lib/components/Editor.svelte';
	import Preview from '$lib/components/Preview.svelte';
	import { editorStore } from '$lib/stores/editor';
	import { paraffToMEI } from '$lib/paraff';
	import { getStateFromUrl, copyShareUrl } from '$lib/utils/share';
	import { initVerovio, getToolkit } from '$lib/verovio/toolkit';

	let verovioReady = false;
	let shareStatus: 'idle' | 'copied' | 'error' = 'idle';

	// Watch for code changes and re-render
	$: if (browser && verovioReady && $editorStore.code) {
		renderScore($editorStore.code);
	}

	async function handleShare() {
		const success = await copyShareUrl({ code: $editorStore.code });
		shareStatus = success ? 'copied' : 'error';
		setTimeout(() => {
			shareStatus = 'idle';
		}, 2000);
	}

	async function setupVerovio() {
		try {
			await initVerovio();
			verovioReady = true;
		} catch (err) {
			console.error('Failed to initialize Verovio:', err);
			editorStore.setError('Failed to initialize Verovio: ' + String(err));
		}
	}

	async function renderScore(code: string) {
		const toolkit = getToolkit();
		if (!toolkit) return;

		editorStore.setRendering(true);

		try {
			// Convert Paraff to MEI
			const mei = paraffToMEI(code);
			if (!mei) {
				editorStore.setError('Failed to parse Paraff code');
				return;
			}

			editorStore.setMEI(mei);

			// Render with Verovio
			const success = toolkit.loadData(mei);
			if (!success) {
				editorStore.setError('Verovio failed to load MEI data');
				return;
			}

			const pageCount = toolkit.getPageCount();
			const svg = toolkit.renderToSVG(1);

			editorStore.setSVG(svg, pageCount);
		} catch (err) {
			console.error('Render error:', err);
			editorStore.setError(String(err));
		} finally {
			editorStore.setRendering(false);
		}
	}

	onMount(() => {
		if (browser) {
			// Load state from URL if present
			const urlState = getStateFromUrl();
			if (urlState?.code) {
				editorStore.setCode(urlState.code);
			}

			setupVerovio();
		}
	});
</script>

<svelte:head>
	<title>Paraff Live Editor</title>
</svelte:head>

<div class="app">
	<header>
		<h1>Paraff Live Editor</h1>
		<div class="header-actions">
			<button class="share-btn" on:click={handleShare}>
				{#if shareStatus === 'copied'}
					Copied!
				{:else if shareStatus === 'error'}
					Error
				{:else}
					Share
				{/if}
			</button>
			<span class="status">
				{#if !verovioReady}
					Loading Verovio...
				{:else}
					Ready
				{/if}
			</span>
		</div>
	</header>

	<main>
		<div class="pane editor-pane">
			<Editor />
		</div>
		<div class="divider"></div>
		<div class="pane preview-pane">
			<Preview />
		</div>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
		background: #1e1e1e;
		color: #d4d4d4;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: #333333;
		border-bottom: 1px solid #454545;
	}

	h1 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: #ffffff;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.share-btn {
		background: #0e639c;
		color: #ffffff;
		border: none;
		padding: 6px 16px;
		border-radius: 3px;
		font-size: 13px;
		cursor: pointer;
		transition: background 0.2s;
		min-width: 80px;
	}

	.share-btn:hover {
		background: #1177bb;
	}

	.share-btn:active {
		background: #094771;
	}

	.status {
		font-size: 12px;
		color: #858585;
	}

	main {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.pane {
		flex: 1;
		overflow: hidden;
	}

	.editor-pane {
		flex: 0 0 40%;
		min-width: 300px;
	}

	.preview-pane {
		flex: 1;
	}

	.divider {
		width: 4px;
		background: #333333;
		cursor: col-resize;
	}

	.divider:hover {
		background: #0078d4;
	}
</style>
