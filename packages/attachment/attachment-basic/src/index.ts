/** Sharp-free attachment service for embedded Android runtimes. @module @deepseek-ai/dsh-attachment-basic */

import { Context } from '@deepseek-ai/cordis'
import { AttachmentError, AttachmentStore } from '@deepseek-ai/dsh-attachment'
import type {
  ImageAttachmentLimits,
  ImageAttachmentRef,
  SaveImageAttachment,
  StoredImageAttachment,
} from '@deepseek-ai/dsh-attachment'

/** Minimal attachment backend configuration. */
export interface Config {
  maxImageBytes?: number
  maxImagesPerMessage?: number
  maxMessageImageBytes?: number
}

const DEFAULT_MAX_IMAGE_BYTES = 20 * 1024 * 1024
const DEFAULT_MAX_IMAGES_PER_MESSAGE = 0
const DEFAULT_MAX_MESSAGE_IMAGE_BYTES = 0

function unsupportedImageError(operation: string): AttachmentError {
  return new AttachmentError(
    `Image attachments are unavailable in this embedded Android runtime; cannot ${operation}.`,
    'UNSUPPORTED_IMAGE_TYPE',
  )
}

/** Mounts `ctx.attachments` without native image codecs. */
export class BasicAttachmentStore extends AttachmentStore {
  readonly imageLimits: ImageAttachmentLimits

  constructor(ctx: Context, config: Config = {}) {
    super(ctx)
    this.imageLimits = Object.freeze({
      maxImageBytes: config.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES,
      maxImagesPerMessage: config.maxImagesPerMessage ?? DEFAULT_MAX_IMAGES_PER_MESSAGE,
      maxMessageImageBytes: config.maxMessageImageBytes ?? DEFAULT_MAX_MESSAGE_IMAGE_BYTES,
      maxImagePixels: 1,
      maxImageDimension: 1,
      mediaTypes: Object.freeze([]),
    })
  }

  validateImage(input: SaveImageAttachment): Promise<void> {
    void input
    return Promise.reject(unsupportedImageError('validate image input'))
  }

  saveImage(input: SaveImageAttachment): Promise<ImageAttachmentRef> {
    void input
    return Promise.reject(unsupportedImageError('persist image input'))
  }

  readImage(ref: ImageAttachmentRef, signal?: AbortSignal): Promise<StoredImageAttachment> {
    signal?.throwIfAborted()
    void ref
    return Promise.reject(new AttachmentError(
      'Attachment storage is unavailable in this embedded Android runtime.',
      'ATTACHMENT_NOT_FOUND',
    ))
  }
}

export default BasicAttachmentStore
