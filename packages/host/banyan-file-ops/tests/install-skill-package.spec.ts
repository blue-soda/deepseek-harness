import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import BanyanFileOps from '../src/index.ts'

let originalDshHome: string | undefined
let tempHome: string | undefined

beforeEach(async () => {
  originalDshHome = process.env.DSH_HOME
  tempHome = await mkdtemp(join(tmpdir(), 'banyan-skill-install-'))
  process.env.DSH_HOME = tempHome
})

afterEach(async () => {
  if (originalDshHome === undefined) {
    delete process.env.DSH_HOME
  } else {
    process.env.DSH_HOME = originalDshHome
  }
  if (tempHome !== undefined) {
    await rm(tempHome, { recursive: true, force: true })
  }
})

function createService(): BanyanFileOps {
  return new BanyanFileOps(new Context())
}

describe('installBanyanSkillPackage', () => {
  it('installs SKILL.md and text attachments into the default DSH skill root', async () => {
    const service = createService()
    const result = await service.installBanyanSkillPackage({
      directoryName: 'backend-resume-coach',
      skillMd: '---\nname: backend-resume-coach\ndescription: Polish backend resumes\n---\n# Backend Resume Coach\n',
      files: [
        { path: 'references/cases.md', text: '# Cases\n' },
        { path: 'SKILL.md', text: 'ignored duplicate' },
      ],
    })

    expect(result.targetRootPath).toBe(join(tempHome as string, 'skills'))
    expect(result.installedPath).toBe(join(tempHome as string, 'skills', 'backend-resume-coach'))
    expect(result.writtenFiles).toBe(2)
    expect(result.skippedFiles).toBe(1)
    await expect(readFile(join(result.installedPath, 'SKILL.md'), 'utf8'))
      .resolves.toContain('# Backend Resume Coach')
    await expect(readFile(join(result.installedPath, 'references', 'cases.md'), 'utf8'))
      .resolves.toBe('# Cases\n')
  })

  it('rejects unsafe skill directories and escaped file paths', async () => {
    const service = createService()
    await expect(service.installBanyanSkillPackage({
      directoryName: '../bad',
      skillMd: '# Bad\n',
    })).rejects.toThrow(/safe single skill directory/)

    await expect(service.installBanyanSkillPackage({
      directoryName: 'safe-skill',
      skillMd: '# Safe\n',
      files: [{ path: '../escaped.md', text: 'nope' }],
    })).rejects.toThrow(/invalid skill package file path/)
  })

  it('refuses to overwrite an existing skill unless requested', async () => {
    const service = createService()
    await service.installBanyanSkillPackage({
      directoryName: 'existing-skill',
      skillMd: '# First\n',
    })

    await expect(service.installBanyanSkillPackage({
      directoryName: 'existing-skill',
      skillMd: '# Second\n',
    })).rejects.toThrow(/already exists/)

    const result = await service.installBanyanSkillPackage({
      directoryName: 'existing-skill',
      skillMd: '# Second\n',
      overwrite: true,
    })
    await expect(readFile(join(result.installedPath, 'SKILL.md'), 'utf8'))
      .resolves.toBe('# Second\n')
  })
})
