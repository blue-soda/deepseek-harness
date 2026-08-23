import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

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

  it('uses the Android bridge when bridge credentials are configured', async () => {
    const calls: unknown[] = []
    let savedRef: Record<string, unknown> | undefined
    vi.stubGlobal('fetch', async (_url: URL, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { id: string; tool: string; arguments: Record<string, unknown> }
      calls.push(body)
      if (body.tool === 'attachment.save_image') {
        savedRef = {
          attachmentId: 'sha256:999f1d1527ee7e79266f16add5430fff76b1225d742464a5b1ff1f02971bb8ee',
          mediaType: body.arguments.mediaType,
          bytes: body.arguments.bytes,
          width: body.arguments.width,
          height: body.arguments.height,
          name: body.arguments.name,
        }
        return Response.json({ id: body.id, ok: true, result: savedRef, error: null, durationMs: 1 })
      }
      return Response.json({
        id: body.id,
        ok: true,
        result: { image: savedRef, base64: Buffer.from(PNG).toString('base64') },
        error: null,
        durationMs: 1,
      })
    })

    const store = new AndroidAttachmentStore(new Context(), {
      bridgeBaseUrl: 'http://127.0.0.1:8765',
      bridgeToken: 'token',
    })
    const ref = await store.saveImage({ data: PNG, mediaType: 'image/png', name: 'screen.png' })

    await expect(store.readImage(ref)).resolves.toEqual({ ref, data: PNG })
    expect(calls).toHaveLength(2)
    expect(calls[0]).toMatchObject({ tool: 'attachment.save_image', risk: 'reversible' })
    expect(calls[1]).toMatchObject({ tool: 'attachment.read_image', risk: 'read_only' })
  })
})
