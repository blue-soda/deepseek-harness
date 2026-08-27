/**
 * host domain zod schemas (names derived from map keys).
 */

import { z } from 'zod'
import type { BanyanSkillPackageFile, DirectoryEntry } from './host.ts'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'

/** host.describe request payload (empty object literal). */
export const hostDescribeRequestSchema = z.object({}) satisfies z.ZodType<Wire<RequestPayload<'host.describe'>>>

/** host.describe response value. */
export const hostDescribeValueSchema = z.object({
  version: z.string(),
  cwd: z.string(),
  provider: z.string().optional(),
  model: z.string().optional(),
  attachedSessions: z.number().int().nonnegative(),
  home: z.string(),
  canOpenPath: z.boolean(),
}) satisfies z.ZodType<Wire<ResponseValue<'host.describe'>>>

/** host.pickDirectory request payload (empty object literal). */
export const hostPickDirectoryRequestSchema = z.object({}) satisfies z.ZodType<Wire<RequestPayload<'host.pickDirectory'>>>

/** host.pickDirectory response value; null means the user cancelled. */
export const hostPickDirectoryValueSchema = z.object({
  path: z.string().nullable(),
}) satisfies z.ZodType<Wire<ResponseValue<'host.pickDirectory'>>>

/** Directory row shared by listing entries and breadcrumb crumbs. */
export const directoryEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  hidden: z.boolean(),
}) satisfies z.ZodType<Wire<DirectoryEntry>>

/** host.listDirectory request payload; an absent path lists the home directory. */
export const hostListDirectoryRequestSchema = z.object({
  path: z.string().optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'host.listDirectory'>>>

/** host.listDirectory response value. */
export const hostListDirectoryValueSchema = z.object({
  path: z.string(),
  home: z.string(),
  crumbs: z.array(directoryEntrySchema),
  entries: z.array(directoryEntrySchema),
  truncated: z.boolean(),
}) satisfies z.ZodType<Wire<ResponseValue<'host.listDirectory'>>>

/** host.createDirectory request payload: name must be one plain path segment. */
export const hostCreateDirectoryRequestSchema = z.object({
  path: z.string(),
  name: z.string(),
}).refine(
  payload => payload.name.trim() !== '' && payload.name !== '.' && payload.name !== '..'
    && !/[/\\]/.test(payload.name),
  { message: 'host.createDirectory requires a single non-blank path segment name' },
) satisfies z.ZodType<Wire<RequestPayload<'host.createDirectory'>>>

/** host.createDirectory response value: the created directory's absolute path. */
export const hostCreateDirectoryValueSchema = z.object({
  path: z.string(),
}) satisfies z.ZodType<Wire<ResponseValue<'host.createDirectory'>>>

/** host.copyDirectory request payload. */
export const hostCopyDirectoryRequestSchema = z.object({
  sourcePath: z.string().min(1),
  targetPath: z.string().min(1),
  overwrite: z.boolean().optional(),
  skipNames: z.array(z.string().min(1)).optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'host.copyDirectory'>>>

/** host.copyDirectory response value. */
export const hostCopyDirectoryValueSchema = z.object({
  sourcePath: z.string(),
  targetPath: z.string(),
  copiedFiles: z.number().int().nonnegative(),
  copiedDirectories: z.number().int().nonnegative(),
  skippedEntries: z.number().int().nonnegative(),
}) satisfies z.ZodType<Wire<ResponseValue<'host.copyDirectory'>>>

const banyanSkillPackageFileSchema = z.object({
  path: z.string().min(1),
  url: z.string().url().nullable().optional(),
  text: z.string().optional(),
}).refine(
  payload => payload.url !== undefined || payload.text !== undefined,
  { message: 'a skill package file requires either url or text' },
) satisfies z.ZodType<Wire<BanyanSkillPackageFile>>

/** host.installBanyanSkillPackage request payload. */
export const hostInstallBanyanSkillPackageRequestSchema = z.object({
  directoryName: z.string().min(1),
  skillMd: z.string().min(1),
  files: z.array(banyanSkillPackageFileSchema).optional(),
  targetRootPath: z.string().min(1).optional(),
  overwrite: z.boolean().optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'host.installBanyanSkillPackage'>>>

/** host.installBanyanSkillPackage response value. */
export const hostInstallBanyanSkillPackageValueSchema = z.object({
  targetRootPath: z.string(),
  installedPath: z.string(),
  writtenFiles: z.number().int().nonnegative(),
  skippedFiles: z.number().int().nonnegative(),
}) satisfies z.ZodType<Wire<ResponseValue<'host.installBanyanSkillPackage'>>>
/** host.openPath request payload. */
export const hostOpenPathRequestSchema = z.object({
  path: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'host.openPath'>>>

/** host.openPath response value. */
export const hostOpenPathValueSchema = z.object({
  opened: z.literal(true),
}) satisfies z.ZodType<Wire<ResponseValue<'host.openPath'>>>
