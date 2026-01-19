# Code Review Report - paraff-live-editor

**Reviewed by:** GPT-5.2 via MCP
**Date:** 2026-01-19

## Project Overview

A SvelteKit application providing a live editor for Paraff notation (a music notation DSL). Key features:
- Code editor for Paraff notation
- Real-time rendering to sheet music using Verovio
- MIDI playback with note highlighting and cursor
- URL sharing of scores

## Architecture Assessment

### What's Working Well
- Clear separation of concerns: editor, preview, player are distinct components
- Good use of `browser` guards in `+page.svelte` to avoid SSR pitfalls
- Verovio initialization is correctly split (`verovio/wasm` + `verovio/esm`) and memoized
- URL sharing is nicely encapsulated with compression (`pako`) + URL-safe base64

### Architecture Improvements Suggested
1. Move rendering pipeline out of `+page.svelte` into a dedicated service
2. Consider splitting store into domain stores (playback vs rendering state)
3. Static adapter + fallback is correct for GitHub Pages SPA mode

---

## Issues Identified

### HIGH PRIORITY - Bugs

#### 1. MIDI Playback Pause/Resume is Broken
**File:** `src/lib/components/Player.svelte`

`pausedTime` is tracked but `play()` always resets:
```ts
playStartTime = performance.now();
lastEventIndex = 0;
```
So "pause then play" restarts from 0, not from `pausedTime`.

**Fix:** On play after pause, set `playStartTime = performance.now() - pausedTime` and seek `lastEventIndex` to the correct position.

#### 2. `seekTo()` Doesn't Integrate with Manual Playback Loop
**File:** `src/lib/components/Player.svelte`

`seekTo()` calls `midiPlayer.turnCursor(targetTime)`, but actual playback uses `setInterval` with `lastEventIndex`. Seeking won't update these, causing desync.

**Fix:** Implement consistent internal transport - on seek, update `currentTime`, `pausedTime`, and recompute `lastEventIndex`.

#### 3. Rendering Only Page 1 While Storing pageCount
**File:** `src/routes/+page.svelte`

`pageCount` is computed but always renders `renderToSVG(1)`. `currentPage` exists in store but is unused.

**Fix:** Either implement page navigation or remove unused `currentPage` from store.

---

### MEDIUM PRIORITY - Security & Performance

#### 4. SVG innerHTML XSS Surface
**File:** `src/lib/components/Preview.svelte`

```ts
svgContainer.innerHTML = $editorStore.svg;
```
Since SVG is produced from user-supplied code, this is a potential XSS surface.

**Fix:** Use DOMParser and only append the `<svg>` element, or document trust boundary.

#### 5. Cursor Overlay Element Lookup is Global
**File:** `src/lib/components/Preview.svelte`

```ts
const noteElement = document.getElementById(elementId);
```
If multiple SVGs exist, this becomes ambiguous.

**Fix:** Query within `svgContainer` using `svgContainer.querySelector()`.

#### 6. Rendering Without Cancellation
**File:** `src/routes/+page.svelte`

Reactive block doesn't cancel in-flight renders. Fast typing can cause out-of-order updates.

**Fix:** Add render token pattern - capture `renderId`, check before committing results.

#### 7. DOM Class Changes Per Tick
**File:** `src/lib/components/Player.svelte`

Highlighting loops do `document.getElementById` repeatedly every ~30ms.

**Fix:** Cache resolved SVG elements by id after each render.

#### 8. Continuous `getElementsAtTime` Calls
**File:** `src/lib/components/Player.svelte`

Called frequently, potentially expensive.

**Fix:** Throttle to 60-100ms or precompute time map.

---

### LOW PRIORITY - Best Practices

#### 9. Dead Vue Dependency
**File:** `package.json`

`vue` is listed but only present for `music-widgets` browser build workaround.

**Fix:** Remove if not required, or document why it's included.

#### 10. Type Safety - Multiple `any` Usages
**Files:** `src/lib/components/Editor.svelte`, `src/lib/components/Player.svelte`

- `handleUpdate(update: any)` - should be `ViewUpdate`
- `midiPlayer: any`, `midiData: any` - should have proper types

**Fix:** Add proper TypeScript types.

#### 11. URL Doesn't Reflect Current State
**File:** `src/lib/utils/share.ts`

URL only updates on explicit Share click.

**Fix:** Consider `history.replaceState` with throttling for "share by copy address bar" UX.

#### 12. External Soundfont URL
**File:** `src/lib/components/Player.svelte`

Loads from `gleitz.github.io` - reliability and latency risk.

**Fix:** Make URL configurable or self-host. Add error state for failed loads.

---

## Summary of Actionable Fixes

| Priority | Issue | File | Status |
|----------|-------|------|--------|
| HIGH | Fix pause/resume | Player.svelte | DONE |
| HIGH | Fix seekTo() | Player.svelte | DONE |
| HIGH | Remove unused currentPage | editor.ts | DONE |
| MEDIUM | Safer SVG injection | Preview.svelte | DONE |
| MEDIUM | Scoped element lookup | Preview.svelte | DONE |
| MEDIUM | Render cancellation | +page.svelte | DONE |
| MEDIUM | Cache highlight elements | Player.svelte | DONE |
| MEDIUM | Throttle getElementsAtTime | Player.svelte | DONE |
| LOW | Remove vue dependency | package.json | DONE |
| LOW | Add TypeScript types | Multiple | DONE |
| LOW | URL state sync | share.ts | SKIPPED (low priority) |
| LOW | Soundfont error handling | Player.svelte | DONE |

## Changes Made (2026-01-19)

### Player.svelte
- Fixed pause/resume: now properly resumes from paused position using `pausedTime`
- Fixed seekTo(): now updates `lastEventIndex`, `currentTime`, `pausedTime`, and `playStartTime`
- Added binary search function `findEventIndexAtTime()` for efficient event seeking
- Added element caching with `Map<string, Element>` for performance
- Added throttling for `getElementsAtTime()` calls (50ms minimum interval)
- Added TypeScript interfaces for MIDI data structures
- Added audio load error handling with UI feedback

### Preview.svelte
- Implemented safer SVG injection using DOMParser instead of innerHTML
- Changed element lookup to use scoped `svgContainer.querySelector()` with CSS.escape()
- Removed unused page info display

### +page.svelte
- Added render cancellation with incrementing `currentRenderId` token
- Checks token validity before each store update to prevent out-of-order updates

### editor.ts
- Removed unused `currentPage` and `setPage` from store

### package.json
- Removed unnecessary `vue` dependency (build works without it)
