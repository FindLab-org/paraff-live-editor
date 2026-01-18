import { writable, derived, type Writable, type Readable } from 'svelte/store';

export interface EditorState {
	code: string;
	error: string | null;
	mei: string | null;
	svg: string | null;
	pageCount: number;
	currentPage: number;
	isRendering: boolean;
}

const initialState: EditorState = {
	code: `BOM K0 TN4 TD4 S1 Cg c D1 EOM`,
	error: null,
	mei: null,
	svg: null,
	pageCount: 0,
	currentPage: 1,
	isRendering: false
};

function createEditorStore() {
	const { subscribe, set, update }: Writable<EditorState> = writable(initialState);

	return {
		subscribe,
		setCode: (code: string) => update((s) => ({ ...s, code })),
		setMEI: (mei: string) => update((s) => ({ ...s, mei })),
		setSVG: (svg: string, pageCount: number) =>
			update((s) => ({ ...s, svg, pageCount, error: null })),
		setError: (error: string) => update((s) => ({ ...s, error, svg: null })),
		setRendering: (isRendering: boolean) => update((s) => ({ ...s, isRendering })),
		setPage: (page: number) => update((s) => ({ ...s, currentPage: page })),
		reset: () => set(initialState)
	};
}

export const editorStore = createEditorStore();

// Derived store for checking if we have valid output
export const hasOutput: Readable<boolean> = derived(editorStore, ($state) => $state.svg !== null);

// Derived store for checking if there's an error
export const hasError: Readable<boolean> = derived(
	editorStore,
	($state) => $state.error !== null
);
