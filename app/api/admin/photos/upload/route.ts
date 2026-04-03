import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/server/verifyAdmin';
import { adminDb } from '@/lib/firebase-admin';
import { storageUpload } from '@/lib/server/firebaseStorage';
import { STORAGE_PATHS, COLLECTIONS } from '@/lib/photos/types';
import type { PhotoUpload } from '@/lib/photos/types';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let adminEmail: string;
  try {
    adminEmail = await verifyAdmin(req);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const contentType = file.type || 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(buffer).rotate().metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch {
    return NextResponse.json({ error: 'Could not read image metadata' }, { status: 400 });
  }

  const id = uuidv4();
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const originalName = (file as File).name ?? `upload.${ext}`;
  const storagePath = `${STORAGE_PATHS.originals}/${id}.${ext}`;

  let downloadURL: string;
  try {
    downloadURL = await storageUpload(storagePath, buffer, contentType);
  } catch (err) {
    console.error('Storage upload failed:', err);
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 });
  }

  const record: PhotoUpload = {
    id,
    storagePath,
    downloadURL,
    fileName: originalName,
    contentType,
    width,
    height,
    uploadedBy: adminEmail,
    uploadedAt: new Date().toISOString(),
    status: 'complete',
  };

  try {
    await adminDb.collection(COLLECTIONS.photoUploads).doc(id).set(record);
  } catch (err) {
    console.error('Firestore write failed:', err);
    return NextResponse.json({ error: 'Metadata write failed' }, { status: 500 });
  }

  return NextResponse.json({ upload: record }, { status: 200 });
}
