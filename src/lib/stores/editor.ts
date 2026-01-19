import { writable, derived, type Writable, type Readable } from 'svelte/store';

export interface EditorState {
	code: string;
	error: string | null;
	mei: string | null;
	svg: string | null;
	pageCount: number;
	isRendering: boolean;
	cursorElementId: string | null;
}

const initialState: EditorState = {
	code: `BOM K1 TN3 TD4 S1 Cg Md d Osup D4 EDp EslurL Mu g Osub D8 Bl a D8 b D8 c D8 Br VB S2 Cf Md g b d D2 a D4 EOM
BOM K1 TN3 TD4 S1 Cg Md d Osup D4 EslurR Mu g Osub D4 Est g D4 Est VB S2 Cf Md b D2 Dot EOM
BOM K1 TN3 TD4 S1 Cg Mu f As D4 EslurL g D8 Bl a D8 b D8 g D8 Br VB S2 Cf Md d D4 b D4 g D4 EOM
BOM K1 TN3 TD4 S1 Cg Mu b d g D2 Dot VB S2 Cf Md g D2 Dot EOM`,
	error: null,
	mei: null,
	svg: null,
	pageCount: 0,
	isRendering: false,
	cursorElementId: null
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
		setCursorElement: (cursorElementId: string | null) => update((s) => ({ ...s, cursorElementId })),
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
