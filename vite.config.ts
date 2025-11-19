import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import inject from '@rollup/plugin-inject'
import devtoolsJson from 'vite-plugin-devtools-json'

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    inject({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
    }),
    devtoolsJson(),
  ],
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
    },
  },
})
