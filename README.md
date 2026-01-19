# Paraff Live Editor

[![Deploy to GitHub Pages](https://github.com/FindLab-org/paraff-live-editor/actions/workflows/deploy.yml/badge.svg)](https://github.com/FindLab-org/paraff-live-editor/actions/workflows/deploy.yml)

A live editor for [Paraff](https://github.com/k-l-lambda/paraff) music notation with real-time MEI conversion and Verovio rendering.

## Features

- **Real-time Preview**: See your music notation rendered instantly as you type
- **Paraff to MEI Conversion**: Automatic conversion from Paraff tokens to MEI (Music Encoding Initiative) format
- **Verovio Rendering**: High-quality music engraving powered by Verovio WASM
- **Split-pane Layout**: Side-by-side editor and preview with adjustable divider
- **Dark Theme**: CodeMirror One Dark theme for comfortable editing

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [SvelteKit](https://kit.svelte.dev/) | Frontend framework |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [CodeMirror 6](https://codemirror.net/) | Code editor |
| [Verovio](https://www.verovio.org/) | Music notation rendering (WASM) |
| [Vite](https://vitejs.dev/) | Build tool |

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/FindLab-org/paraff-live-editor.git
cd paraff-live-editor

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173/`

### Build for Production

```bash
npm run build
npm run preview
```

## Usage

Enter Paraff notation in the editor:

```
BOM K0 TN4 TD4 S1 Cg c D1 EOM
```

This renders:
- `BOM` / `EOM` - Begin/End of measure
- `K0` - Key signature (C major)
- `TN4 TD4` - Time signature (4/4)
- `S1` - Staff 1
- `Cg` - Treble clef (G clef)
- `c D1` - Note C, whole note duration

## Implementation Details

### Verovio WASM Initialization

Verovio requires separate imports for the WASM module and toolkit:

```typescript
// Import WASM module and toolkit separately
const createVerovioModule = (await import('verovio/wasm')).default;
const { VerovioToolkit } = await import('verovio/esm');

// Initialize the WASM module
const VerovioModule = await createVerovioModule();

// Create toolkit instance
const toolkit = new VerovioToolkit(VerovioModule);
toolkit.setOptions({
    pageWidth: 2100,
    pageHeight: 1000,
    scale: 50,
    adjustPageHeight: true
});
```

### Rendering Pipeline

```
Paraff Code → Parser → MEI XML → Verovio → SVG
```

1. User input is captured by CodeMirror with 300ms debounce
2. Paraff parser converts tokens to a structured representation
3. MEI encoder generates valid MEI XML
4. Verovio renders MEI to SVG
5. SVG is displayed in the preview pane

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── Editor.svelte      # CodeMirror editor
│   │   └── Preview.svelte     # SVG preview
│   ├── paraff/
│   │   └── index.ts           # Paraff parser + MEI encoder
│   ├── stores/
│   │   └── editor.ts          # Svelte stores
│   └── verovio/
│       └── toolkit.ts         # Verovio wrapper
└── routes/
    ├── +layout.svelte
    ├── +layout.ts
    └── +page.svelte           # Main page
```

## Testing

Run headless browser tests with Puppeteer:

```bash
node test-browser.mjs
```

## License

MIT

## Related Projects

- [Paraff](https://github.com/k-l-lambda/paraff) - Domain-specific language for sheet music
- [Verovio](https://www.verovio.org/) - Music notation engraving library
- [Mermaid Live Editor](https://github.com/mermaid-js/mermaid-live-editor) - Architecture inspiration
