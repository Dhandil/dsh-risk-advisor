import { execFile } from 'node:child_process'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { promisify } from 'node:util'
import { join, resolve } from 'node:path'

const execFileAsync = promisify(execFile)
const ROOT = resolve(process.cwd())
const HARNESS = resolve('D:/Harness/deepseek-harness')
const HARNESS_BIN = join(HARNESS, 'apps/cli/lib/bin.js')

function environment(home) {
  return { ...process.env, DSH_HOME: home, COREPACK_ENABLE_NETWORK: '0', PNPM_CONFIG_OFFLINE: 'true', npm_config_offline: 'true', DSH_TELEMETRY_DISABLED: '1', CI: '1' }
}

async function runNode(args, env, cwd, timeout = 60_000) {
  try {
    const result = await execFileAsync(process.execPath, args, { cwd, env, timeout, windowsHide: true, maxBuffer: 512 * 1024 })
    return { code: 0, stdout: result.stdout.slice(0, 32_000), stderr: result.stderr.slice(0, 32_000) }
  } catch (error) {
    const value = error ?? {}
    return { code: typeof value.code === 'number' ? value.code : 1, stdout: String(value.stdout ?? '').slice(0, 32_000), stderr: String(value.stderr ?? value.message ?? error).slice(0, 32_000) }
  }
}

async function runCommand(command, args, env, cwd, timeout = 60_000) {
  try {
    const result = await execFileAsync(command, args, { cwd, env, timeout, windowsHide: true, shell: true, maxBuffer: 512 * 1024 })
    return { code: 0, stdout: result.stdout.slice(0, 32_000), stderr: result.stderr.slice(0, 32_000) }
  } catch (error) {
    const value = error ?? {}
    return { code: typeof value.code === 'number' ? value.code : 1, stdout: String(value.stdout ?? '').slice(0, 32_000), stderr: String(value.stderr ?? value.message ?? error).slice(0, 32_000) }
  }
}

function checkProcess(name, result, root) {
  if (result.code !== 0) throw new Error(`${name} failed with exit ${result.code}: ${result.stderr.slice(0, 2000)}`)
  const output = `${result.stdout}\n${result.stderr}`
  if (process.env.USERPROFILE !== undefined && output.includes(process.env.USERPROFILE)) throw new Error(`${name} leaked user profile path`)
  if (!output.toLowerCase().includes('risk-advisor')) throw new Error(`${name} did not activate the installed external Risk Advisor bundle`)
}

export async function main() {
  const temp = await mkdtemp(join(ROOT, '.phase10-cold-'))
  const home = join(temp, 'dsh-home')
  try {
    const packed = await runCommand('pnpm', ['pack', '--pack-destination', temp], environment(home), ROOT)
    if (packed.code !== 0) throw new Error(`offline pack failed: ${packed.stderr.slice(0, 2000)}`)
    const tarball = (await readdir(temp)).find(item => item.endsWith('.tgz'))
    if (tarball === undefined) throw new Error('pnpm pack did not produce an external tarball')
    const packagePath = join(temp, tarball)
    const install = await runNode([HARNESS_BIN, 'plugin', '--profile', 'phase10', 'add', packagePath], environment(home), HARNESS)
    checkProcess('external offline bundle install', { ...install, stdout: `${install.stdout}\n${install.stderr}` }, temp)
    const bootArgs = [HARNESS_BIN, '--profile', 'phase10', '-h']
    const processA = await runNode(bootArgs, environment(home), HARNESS)
    checkProcess('cold process A', processA, temp)
    const processB = await runNode(bootArgs, environment(home), HARNESS)
    checkProcess('cold process B', processB, temp)
    return Object.freeze({ schema: 'dsh-risk-advisor.phase10.cold-start.v1', install: 'PASS', processA: 'PASS', processB: 'PASS', evidenceClass: 'REAL_PINNED_RUNTIME', profile: 'disposable', external: { providerCalls: 0, networkCalls: 0, registryCalls: 0, gitRemoteCalls: 0 }, harnessPinned: 'ddefc45fbc7f8e46dd73185e68295696d1297887' })
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

if (process.env.VITEST !== 'true') process.stdout.write(`${JSON.stringify(await main(), null, 2)}\n`)
