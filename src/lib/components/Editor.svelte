<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { EditorState } from '@codemirror/state';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { editorStore } from '$lib/stores/editor';

	let editorContainer: HTMLDivElement;
	let view: EditorView | null = null;

	// Debounce timer
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleUpdate(update: any) {
		if (update.docChanged) {
			const code = update.state.doc.toString();

			// Debounce the store update
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				editorStore.setCode(code);
			}, 300);
		}
	}

	onMount(async () => {
		// Get initial code from store
		let initialCode = '';
		const unsubscribe = editorStore.subscribe((state) => {
			initialCode = state.code;
		});
		unsubscribe();

		const state = EditorState.create({
			doc: initialCode,
			extensions: [
				basicSetup,
				oneDark,
				EditorView.updateListener.of(handleUpdate),
				EditorView.lineWrapping
			]
		});

		view = new EditorView({
			state,
			parent: editorContainer
		});
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
		view?.destroy();
	});
</script>

<div class="editor-wrapper">
	<div class="editor-header">
		<span class="title">Paraff Editor</span>
	</div>
	<div class="editor-container" bind:this={editorContainer}></div>
</div>

<style>
	.editor-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #282c34;
	}

	.editor-header {
		padding: 8px 16px;
		background: #21252b;
		border-bottom: 1px solid #181a1f;
	}

	.title {
		color: #abb2bf;
		font-size: 14px;
		font-weight: 500;
	}

	.editor-container {
		flex: 1;
		overflow: auto;
	}

	.editor-container :global(.cm-editor) {
		height: 100%;
	}

	.editor-container :global(.cm-scroller) {
		font-family: 'Fira Code', 'Consolas', monospace;
		font-size: 14px;
	}
</style>
