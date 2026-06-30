import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const envFile = resolve(process.cwd(), '.env.test')
if (existsSync(envFile)) {
  process.loadEnvFile(envFile)
}
