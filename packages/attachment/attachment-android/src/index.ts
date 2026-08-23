/** Android embedded attachment backend without sharp/libvips. @module @deepseek-ai/dsh-attachment-android */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { AttachmentError, AttachmentId, AttachmentStore, ImageVariantId } from '@deepseek-ai/dsh-attachment'
import type {
  ImageAttachmentLimits,
  ImageAttachmentRef,
  ImageMediaType,
  ImageRequestPolicy,
  RequestImageAttachment,
  SaveImageAttachment,
  StoredImageAttachment,
} from '@deepseek-ai/dsh-attachment'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

export interface Config {
  dshHome?: string
  maxImageBytes?: number
  maxImagesPerMessage?: number
  maxMessageImageBytes?: number
  maxImagePixels?: number
  maxImageDimension?: number
}

const DEFAULT_MAX_IMAGE_BYTES = 20 * 1024 * 1024
const DEFAULT_MAX_IMAGES_PER_MESSAGE = 20
const DEFAULT_MAX_MESSAGE_IMAGE_BYTES = 200 * 1024 * 1024
const DEFAULT_MAX_IMAGE_PIXELS = 64_000_000
const DEFAULT_MAX_IMAGE_DIMENSION = 8192
const ID_PATTERN = /^sha256:([a-f0-9]{64})$/u

interface ImageMetadata {
  readonly mediaType: ImageMediaType
  readonly width: number
  readonly height: number
}

export class AndroidAttachmentStore extends AttachmentStore {
  readonly root: string
  readonly imageLimits: ImageAttachmentLimits

  constructor(ctx: Context, config: Config = {}) {
    super(ctx)
    this.root = resolve(join(resolveDshHome(config.dshHome), 'attachments', 'android-v1'))
    this.imageLimits = Object.freeze({
      maxImageBytes: config.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES,
      maxImagesPerMessage: config.maxImagesPerMessage ?? DEFAULT_MAX_IMAGES_PER_MESSAGE,
      maxMessageImageBytes: config.maxMessageImageBytes ?? DEFAULT_MAX_MESSAGE_IMAGE_BYTES,
      maxImagePixels: config.maxImagePixels ?? DEFAULT_MAX_IMAGE_PIXELS,
      maxImageDimension: config.maxImageDimension ?? DEFAULT_MAX_IMAGE_DIMENSION,
      mediaTypes: Object.freeze(['image/png', 'image/jpeg', 'image/webp'] as const),
    })
  }

  async validateImage(input: SaveImageAttachment): Promise<void> {
    this.inspect(input)
  }

  async saveImage(input: SaveImageAttachment): Promise<ImageAttachmentRef> {
    const metadata = this.inspect(input)
    const sha256 = digest(input.data)
    const name = displayName(input.name)
    const ref: ImageAttachmentRef = {
      attachmentId: AttachmentId(`sha256:${sha256}`),
      mediaType: metadata.mediaType,
      bytes: input.data.byteLength,
      width: metadata.width,
      height: metadata.height,
      ...name === undefined ? {} : { name },
    }
    const path = objectPath(this.root, sha256)
    await mkdir(dirname(path), { recursive: true, mode: 0o700 })
    await writeFile(path, input.data, { mode: 0o600, flag: 'wx' }).catch(async (error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST') return
      throw error
    })
    return ref
  }

  async readImage(ref: ImageAttachmentRef, signal?: AbortSignal): Promise<StoredImageAttachment> {
    signal?.throwIfAborted()
    const sha256 = referenceDigest(ref)
    const data = new Uint8Array(await readFile(objectPath(this.root, sha256), { signal }))
    signal?.throwIfAborted()
    if (digest(data) !== sha256) {
      throw new AttachmentError('Stored Android attachment failed integrity verification.', 'ATTACHMENT_CORRUPT')
    }
    const metadata = detectImage(data)
    if (
      metadata.mediaType !== ref.mediaType ||
      metadata.width !== ref.width ||
      metadata.height !== ref.height ||
      data.byteLength !== ref.bytes
    ) {
      throw new AttachmentError('Stored Android attachment metadata does not match its reference.', 'ATTACHMENT_CORRUPT')
    }
    return { ref, data }
  }

