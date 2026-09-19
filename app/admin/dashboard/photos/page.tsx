'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import type { PhotoUpload, PhotoRender } from '@/lib/photos/types';
import type { LogoAsset } from '@/app/api/admin/photos/assets/route';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch, useAbortSignal, isAbortError, readBodyStringField, AdminRequestError, type GetIdToken } from '@/components/admin/adminFetch';
import { PhotoUploadPanel, type UploadPhase } from '@/components/admin/photos/PhotoUploadPanel';
import { PhotoLibrary } from '@/components/admin/photos/PhotoLibrary';
import { RenderControls, type RenderPhase } from '@/components/admin/photos/RenderControls';
import { RenderedGallery } from '@/components/admin/photos/RenderedGallery';

// ─── Component ────────────────────────────────────────────────────────────────
// Presentation runs on the marketing design system (app/globals.css) — the
// same .section-sm / .stamp-label-heading rhythm the admin sign-in page and
// AdminShell header use — so this reads as the same site, not a separate
// tool. No page-local CSS: every visual comes from globals.css classes.

function AdminPhotosPageContent({
  email,
  getToken,
  signOut,
}: {
  email: string;
  getToken: GetIdToken;
  signOut: () => Promise<void>;
}) {
  // Upload
  const [uploads, setUploads] = useState<PhotoUpload[]>([]);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMsg, setUploadMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Logos
  const [logos, setLogos] = useState<LogoAsset[]>([]);

  // Renders
  const [renders, setRenders] = useState<PhotoRender[]>([]);

  // Render controls
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [selectedLogoPath, setSelectedLogoPath] = useState<string | null>(null);
  const [placementX, setPlacementX] = useState(20);
  const [placementY, setPlacementY] = useState(20);
  const [placementW, setPlacementW] = useState(200);
  const [placementH, setPlacementH] = useState(200);
  const [placementOpacity, setPlacementOpacity] = useState(0.9);
  const [renderPhase, setRenderPhase] = useState<RenderPhase>('idle');
  const [renderMsg, setRenderMsg] = useState('');

  // Delete failures keep the row visible with a retry action (truthful
  // deletion — see deleteItem below). Keyed by record id.
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  const abortSignal = useAbortSignal();

  // Initial data load
  useEffect(() => {
    (async () => {
      const [origList, rendList, logoList] = await Promise.allSettled([
        adminFetch<{ items: PhotoUpload[] }>('/api/admin/photos/list?type=originals', getToken, { signal: abortSignal }),
        adminFetch<{ items: PhotoRender[] }>('/api/admin/photos/list?type=rendered', getToken, { signal: abortSignal }),
        adminFetch<{ logos: LogoAsset[] }>('/api/admin/photos/assets', getToken, { signal: abortSignal }),
      ]);
      if (origList.status === 'fulfilled') setUploads(origList.value.items ?? []);
      if (rendList.status === 'fulfilled') setRenders(rendList.value.items ?? []);
      if (logoList.status === 'fulfilled') setLogos(logoList.value.logos ?? []);
    })();
  }, [getToken, abortSignal]);

  // ── Upload ────────────────────────────────────────────────────────────────

  async function uploadFile(file: File) {
    setUploadPhase('uploading');
    setUploadProgress(10);
    setUploadMsg('');

    const form = new FormData();
    form.append('file', file);
    setUploadProgress(30);

    try {
      const body = await adminFetch<{ upload: PhotoUpload }>('/api/admin/photos/upload', getToken, {
        method: 'POST',
        body: form,
        signal: abortSignal,
      });
      setUploadProgress(90);
      const upload = body.upload;
      setUploads((prev) => [upload, ...prev]);
      setUploadPhase('success');
      setUploadProgress(100);
      const thumbnailNote = upload.thumbnailStatus === 'failed'
        ? ` — thumbnail generation failed${upload.thumbnailError ? `: ${upload.thumbnailError}` : ''}`
        : '';
      setUploadMsg(`Uploaded: ${upload.fileName} (${upload.width}×${upload.height})${thumbnailNote}`);
    } catch (err) {
      if (isAbortError(err)) return;
      setUploadPhase('error');
      const cleanup = err instanceof AdminRequestError ? readBodyStringField(err.body, 'cleanup') : undefined;
      const base = err instanceof Error ? err.message : 'Upload failed';
      setUploadMsg(cleanup ? `${base} (storage cleanup: ${cleanup})` : base);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  async function handleRender() {
    if (!selectedUploadId || !selectedLogoPath) return;
    const sourceUpload = uploads.find((u) => u.id === selectedUploadId);
    if (!sourceUpload) return;

    setRenderPhase('rendering');
    setRenderMsg('');

    try {
      const body = await adminFetch<{ render: PhotoRender }>('/api/admin/photos/render', getToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePhotoId: sourceUpload.id,
          sourceStoragePath: sourceUpload.storagePath,
          logoStoragePath: selectedLogoPath,
          placement: { x: placementX, y: placementY, width: placementW, height: placementH, opacity: placementOpacity },
          renderer: 'sharp',
        }),
        signal: abortSignal,
      });
      setRenders((prev) => [body.render, ...prev]);
      setRenderPhase('success');
      setRenderMsg('Render complete.');
    } catch (err) {
      if (isAbortError(err)) return;
      setRenderPhase('error');
      setRenderMsg(err instanceof Error ? err.message : 'Render failed');
    }
  }

  function onPlacementChange(field: 'x' | 'y' | 'w' | 'h' | 'opacity', value: number) {
    if (field === 'x') setPlacementX(value);
    else if (field === 'y') setPlacementY(value);
    else if (field === 'w') setPlacementW(value);
    else if (field === 'h') setPlacementH(value);
    else setPlacementOpacity(value);
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  // Only removes the row once the API confirms `ok: true`. A pending_cleanup
  // or metadata_delete_failed response keeps the row and shows the error
  // (`err.message` — the route's `error` field) so the admin can retry.

  async function deleteItem(collection: 'photoUploads' | 'photoRenders', id: string) {
    setDeleteErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      // 200 { ok: true, status: 'deleted' } is the only 2xx shape this route
      // returns; 502 (pending_cleanup) and 500 (metadata_delete_failed) are
      // non-2xx and land in the catch block below via adminFetch.
      await adminFetch<{ ok: true; status: 'deleted' }>('/api/admin/photos/delete', getToken, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, id }),
        signal: abortSignal,
      });
      if (collection === 'photoUploads') {
        setUploads((prev) => prev.filter((u) => u.id !== id));
        if (selectedUploadId === id) setSelectedUploadId(null);
      } else {
        setRenders((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      if (isAbortError(err)) return;
      // err.message is the route's `error` field (pending_cleanup / metadata_delete_failed) —
      // the row stays in state so it stays visible, with this message and a retry button.
      setDeleteErrors((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : 'Delete failed' }));
    }
  }

  const isUploading = uploadPhase === 'uploading';
  const isRendering = renderPhase === 'rendering';
  const canRender = !!selectedUploadId && !!selectedLogoPath && !isRendering;

  return (
    <AdminShell title="Photos" email={email} onSignOut={signOut}>
      <div id="admin-photos-page-content">

        <section className="section-sm" id="admin-photos-upload-section">
          <div className="stamp-label stamp-label-heading">Upload</div>
          <PhotoUploadPanel
            fileInputRef={fileInputRef}
            dragOver={dragOver}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onFileChange={onFileChange}
            onChooseClick={() => fileInputRef.current?.click()}
            isUploading={isUploading}
            uploadPhase={uploadPhase}
            uploadProgress={uploadProgress}
            uploadMsg={uploadMsg}
          />
        </section>

        <section className="section-sm" id="admin-photos-originals-section">
          <div className="stamp-label stamp-label-heading">Originals</div>
          <PhotoLibrary
            uploads={uploads}
            selectedUploadId={selectedUploadId}
            onSelect={setSelectedUploadId}
            onDelete={(u) => deleteItem('photoUploads', u.id)}
            deleteErrors={deleteErrors}
          />
        </section>

        <section className="section-sm" id="admin-photos-render-section">
          <div className="stamp-label stamp-label-heading">Render</div>
          <RenderControls
            logos={logos}
            selectedLogoPath={selectedLogoPath}
            onSelectLogo={setSelectedLogoPath}
            placementX={placementX}
            placementY={placementY}
            placementW={placementW}
            placementH={placementH}
            placementOpacity={placementOpacity}
            onPlacementChange={onPlacementChange}
            canRender={canRender}
            isRendering={isRendering}
            onRender={handleRender}
            sourceFileName={uploads.find((u) => u.id === selectedUploadId)?.fileName}
            renderPhase={renderPhase}
            renderMsg={renderMsg}
          />
        </section>

        <section className="section-sm" id="admin-photos-rendered-section">
          <div className="stamp-label stamp-label-heading">Rendered</div>
          <RenderedGallery
            renders={renders}
            onReRender={(r) => {
              setSelectedUploadId(r.sourcePhotoId);
              setSelectedLogoPath(r.logoStoragePath);
              setPlacementX(r.placement.x);
              setPlacementY(r.placement.y);
              setPlacementW(r.placement.width);
              setPlacementH(r.placement.height);
              setPlacementOpacity(r.placement.opacity);
              document.getElementById('admin-photos-render-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            onDelete={(r) => deleteItem('photoRenders', r.id)}
            deleteErrors={deleteErrors}
          />
        </section>

      </div>
    </AdminShell>
  );
}

export default function AdminPhotosPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>{(session) => <AdminPhotosPageContent email={session.email} getToken={session.getToken} signOut={session.signOut} />}</AdminGuard>
    </AdminSessionProvider>
  );
}
