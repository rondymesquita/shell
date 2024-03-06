import { basename, resolve } from 'path'
import { defineConfig } from 'vite'

const name = basename(process.cwd())

export default defineConfig({
  build: {
    lib: {
      entry: resolve(process.cwd(), 'src/index.ts'),
      name,
      fileName: name,
    },
  },
})