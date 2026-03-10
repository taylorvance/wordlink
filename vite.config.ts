/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.VITE_BASE_PATH ??
  (process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/')

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    allowedHosts: ['tvmini'],
  },
  test: {
    environment: 'node',
    include: ['scripts/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
