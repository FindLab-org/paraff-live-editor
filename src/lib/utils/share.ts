// URL sharing utilities with pako compression
import pako from 'pako';
import { Base64 } from 'js-base64';

export interface ShareState {
	code: string;
}

/**
 * Encode the editor state into a compressed, URL-safe string
 */
export function encodeState(state: ShareState): string {
	const json = JSON.stringify(state);
	const compressed = pako.deflate(json, { level: 9 });
	return Base64.fromUint8Array(compressed, true); // URL-safe base64
}

/**
 * Decode a compressed, URL-safe string back into editor state
 */
export function decodeState(encoded: string): ShareState | null {
	try {
		const compressed = Base64.toUint8Array(encoded);
		const json = pako.inflate(compressed, { to: 'string' });
		return JSON.parse(json);
	} catch (e) {
		console.error('Failed to decode state:', e);
		return null;
	}
}

/**
 * Get the current URL with the encoded state
 */
export function getShareUrl(state: ShareState): string {
	const encoded = encodeState(state);
	const url = new URL(window.location.href);
	url.searchParams.set('code', encoded);
	return url.toString();
}

/**
 * Parse state from the current URL
 */
export function getStateFromUrl(): ShareState | null {
	if (typeof window === 'undefined') return null;

	const params = new URLSearchParams(window.location.search);
	const encoded = params.get('code');

	if (!encoded) return null;

	return decodeState(encoded);
}

/**
 * Copy the share URL to clipboard
 */
export async function copyShareUrl(state: ShareState): Promise<boolean> {
	try {
		const url = getShareUrl(state);
		await navigator.clipboard.writeText(url);
		return true;
	} catch (e) {
		console.error('Failed to copy URL:', e);
		return false;
	}
}
