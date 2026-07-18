import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Builds the standalone embeddable chat widget as a single IIFE script,
// output alongside the main app's build (emptyOutDir: false) so both ship
// together as `dist/index.html` + assets and `dist/widget.js`. Any
// third-party site embeds it via:
//   <script src="https://<your-domain>/widget.js" data-chatbot-id="..." async></script>
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/widget/main.tsx'),
      output: {
        entryFileNames: 'widget.js',
        format: 'iife',
        // The widget is a single self-mounting script — no chunk splitting.
        inlineDynamicImports: true,
      },
    },
  },
})
