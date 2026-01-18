// Verovio Toolkit wrapper for SvelteKit
import type { VerovioToolkit } from 'verovio';

let toolkit: VerovioToolkit | null = null;
let initPromise: Promise<VerovioToolkit> | null = null;

export interface RenderOptions {
	pageWidth?: number;
	pageHeight?: number;
	scale?: number;
	adjustPageHeight?: boolean;
	breaks?: 'auto' | 'none' | 'encoded';
}

const defaultOptions: RenderOptions = {
	pageWidth: 2100,
	pageHeight: 2970,
	scale: 40,
	adjustPageHeight: true,
	breaks: 'auto'
};

export async function initVerovio(): Promise<VerovioToolkit> {
	if (toolkit) return toolkit;

	if (initPromise) return initPromise;

	initPromise = (async () => {
		// Dynamic import for browser-only
		const verovio = await import('verovio');
		const VerovioToolkit = verovio.VerovioToolkit;

		// Load the WASM module
		const module = await verovio.default();

		toolkit = new VerovioToolkit(module);
		toolkit.setOptions(defaultOptions);

		console.log('Verovio initialized:', toolkit.getVersion());
		return toolkit;
	})();

	return initPromise;
}

export function getToolkit(): VerovioToolkit | null {
	return toolkit;
}

export async function renderMEI(
	mei: string,
	options?: Partial<RenderOptions>
): Promise<{ svg: string; pageCount: number; midi?: string }> {
	const tk = await initVerovio();

	if (options) {
		tk.setOptions({ ...defaultOptions, ...options });
	}

	const success = tk.loadData(mei);
	if (!success) {
		throw new Error('Failed to load MEI data');
	}

	const pageCount = tk.getPageCount();
	const svg = tk.renderToSVG(1);

	return { svg, pageCount };
}

export async function renderToMIDI(mei: string): Promise<string> {
	const tk = await initVerovio();
	tk.loadData(mei);
	return tk.renderToMIDI();
}

export async function getElementsAtTime(millisec: number): Promise<{
	notes: string[];
	page: number;
}> {
	const tk = await initVerovio();
	return tk.getElementsAtTime(millisec);
}