  override async readImageRequest(
    ref: ImageAttachmentRef,
    policy: ImageRequestPolicy,
    signal?: AbortSignal,
  ): Promise<RequestImageAttachment> {
    validatePolicy(policy)
    const stored = await this.readImage(ref, signal)
    if (stored.data.byteLength > policy.maxBytes || ref.width * ref.height > policy.maxPixels) {
      throw new AttachmentError(
        'Android attachment exceeds this model route request-image budget; Kotlin-side resizing is required.',
        'IMAGE_TOO_LARGE',
      )
    }
    const variantId = ImageVariantId(`sha256:${digest(JSON.stringify({
      androidAttachment: ref.attachmentId,
      maxPixels: policy.maxPixels,
      maxBytes: policy.maxBytes,
      passthrough: true,
    }))}`)
    return {
      variantId,
      attachment: ref,
      data: stored.data,
      mediaType: ref.mediaType,
      bytes: stored.data.byteLength,
      width: ref.width,
      height: ref.height,
      depth: 'uchar',
      space: 'srgb',
      hasAlpha: ref.mediaType === 'image/png',
    }
  }

  private inspect(input: SaveImageAttachment): ImageMetadata {
    if (!this.imageLimits.mediaTypes.includes(input.mediaType)) {
      throw new AttachmentError(
        `Image type ${input.mediaType} is not accepted by the Android attachment backend.`,
        'UNSUPPORTED_IMAGE_TYPE',
      )
    }
    if (input.data.byteLength === 0) throw new AttachmentError('Image is empty.', 'INVALID_IMAGE')
    if (input.data.byteLength > this.imageLimits.maxImageBytes) {
      throw new AttachmentError('Image exceeds the configured byte limit.', 'IMAGE_TOO_LARGE')
    }
    const metadata = detectImage(input.data)
    if (metadata.mediaType !== input.mediaType) {
      throw new AttachmentError('Declared image type does not match its bytes.', 'IMAGE_TYPE_MISMATCH')
    }
    if (metadata.width * metadata.height > this.imageLimits.maxImagePixels) {
      throw new AttachmentError('Image exceeds the configured pixel limit.', 'IMAGE_TOO_MANY_PIXELS')
    }
    if (metadata.width > this.imageLimits.maxImageDimension || metadata.height > this.imageLimits.maxImageDimension) {
      throw new AttachmentError('Image exceeds the configured dimension limit.', 'IMAGE_DIMENSION_TOO_LARGE')
    }
    return metadata
  }
}

export default AndroidAttachmentStore

function digest(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex')
}

function objectPath(root: string, sha256: string): string {
  return join(root, 'objects', sha256.slice(0, 2), sha256)
}

function referenceDigest(ref: ImageAttachmentRef): string {
  const match = ID_PATTERN.exec(String(ref.attachmentId))
  if (match?.[1] === undefined) throw new AttachmentError('Attachment reference is invalid.', 'INVALID_ATTACHMENT_REF')
  return match[1]
}

