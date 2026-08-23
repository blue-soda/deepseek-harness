import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import AndroidAttachmentStore from '../src/index.ts'

const PNG = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWNgZGIGAAAOAAeCcsnOAAAAAElFTkSuQmCC',
  'base64',
))

async function withStore<T>(run: (store: AndroidAttachmentStore) => Promise<T>): Promise<T> {
  const dshHome = await mkdtemp(join(tmpdir(), 'dsh-attachment-android-'))
  try {
    return await run(new AndroidAttachmentStore(new Context(), { dshHome }))
  } finally {
    await rm(dshHome, { recursive: true, force: true })
  }
}

describe('android attachment store', () => {
  it('saves and reads a supported PNG attachment', async () => {
    await withStore(async (store) => {
      const ref = await store.saveImage({ data: PNG, mediaType: 'image/png', name: '/tmp/screen.png' })

      expect(ref).toMatchObject({
        mediaType: 'image/png',
        bytes: PNG.byteLength,
        width: 1,
        height: 1,
        name: 'screen.png',
      })
      await expect(store.readImage(ref)).resolves.toEqual({ ref, data: PNG })
    })
  })

  it('serves passthrough request images only when already inside the route budget', async () => {
    await withStore(async (store) => {
      const ref = await store.saveImage({ data: PNG, mediaType: 'image/png' })

      await expect(store.readImageRequest(ref, { maxBytes: PNG.byteLength, maxPixels: 1 }))
        .resolves.toMatchObject({ attachment: ref, data: PNG, mediaType: 'image/png', width: 1, height: 1 })
      await expect(store.readImageRequest(ref, { maxBytes: PNG.byteLength - 1, maxPixels: 1 }))
        .rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' })
    })
  })

  it('rejects mismatched media declarations and malformed bytes', async () => {
    await withStore(async (store) => {
      await expect(store.saveImage({ data: PNG, mediaType: 'image/jpeg' }))
        .rejects.toMatchObject({ code: 'IMAGE_TYPE_MISMATCH' })
      await expect(store.saveImage({ data: Uint8Array.of(1, 2, 3), mediaType: 'image/png' }))
        .rejects.toMatchObject({ code: 'INVALID_IMAGE' })
    })
  })
})
