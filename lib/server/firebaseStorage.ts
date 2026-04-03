/**
 * Firebase Storage REST API helper.
 *
 * The Admin SDK's @google-cloud/storage module uses storage.googleapis.com,
 * which does not recognise the new firebasestorage.app bucket format.
 * This module uses the Firebase Storage REST API (firebasestorage.googleapis.com)
 * which works with both old and new bucket types.
 */

import { adminApp } from '@/lib/firebase-admin';

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
const FS_BASE = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(BUCKET)}/o`;

async function getAccessToken(): Promise<string> {
  const token = await adminApp.options.credential!.getAccessToken();
  return token.access_token;
}

/**
 * Upload a buffer to Firebase Storage.
 * Returns a permanent public download URL with an embedded token.
 */
export async function storageUpload(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  console.log('[storage] bucket:', BUCKET);
  console.log('[storage] FS_BASE:', FS_BASE);

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
    console.log('[storage] access token obtained, length:', accessToken.length);
  } catch (err) {
    console.error('[storage] failed to get access token:', err);
    throw err;
  }

  const nameParam = encodeURIComponent(storagePath);
  const uploadURL = `${FS_BASE}?name=${nameParam}&uploadType=media`;
  console.log('[storage] upload URL:', uploadURL);
  console.log('[storage] buffer size:', buffer.length, 'contentType:', contentType);

  const uploadRes = await fetch(uploadURL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': contentType,
    },
    body: new Uint8Array(buffer),
  });

  console.log('[storage] upload response status:', uploadRes.status);

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error('[storage] upload error body:', err);
    throw new Error(`Storage upload failed (${uploadRes.status}): ${err}`);
  }

  const uploadData = await uploadRes.json();
  console.log('[storage] upload response:', JSON.stringify(uploadData, null, 2));

  // Firebase auto-generates a download token on upload — use it directly
  const downloadToken = uploadData.downloadTokens as string;
  if (!downloadToken) {
    throw new Error('Storage upload succeeded but no downloadTokens in response');
  }

  const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${nameParam}?alt=media&token=${downloadToken}`;
  console.log('[storage] final download URL:', downloadURL);
  return downloadURL;
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
