import packageJson from '../../package.json'
import packageLockRaw from '../../package-lock.json?raw'

interface LockPackage {
  version?: string
  dev?: boolean
  dependencies?: Record<string, string>
}

interface PackageLock {
  lockfileVersion: number
  packages: Record<string, LockPackage>
}

function parseVersion(version: string): [number, number, number] {
  const core = version.split('-')[0] ?? ''
  const [major = 0, minor = 0, patch = 0] = core.split('.').map((part) => Number(part))
  return [major, minor, patch]
}

function compareVersions(a: string, b: string): number {
  const [aMaj, aMin, aPat] = parseVersion(a)
  const [bMaj, bMin, bPat] = parseVersion(b)
  if (aMaj !== bMaj) return aMaj - bMaj
  if (aMin !== bMin) return aMin - bMin
  return aPat - bPat
}

describe('frontend dependency security constraints (QA-014)', () => {
  const lockfile = JSON.parse(packageLockRaw) as PackageLock

  it('keeps build and lint tooling out of production dependencies', () => {
    const prodDeps = Object.keys(packageJson.dependencies)
    const devOnlyPackages = new Set([
      'eslint',
      'typescript-eslint',
      'vite-plugin-pwa',
      'workbox-build',
      'glob',
      'minimatch',
    ])

    for (const pkg of prodDeps) {
      expect(devOnlyPackages.has(pkg)).toBe(false)
    }

    for (const [lockPath, entry] of Object.entries(lockfile.packages)) {
      if (!lockPath.startsWith('node_modules/') || entry.dev === true) continue
      const pkgName = lockPath.slice(lockPath.lastIndexOf('node_modules/') + 'node_modules/'.length)
      expect(devOnlyPackages.has(pkgName)).toBe(false)
    }
  })

  it('enforces patched minimum versions for ESLint, typescript-eslint, and their minimatch graph', () => {
    expect(compareVersions(packageJson.devDependencies.eslint, '10.15.0')).toBeGreaterThanOrEqual(0)
    expect(
      compareVersions(packageJson.devDependencies['typescript-eslint'], '8.73.0'),
    ).toBeGreaterThanOrEqual(0)
    expect(
      compareVersions(packageJson.devDependencies['vite-plugin-pwa'], '2.0.0'),
    ).toBeGreaterThanOrEqual(0)

    const patchedMinimums: Array<[string, string]> = [
      ['node_modules/eslint', '10.15.0'],
      ['node_modules/@eslint/config-array', '0.23.6'],
      ['node_modules/typescript-eslint', '8.73.0'],
      ['node_modules/@typescript-eslint/eslint-plugin', '8.73.0'],
      ['node_modules/@typescript-eslint/parser', '8.73.0'],
      ['node_modules/@typescript-eslint/type-utils', '8.73.0'],
      ['node_modules/@typescript-eslint/typescript-estree', '8.73.0'],
      ['node_modules/@typescript-eslint/utils', '8.73.0'],
      ['node_modules/eslint/node_modules/minimatch', '11.0.1'],
      ['node_modules/@eslint/config-array/node_modules/minimatch', '11.0.1'],
      ['node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch', '11.0.1'],
    ]

    for (const [lockPath, minVersion] of patchedMinimums) {
      const entry = lockfile.packages[lockPath]
      expect(entry?.version, `${lockPath} missing from package-lock.json`).toBeDefined()
      expect(
        compareVersions(entry?.version ?? '0.0.0', minVersion),
        `${lockPath} version ${entry?.version} is below ${minVersion}`,
      ).toBeGreaterThanOrEqual(0)
    }
  })
})
