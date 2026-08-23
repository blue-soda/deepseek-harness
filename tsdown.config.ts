import { defineConfig } from 'tsdown'
import { typertPlugin } from './packages/typert/generator/lib/types/tsdown-plugin.js'

function isBuildFaceClient(value: unknown): boolean {
  if (value === undefined || value === 'host') return false
  if (value === 'client') return true
  throw new Error(`tsdown: --env.DSH_BUILD_FACE must be host or client, received ${String(value)}`)
}

/**
 * The ordinary workspace build consumes JavaScript emitted by the Host
 * TypeScript project and runs Typert. The Client pass selects packages that
 * declare a browser bundle and lets their package-local configs emit both
 * their Node loader entry and browser artifact.
 */
export default defineConfig(({ env }, context) => {
  const client = isBuildFaceClient(env?.DSH_BUILD_FACE)
  const packageBuildConfig = {
    workspace: false,
    entry: client ? '' : ['lib/types/{index,invariant,startup}.js'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
    plugins: client ? [] : [typertPlugin({ mode: 'workspace', faces: ['host'] })],
  } as const
  if (context.rootConfig !== undefined) {
    return packageBuildConfig
  }
  return {
    ...packageBuildConfig,
    workspace: {
      include: [
        'vendor/cordis',
        'vendor/cosmokit',
        'vendor/group',
        'vendor/hmr',
        'vendor/include',
        'vendor/loader',
        'vendor/logger-console',
        'vendor/schemastery',
        'vendor/timer',
        'packages/*/*',
        'apps/cli',
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/test?(s)/**',
        '**/t?(e)mp/**',
        'packages/client/schema-form/**',
        'packages/client/web-react/**',
        'vendor/deep-droid-pilot/**',
      ],
    },
  }
})
