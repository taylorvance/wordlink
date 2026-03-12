import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

type WordLength = 3 | 4

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const shellEnvKeys = new Set(Object.keys(process.env))

function parseEnvLine(line: string): { key: string; value: string } | null {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
  if (!match) return null

  const [, key, rawValue] = match
  let value = rawValue.trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return { key, value }
}

function loadEnvFile(fileName: string): void {
  const filePath = path.join(ROOT, fileName)
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const entry = parseEnvLine(line)
    if (!entry || shellEnvKeys.has(entry.key)) continue

    process.env[entry.key] = entry.value
  }
}

function readNonNegativeIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback

  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`[config] ${name} must be a non-negative integer, received "${raw}"`)
  }

  return value
}

loadEnvFile('.env')
loadEnvFile('.env.local')

export const MIN_FREQUENCY_COUNT_DEFAULT: Record<WordLength, number> = {
  3: readNonNegativeIntegerEnv('WORDLINK_MIN_FREQUENCY_3', 10_000_000),
  4: readNonNegativeIntegerEnv('WORDLINK_MIN_FREQUENCY_4', 650_000),
}