function displayName(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const leaf = value.slice(Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\')) + 1)
  const clean = leaf.replace(/[\u0000-\u001f\u007f]/gu, '').trim().slice(0, 255)
  return clean === '' ? undefined : clean
}

function validatePolicy(policy: ImageRequestPolicy): void {
  if (!Number.isSafeInteger(policy.maxPixels) || policy.maxPixels < 1) {
    throw new AttachmentError('Image request maxPixels must be a positive integer.', 'INVALID_ATTACHMENT_REF')
  }
  if (!Number.isSafeInteger(policy.maxBytes) || policy.maxBytes < 1) {
    throw new AttachmentError('Image request maxBytes must be a positive integer.', 'INVALID_ATTACHMENT_REF')
  }
}

function detectImage(data: Uint8Array): ImageMetadata {
  if (isPng(data)) {
    return {
      mediaType: 'image/png',
      width: readUint32(data, 16),
      height: readUint32(data, 20),
    }
  }
  if (isJpeg(data)) return detectJpeg(data)
  if (isWebp(data)) return detectWebp(data)
  throw new AttachmentError('Unsupported or invalid image bytes.', 'INVALID_IMAGE')
}

function isPng(data: Uint8Array): boolean {
  return data.byteLength >= 24 &&
    data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 &&
    data[12] === 0x49 && data[13] === 0x48 && data[14] === 0x44 && data[15] === 0x52
}

function isJpeg(data: Uint8Array): boolean {
  return data.byteLength >= 4 && data[0] === 0xff && data[1] === 0xd8
}

function isWebp(data: Uint8Array): boolean {
  return data.byteLength >= 30 &&
    text(data, 0, 4) === 'RIFF' &&
    text(data, 8, 12) === 'WEBP'
}

function detectJpeg(data: Uint8Array): ImageMetadata {
  let offset = 2
  while (offset + 9 < data.byteLength) {
    if (data[offset] !== 0xff) throw new AttachmentError('Invalid JPEG marker.', 'INVALID_IMAGE')
    const marker = data[offset + 1]
    const length = readUint16(data, offset + 2)
    if (length < 2 || offset + 2 + length > data.byteLength) throw new AttachmentError('Invalid JPEG segment.', 'INVALID_IMAGE')
    if (marker !== undefined && marker >= 0xc0 && marker <= 0xc3) {
      return {
        mediaType: 'image/jpeg',
        height: readUint16(data, offset + 5),
        width: readUint16(data, offset + 7),
      }
    }
    offset += 2 + length
  }
  throw new AttachmentError('JPEG dimensions were not found.', 'INVALID_IMAGE')
}

function detectWebp(data: Uint8Array): ImageMetadata {
  const chunk = text(data, 12, 16)
  if (chunk === 'VP8X') {
    return {
      mediaType: 'image/webp',
      width: 1 + readUint24Le(data, 24),
      height: 1 + readUint24Le(data, 27),
    }
  }
  if (chunk === 'VP8 ' && data.byteLength >= 30) {
    return {
      mediaType: 'image/webp',
      width: readUint16Le(data, 26) & 0x3fff,
      height: readUint16Le(data, 28) & 0x3fff,
    }
  }
  if (chunk === 'VP8L' && data.byteLength >= 25) {
    const bits = byteAt(data, 21) | (byteAt(data, 22) << 8) | (byteAt(data, 23) << 16) | (byteAt(data, 24) << 24)
    return {
      mediaType: 'image/webp',
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    }
  }
  throw new AttachmentError('WEBP dimensions were not found.', 'INVALID_IMAGE')
}

function readUint16(data: Uint8Array, offset: number): number {
  return (byteAt(data, offset) << 8) | byteAt(data, offset + 1)
}

function readUint16Le(data: Uint8Array, offset: number): number {
  return byteAt(data, offset) | (byteAt(data, offset + 1) << 8)
}

function readUint24Le(data: Uint8Array, offset: number): number {
  return byteAt(data, offset) | (byteAt(data, offset + 1) << 8) | (byteAt(data, offset + 2) << 16)
}

function readUint32(data: Uint8Array, offset: number): number {
  return (
    (byteAt(data, offset) << 24) |
    (byteAt(data, offset + 1) << 16) |
    (byteAt(data, offset + 2) << 8) |
    byteAt(data, offset + 3)
  ) >>> 0
}

function byteAt(data: Uint8Array, offset: number): number {
  const value = data[offset]
  if (value === undefined) throw new AttachmentError('Image header is truncated.', 'INVALID_IMAGE')
  return value
}

function text(data: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...data.slice(start, end))
}
