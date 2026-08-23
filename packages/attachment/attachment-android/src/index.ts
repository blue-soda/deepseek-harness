/** Android embedded attachment backend without sharp/libvips. @module @deepseek-ai/dsh-attachment-android */

import { Buffer } from 'node:buffer'
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
  bridgeBaseUrl?: string
  bridgeToken?: string
  bridgeTimeoutMs?: number
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
  private readonly bridge: AndroidAttachmentBridge | undefined

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
    const bridgeBaseUrl = config.bridgeBaseUrl ?? process.env.DSH_ANDROID_BRIDGE_URL
    const bridgeToken = config.bridgeToken ?? process.env.DSH_ANDROID_BRIDGE_TOKEN
    this.bridge = bridgeBaseUrl !== undefined && bridgeToken !== undefined && bridgeToken.length > 0
      ? new AndroidAttachmentBridge({
        baseUrl: bridgeBaseUrl,
        token: bridgeToken,
        timeoutMs: config.bridgeTimeoutMs ?? 30_000,
      })
      : undefined
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
    if (this.bridge !== undefined) return this.bridge.saveImage(input, ref)
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
    if (this.bridge !== undefined) return this.bridge.readImage(ref, signal)
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

interface AndroidAttachmentBridgeOptions {
  readonly baseUrl: string
  readonly token: string
  readonly timeoutMs: number
}

class AndroidAttachmentBridge {
  constructor(private readonly options: AndroidAttachmentBridgeOptions) {}

  async saveImage(input: SaveImageAttachment, ref: ImageAttachmentRef): Promise<ImageAttachmentRef> {
    const result = await this.execute('attachment.save_image', 'reversible', {
      base64: Buffer.from(input.data).toString('base64'),
      mediaType: ref.mediaType,
      bytes: ref.bytes,
      width: ref.width,
      height: ref.height,
      ...ref.name === undefined ? {} : { name: ref.name },
    }, undefined, 'ATTACHMENT_WRITE_FAILED')
    return parseImageRef(result, 'attachment.save_image.result')
  }

  async readImage(ref: ImageAttachmentRef, signal?: AbortSignal): Promise<StoredImageAttachment> {
    const result = await this.execute('attachment.read_image', 'read_only', {
      attachmentId: ref.attachmentId,
      mediaType: ref.mediaType,
      bytes: ref.bytes,
      width: ref.width,
      height: ref.height,
      ...ref.name === undefined ? {} : { name: ref.name },
    }, signal, 'ATTACHMENT_READ_FAILED')
    const record = objectRecord(result, 'attachment.read_image.result')
    const image = parseImageRef(record.image, 'attachment.read_image.result.image')
    const data = new Uint8Array(Buffer.from(stringField(record.base64, 'attachment.read_image.result.base64'), 'base64'))
    if (digest(data) !== referenceDigest(ref)) {
      throw new AttachmentError('Android bridge returned corrupt attachment bytes.', 'ATTACHMENT_CORRUPT')
    }
    if (
      image.attachmentId !== ref.attachmentId ||
      image.mediaType !== ref.mediaType ||
      image.bytes !== ref.bytes ||
      image.width !== ref.width ||
      image.height !== ref.height
    ) {
      throw new AttachmentError('Android bridge returned attachment metadata that does not match its reference.', 'ATTACHMENT_CORRUPT')
    }
    return { ref: image, data }
  }

  private async execute(
    tool: string,
    risk: 'read_only' | 'reversible',
    args: Record<string, unknown>,
    signal: AbortSignal | undefined,
    failureCode: 'ATTACHMENT_READ_FAILED' | 'ATTACHMENT_WRITE_FAILED',
  ): Promise<unknown> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new Error('Android attachment bridge request timed out')), this.options.timeoutMs)
    const abortFromCaller = (): void => controller.abort(signal?.reason)
    if (signal !== undefined) {
      if (signal.aborted) controller.abort(signal.reason)
      else signal.addEventListener('abort', abortFromCaller, { once: true })
    }
    try {
      const response = await fetch(new URL('/execute', this.options.baseUrl), {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.options.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: `attachment-android:${tool}:${Date.now()}`,
          tool,
          risk,
          arguments: args,
        }),
        signal: controller.signal,
      })
      const payload: unknown = await response.json()
      const record = objectRecord(payload, `${tool} bridge response`)
      if (!response.ok || record.ok !== true) {
        throw new Error(bridgeErrorMessage(record))
      }
      return record.result
    } catch (error: unknown) {
      if (signal?.aborted === true) throw signal.reason
      throw new AttachmentError(`Android attachment bridge ${tool} failed: ${errorMessage(error)}`, failureCode, { cause: error })
    } finally {
      clearTimeout(timeout)
      if (signal !== undefined) signal.removeEventListener('abort', abortFromCaller)
    }
  }
}

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

function parseImageRef(value: unknown, path: string): ImageAttachmentRef {
  const record = objectRecord(value, path)
  const name = record.name === undefined ? undefined : displayName(stringField(record.name, `${path}.name`))
  return {
    attachmentId: AttachmentId(stringField(record.attachmentId, `${path}.attachmentId`)),
    mediaType: imageMediaTypeField(record.mediaType, `${path}.mediaType`),
    bytes: positiveIntegerField(record.bytes, `${path}.bytes`),
    width: positiveIntegerField(record.width, `${path}.width`),
    height: positiveIntegerField(record.height, `${path}.height`),
    ...name === undefined ? {} : { name },
  }
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

function objectRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new AttachmentError(`${path} must be an object.`, 'ATTACHMENT_READ_FAILED')
  }
  return value as Record<string, unknown>
}

function stringField(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AttachmentError(`${path} must be a non-empty string.`, 'INVALID_ATTACHMENT_REF')
  }
  return value
}

function positiveIntegerField(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new AttachmentError(`${path} must be a positive integer.`, 'INVALID_ATTACHMENT_REF')
  }
  return value
}

function imageMediaTypeField(value: unknown, path: string): ImageMediaType {
  if (value === 'image/png' || value === 'image/jpeg' || value === 'image/webp') return value
  throw new AttachmentError(`${path} must be a supported image media type.`, 'UNSUPPORTED_IMAGE_TYPE')
}

function bridgeErrorMessage(value: Record<string, unknown>): string {
  const error = value.error
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'request rejected'
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : String(value)
}
