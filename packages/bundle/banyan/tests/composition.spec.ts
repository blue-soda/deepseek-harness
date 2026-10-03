import { readFileSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Group from '@deepseek-ai/cordis-plugin-group'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import type { EntryOptions } from '@deepseek-ai/cordis-plugin-loader'
import { load } from 'js-yaml'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { expect, it, onTestFinished, vi } from 'vitest'
import SessionStore from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import AgentPresets from '@deepseek-ai/dsh-agent-preset-registry'
import AgentPreset from '@deepseek-ai/dsh-agent-preset'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import * as persona from '@deepseek-ai/dsh-persona'
import * as search from '@deepseek-ai/dsh-tool-banyan-search'
import * as ops from '@deepseek-ai/dsh-tool-banyan-ops'
import * as mobileTools from '@deepseek-ai/dsh-tool-mobile'
import MobileRuntime from '@deepseek-ai/dsh-mobile'
import * as mobileBridge from '@deepseek-ai/dsh-mobile-bridge-http'
import BanyanFileOps from '@blue-soda/dsh-host-banyan-file-ops'
import * as authoring from '@blue-soda/dsh-banyan-ui-authoring'
import LocalFileSystem from '@deepseek-ai/dsh-fs-local'
import LocalSubprocessRuntime from '@deepseek-ai/dsh-subprocess-local'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as instructions from '@deepseek-ai/dsh-agent-instructions'
import * as todo from '@deepseek-ai/dsh-tool-todo'
import * as fsTools from '@deepseek-ai/dsh-tool-fs'
import * as fsSearch from '@deepseek-ai/dsh-tool-fs-search'
import * as cordisTools from '@deepseek-ai/dsh-tool-cordis'
import * as skillFilesystem from '@deepseek-ai/dsh-skill-filesystem'
import * as skillTool from '@deepseek-ai/dsh-tool-skill'
import { CordisInspectRegistryService } from '@deepseek-ai/dsh-cordis-host-runner'

it('loads optional declarations from YAML and releases tools and Host services on removal', async () => {
  const ctx = new Context().extend({ baseUrl: new URL('../cordis.patch.yml', import.meta.url).href })
  onTestFinished(() => ctx.fiber.dispose())
  await ctx.plugin(Loader)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SystemPrompt, { personaPrefix: '' })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(LocalFileSystem)
  await ctx.plugin(LocalSubprocessRuntime)
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(CordisInspectRegistryService, 1000)
  vi.stubEnv('DSH_ANDROID_BRIDGE_TOKEN', 'composition-test-token')
  onTestFinished(() => { vi.unstubAllEnvs() })
  await ctx.plugin(AgentPresets, { default: 'standard' })
  expect(ctx.get('banyanFileOps')).toBeUndefined()
  expect(await ctx.agentPresets.list()).toEqual([])

  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-agent-preset', AgentPreset],
    ['@deepseek-ai/dsh-persona', persona],
    ['@deepseek-ai/dsh-tool-banyan-search', search],
    ['@deepseek-ai/dsh-tool-banyan-ops', ops],
    ['@deepseek-ai/dsh-tool-mobile', mobileTools],
    ['@deepseek-ai/dsh-mobile', MobileRuntime],
    ['@deepseek-ai/dsh-mobile-bridge-http', mobileBridge],
    ['@blue-soda/dsh-host-banyan-file-ops', BanyanFileOps],
    ['@blue-soda/dsh-banyan-ui-authoring', authoring],
    ['@deepseek-ai/dsh-agent-instructions', instructions],
    ['@deepseek-ai/dsh-tool-todo', todo],
    ['@deepseek-ai/dsh-tool-fs', fsTools],
    ['@deepseek-ai/dsh-tool-fs-search', fsSearch],
    ['@deepseek-ai/dsh-tool-cordis', cordisTools],
    ['@deepseek-ai/dsh-skill-filesystem', skillFilesystem],
    ['@deepseek-ai/dsh-tool-skill', skillTool],
  ])
  const files = ['cordis.patch.yml', 'presets/mobile.patch.yml', 'presets/banyan-search.patch.yml', 'presets/banyan-ops.patch.yml']
  const rows = files.flatMap((file) => {
    const patch = load(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { schema: entryListSchema }) as { insert: EntryOptions[] }[]
    return patch.flatMap(row => row.insert)
  })
  // Resolve the real plugin implementations in source mode; the shipped YAML remains the composition input.
  for (const [moduleName, plugin] of modules) ctx.loader.builtins[moduleName] = plugin
  ctx.loader.builtins.group = Group
  function resolveModules(value: unknown): void {
    if (value === null || typeof value !== 'object') return
    if ('name' in value && typeof value.name === 'string' && modules.has(value.name)) value.name = 'cordis:' + value.name
    for (const item of Object.values(value)) resolveModules(item)
  }
  resolveModules(rows)
  await ctx.loader.root.update(rows)
  await ctx.loader.await()
  expect((await ctx.agentPresets.list()).map(preset => preset.id).sort()).toEqual(['banyan-ops', 'banyan-search', 'mobile'])
  expect((await ctx.agentPresets.list()).map(preset => preset.broken)).toEqual([undefined, undefined, undefined])
  expect(ctx.get('banyanFileOps')).toBeDefined()
  expect(ctx.banyanFileOps.typertRemote.namespace).toBe('banyanFileOps')
  const assembly = await ctx.systemPrompt.assemble()
  expect(assembly.sections.find(section => section.name === 'tool:banyan-ui-authoring')?.text).toMatchSnapshot()
  await ctx.loader.root.update([])
  await ctx.loader.await()
  expect(ctx.get('banyanFileOps')).toBeUndefined()
  expect(await ctx.agentPresets.list()).toEqual([])
  expect(ctx.tools.get('banyan_content_search')).toBeUndefined()
  expect((await ctx.systemPrompt.assemble()).sections.find(section => section.name === 'tool:banyan-ui-authoring')).toBeUndefined()
})

it('replays a read-only search result from a Loader YAML composition and removes its schemas', async () => {
  const ctx = new Context()
  onTestFinished(() => ctx.fiber.dispose())
  onTestFinished(() => { vi.unstubAllGlobals() })
  await ctx.plugin(Loader)
  await ctx.plugin(SystemPrompt, { personaPrefix: '' })
  await ctx.plugin(ToolRuntime)
  ctx.loader.builtins.search = search
  const rows = load(readFileSync(new URL('./fixtures/search.cordis.yml', import.meta.url), 'utf8')) as EntryOptions[]
  await ctx.loader.root.update(rows)
  await ctx.loader.await()
  vi.stubGlobal('fetch', async () => Response.json({ items: [{ title: 'Shared workflow', id: 'post-1' }] }))
  const result = await ctx.tools.execute({
    callId: ToolCallId('search-1'), name: 'banyan_content_search', arguments: { q: 'workflow' }, signal: new AbortController().signal,
  })
  expect(result.isError).toBe(false)
  expect(ctx.tools.schemas().map(tool => tool.name).sort()).toMatchInlineSnapshot(`
    [
      "banyan_content_get",
      "banyan_content_search",
      "banyan_knowledge_get",
      "banyan_knowledge_search",
      "banyan_skill_package_get",
    ]
  `)
  expect(result.content).toEqual([{ type: 'text', text: expect.stringContaining('Shared workflow') }])
  await ctx.loader.root.update([])
  await ctx.loader.await()
  expect(ctx.tools.schemas()).toEqual([])
})
