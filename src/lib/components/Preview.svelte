<script lang="ts">
	import { editorStore } from '$lib/stores/editor';
	import Player from './PlayerV2.svelte';

	let svgContainer: HTMLDivElement;

	$: if (svgContainer && $editorStore.svg) {
		svgContainer.innerHTML = $editorStore.svg;
	}

	function downloadFile(content: string, filename: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function exportSVG() {
		if ($editorStore.svg) {
			downloadFile($editorStore.svg, 'paraff-score.svg', 'image/svg+xml');
		}
	}

	function exportMEI() {
		if ($editorStore.mei) {
			downloadFile($editorStore.mei, 'paraff-score.mei', 'application/xml');
		}
	}

	function copyMEI() {
		if ($editorStore.mei) {
			navigator.clipboard.writeText($editorStore.mei).then(() => {
				// Could add a toast notification here
			});
		}
	}
</script>

<div class="preview-wrapper">
	<div class="preview-header">
		<span class="title">Preview</span>
		{#if $editorStore.pageCount > 0}
			<span class="page-info">Page {$editorStore.currentPage} / {$editorStore.pageCount}</span>
		{/if}
		{#if $editorStore.isRendering}
			<span class="rendering">Rendering...</span>
		{/if}
		<div class="spacer"></div>
		<div class="export-buttons">
			<button class="export-btn" on:click={exportSVG} disabled={!$editorStore.svg} title="Download SVG">
				SVG
			</button>
			<button class="export-btn" on:click={exportMEI} disabled={!$editorStore.mei} title="Download MEI">
				MEI
			</button>
			<button class="export-btn" on:click={copyMEI} disabled={!$editorStore.mei} title="Copy MEI to clipboard">
				Copy
			</button>
		</div>
	</div>

	<div class="preview-container">
		{#if $editorStore.error}
			<div class="error-message">
				<div class="error-title">Error</div>
				<pre>{$editorStore.error}</pre>
			</div>
		{:else if $editorStore.svg}
			<div class="svg-container" bind:this={svgContainer}></div>
		{:else}
			<div class="placeholder">
				<p>Enter Paraff code to see the rendered score</p>
			</div>
		{/if}
	</div>

	<!-- Player controls at bottom -->
	{#if $editorStore.svg && !$editorStore.error}
		<Player />
	{/if}
</div>

<style>
	.preview-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #1e1e1e;
	}

	.preview-header {
		padding: 8px 16px;
		background: #252526;
		border-bottom: 1px solid #1e1e1e;
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.title {
		color: #cccccc;
		font-size: 14px;
		font-weight: 500;
	}

	.page-info {
		color: #858585;
		font-size: 12px;
	}

	.rendering {
		color: #569cd6;
		font-size: 12px;
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.preview-container {
		flex: 1;
		overflow: auto;
		padding: 16px;
		display: flex;
		justify-content: center;
		align-items: flex-start;
	}

	.svg-container {
		background: white;
		padding: 20px;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.svg-container :global(svg) {
		max-width: 100%;
		height: auto;
	}

	.error-message {
		background: #5a1d1d;
		border: 1px solid #be1100;
		border-radius: 4px;
		padding: 16px;
		max-width: 600px;
	}

	.error-title {
		color: #f48771;
		font-weight: 600;
		margin-bottom: 8px;
	}

	.error-message pre {
		color: #d4d4d4;
		font-size: 12px;
		white-space: pre-wrap;
		word-break: break-all;
		margin: 0;
	}

	.placeholder {
		color: #858585;
		text-align: center;
		padding: 40px;
	}

	.spacer {
		flex: 1;
	}

	.export-buttons {
		display: flex;
		gap: 8px;
	}

	.export-btn {
		background: #0e639c;
		color: #ffffff;
		border: none;
		padding: 4px 12px;
		border-radius: 3px;
		font-size: 12px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.export-btn:hover:not(:disabled) {
		background: #1177bb;
	}

	.export-btn:disabled {
		background: #3c3c3c;
		color: #858585;
		cursor: not-allowed;
	}

	.export-btn:active:not(:disabled) {
		background: #094771;
	}
</style>
