/**
 * Firebase Storage REST API helper.
 *
 * The Admin SDK's @google-cloud/storage module uses storage.googleapis.com,
 * which does not recognise the new firebasestorage.app bucket format.
 * This module uses the Firebase Storage REST API (firebasestorage.googleapis.com)
 * which works with both old and new bucket types.
 */

import { adminApp } from '@/lib/firebase-admin';
import { getStorageBucket } from '@/lib/server/env';

const BUCKET = getStorageBucket();
const FS_BASE = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(BUCKET)}/o`;

/** Internal-artifact prefix: objects here are never given a public download token. */
export const PRIVATE_STORAGE_PREFIX = 'private';

async function getAccessToken(): Promise<string> {
  const token = await adminApp.options.credential!.getAccessToken();
  return token.access_token;
}

/**
 * Upload a buffer to Firebase Storage.
 * Returns a permanent public download URL with an embedded token.
 * Intended only for content meant to be shareable (e.g. marketing images) —
 * use storageUploadPrivate for internal artifacts.
 */
export async function storageUpload(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error('[storage] failed to get access token for upload, path:', storagePath);
    throw err;
  }

  const nameParam = encodeURIComponent(storagePath);
  const uploadURL = `${FS_BASE}?name=${nameParam}&uploadType=media`;

  const uploadRes = await fetch(uploadURL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!uploadRes.ok) {
    console.error('[storage] upload failed, status:', uploadRes.status, 'path:', storagePath);
    throw new Error(`Storage upload failed (${uploadRes.status})`);
  }

  const uploadData = await uploadRes.json();

  // Firebase auto-generates a download token on upload — use it directly
  const downloadToken = uploadData.downloadTokens as string;
  if (!downloadToken) {
    throw new Error('Storage upload succeeded but no downloadTokens in response');
  }

  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${nameParam}?alt=media&token=${downloadToken}`;
}

/**
 * Upload a buffer as an internal artifact: the object is stored, then its
 * auto-issued download token is immediately cleared so it is reachable only
 * through an authenticated storageDownload() call, never a permanent public
 * token URL. Does not revoke any token already issued by storageUpload().
 */
export async function storageUploadPrivate(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error('[storage] failed to get access token for private upload, path:', storagePath);
    throw err;
  }

  const nameParam = encodeURIComponent(storagePath);
  const uploadURL = `${FS_BASE}?name=${nameParam}&uploadType=media`;

  const uploadRes = await fetch(uploadURL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!uploadRes.ok) {
    console.error('[storage] private upload failed, status:', uploadRes.status, 'path:', storagePath);
    throw new Error(`Private storage upload failed (${uploadRes.status})`);
  }

  const clearRes = await fetch(`${FS_BASE}/${nameParam}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata: { firebaseStorageDownloadTokens: '' } }),
  });

  if (!clearRes.ok) {
    console.error('[storage] failed to clear public token, status:', clearRes.status, 'path:', storagePath);
    // The object is already written with its auto-issued token still live —
    // Storage evaluates a token-bearing read independently of security rules,
    // so leaving it in place means anyone holding that token can read it.
    // Best-effort delete it rather than leaving a publicly-readable object
    // behind with no remediation; either way, surface exactly what happened.
    const cleanup = await storageDelete(storagePath).then(
      () => 'removed',
      (deleteErr) => {
        console.error('[storage] cleanup delete also failed, path:', storagePath, deleteErr instanceof Error ? deleteErr.message : deleteErr);
        return 'FAILED to remove';
      },
    );
    throw new Error(
      `Failed to secure private upload for "${storagePath}" (${clearRes.status}); cleanup ${cleanup} the object` +
      (cleanup === 'removed' ? '.' : ' — it may still be readable via its auto-issued token.'),
    );
  }
}

/**
 * Download a file from Firebase Storage into a Buffer.
 */
export async function storageDownload(storagePath: string): Promise<Buffer> {
  const accessToken = await getAccessToken();
  const nameParam = encodeURIComponent(storagePath);

  const res = await fetch(`${FS_BASE}/${nameParam}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Storage download failed for ${storagePath} (${res.status})`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Delete a file from Firebase Storage.
 */
export async function storageDelete(storagePath: string): Promise<void> {
  const accessToken = await getAccessToken();
  const nameParam = encodeURIComponent(storagePath);

  const res = await fetch(`${FS_BASE}/${nameParam}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Storage delete failed for ${storagePath} (${res.status})`);
  }
}

export interface StorageFileInfo {
  name: string;
  storagePath: string;
  contentType?: string;
  downloadURL: string;
}

/**
 * List files under a storage prefix.
 */
export async function storageList(prefix: string): Promise<StorageFileInfo[]> {
  const accessToken = await getAccessToken();

  const res = await fetch(`${FS_BASE}?prefix=${encodeURIComponent(prefix)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Storage list failed for prefix "${prefix}" (${res.status})`);
  }

  const data = await res.json();
  const items: Array<{
    name: string;
    contentType?: string;
    metadata?: { firebaseStorageDownloadTokens?: string };
  }> = data.items ?? [];

  return items.map((item) => {
    const token = item.metadata?.firebaseStorageDownloadTokens ?? '';
    const nameParam = encodeURIComponent(item.name);
    const downloadURL = token
      ? `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${nameParam}?alt=media&token=${token}`
      : `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${nameParam}?alt=media`;
    return { name: item.name, storagePath: item.name, contentType: item.contentType, downloadURL };
  });
}
