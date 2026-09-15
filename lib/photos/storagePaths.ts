import { STORAGE_PATHS, COLLECTIONS } from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidPhotoId(id: unknown): id is string {
  return typeof id === 'string' && UUID_RE.test(id);
}

type PhotoCollection = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export function isPhotoCollection(value: unknown): value is PhotoCollection {
  return value === COLLECTIONS.photoUploads || value === COLLECTIONS.photoRenders;
}

export class InvalidStoragePathError extends Error {}

/**
 * Defense in depth: these paths are derived from our own Firestore records,
 * never from client input, but a corrupted or hand-edited document should
 * still fail closed rather than let a delete/read reach outside the
 * expected storage prefix.
 */
function assertUnderPrefix(path: string, prefix: string): string {
  if (!path.startsWith(`${prefix}/`)) {
    throw new InvalidStoragePathError(`Storage path "${path}" is not under expected prefix "${prefix}"`);
  }
  return path;
}

/** Derives every storage object that belongs to a photoUploads record. */
export function deriveUploadStoragePaths(id: string, storagePath: string, hasThumbnail: boolean): string[] {
  const paths = [assertUnderPrefix(storagePath, STORAGE_PATHS.originals)];
  if (hasThumbnail) {
    paths.push(`${STORAGE_PATHS.thumbnails}/${id}.jpg`);
  }
  return paths;
}

/** Derives the storage object that belongs to a photoRenders record. */
export function deriveRenderStoragePath(renderStoragePath: string): string {
  return assertUnderPrefix(renderStoragePath, STORAGE_PATHS.rendered);
}
