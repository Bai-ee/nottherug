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

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400&family=Outfit:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #1F2318; }

  .ph { background: #1F2318; color: #B4C89E; font-family: 'Outfit', sans-serif; -webkit-font-smoothing: antialiased; min-height: 100%; }

  /* ── PAGE ── */
  .ph-page { max-width: 1100px; margin: 0 auto; padding: 40px 32px 80px; }

  /* ── PAGE HEADER ── */
  .ph-page-header { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #2E3828; }
  .ph-page-eyebrow { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #4E5A42; margin-bottom: 12px; }
  .ph-page-title { font-family: 'Fraunces', serif; font-size: 36px; font-weight: 400; color: #EEF4DB; line-height: 1.1; }
  .ph-page-sub { font-family: 'Fraunces', serif; font-style: italic; font-size: 15px; font-weight: 300; color: #7A9068; margin-top: 8px; }

  /* ── SECTION ── */
  .ph-section { margin-bottom: 48px; }
  .ph-section-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #2E3828; }
  .ph-section-label { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #4E5A42; }
  .ph-section-rule { width: 16px; height: 2px; background: #7A9068; border-radius: 1px; flex-shrink: 0; align-self: center; }

  /* ── UPLOAD ZONE ── */
  .ph-upload-zone { background: #252E1F; border: 1px dashed #333D2A; border-radius: 10px; padding: 40px 32px; display: flex; flex-direction: column; align-items: center; gap: 16px; cursor: pointer; transition: border-color 150ms, background 150ms; }
  .ph-upload-zone:hover, .ph-upload-zone-drag { border-color: #7A9068; background: #2A3322; }
  .ph-upload-zone-icon { font-family: 'Space Mono', monospace; font-size: 28px; color: #4E5A42; }
  .ph-upload-zone-label { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #4E5A42; text-align: center; }
  .ph-upload-zone-hint { font-size: 12px; color: #3A4532; }
  .ph-upload-input { display: none; }

  /* ── BUTTONS ── */
  .ph-btn { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #1F2318; background: #B4C89E; border: none; border-radius: 4px; padding: 10px 20px; cursor: pointer; transition: background 150ms; }
  .ph-btn:hover { background: #EEF4DB; }
  .ph-btn:disabled { background: #2E3828; color: #4E5A42; cursor: default; }
  .ph-btn-ghost { background: transparent; color: #7A9068; border: 1px solid #333D2A; }
  .ph-btn-ghost:hover { background: #252E1F; color: #B4C89E; }

  /* ── PROGRESS ── */
  .ph-progress-bar-shell { width: 100%; height: 4px; background: #2E3828; border-radius: 2px; overflow: hidden; }
  .ph-progress-bar-fill { height: 100%; background: #B4C89E; border-radius: 2px; transition: width 200ms; }
  .ph-progress-label { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #7A9068; margin-top: 8px; text-align: center; }

  /* ── STATUS ── */
  .ph-status-ok  { font-family: 'Space Mono', monospace; font-size: 11px; color: #B4C89E; background: rgba(180,200,158,0.08); border: 1px solid rgba(180,200,158,0.2); border-radius: 6px; padding: 10px 14px; margin-top: 12px; }
  .ph-status-err { font-family: 'Space Mono', monospace; font-size: 11px; color: #C4674B; background: rgba(196,103,75,0.08); border: 1px solid rgba(196,103,75,0.2); border-radius: 6px; padding: 10px 14px; margin-top: 12px; }

  /* ── GALLERY ── */
  .ph-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .ph-gallery-item { background: #252E1F; border: 1px solid #2E3828; border-radius: 8px; overflow: hidden; cursor: pointer; transition: border-color 150ms; }
  .ph-gallery-item:hover { border-color: #7A9068; }
  .ph-gallery-item-selected { border-color: #B4C89E; }
  .ph-gallery-img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; background: #1F2318; }
  .ph-gallery-meta { padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ph-gallery-name { font-family: 'Space Mono', monospace; font-size: 10px; color: #B4C89E; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ph-gallery-dim { font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 0.06em; color: #4E5A42; flex-shrink: 0; }

  /* ── RENDER PANEL ── */
  .ph-render-panel { background: #252E1F; border: 1px solid #2E3828; border-radius: 10px; padding: 28px; display: flex; flex-direction: column; gap: 20px; }
  .ph-field-group { display: flex; flex-direction: column; gap: 8px; }
  .ph-field-label { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #4E5A42; }
  .ph-logo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; }
  .ph-logo-item { background: #1F2318; border: 1px solid #2E3828; border-radius: 6px; padding: 8px; cursor: pointer; transition: border-color 150ms; text-align: center; }
  .ph-logo-item:hover { border-color: #7A9068; }
  .ph-logo-item-selected { border-color: #B4C89E; }
  .ph-logo-img { width: 100%; aspect-ratio: 1; object-fit: contain; display: block; }
  .ph-logo-name { font-family: 'Space Mono', monospace; font-size: 9px; color: #4E5A42; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ph-controls-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .ph-control { display: flex; flex-direction: column; gap: 6px; }
  .ph-control-input { background: #1F2318; border: 1px solid #333D2A; border-radius: 4px; color: #EEF4DB; font-family: 'Space Mono', monospace; font-size: 12px; padding: 8px 10px; width: 100%; }
  .ph-control-input:focus { outline: none; border-color: #7A9068; }
  .ph-render-actions { display: flex; align-items: center; gap: 12px; }

  /* ── RENDERED ITEM ── */
  .ph-rendered-item { background: #252E1F; border: 1px solid #2E3828; border-radius: 8px; overflow: hidden; }
  .ph-rendered-actions { padding: 10px 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .ph-rendered-download { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #B4C89E; text-decoration: none; background: #2E3828; border-radius: 3px; padding: 5px 10px; transition: background 150ms; }
  .ph-rendered-download:hover { background: #3A4532; }

  /* ── DELETE BTN ── */
  .ph-btn-delete { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #C4674B; background: transparent; border: 1px solid rgba(196,103,75,0.25); border-radius: 3px; padding: 5px 10px; cursor: pointer; transition: background 150ms; }
  .ph-btn-delete:hover { background: rgba(196,103,75,0.1); }

  /* ── PER-ITEM ERROR (thumbnail / delete failures kept visible, not hidden) ── */
  .ph-item-error { font-family: 'Space Mono', monospace; font-size: 9px; color: #C4674B; padding: 0 12px 8px; line-height: 1.4; }

  .ph-empty { font-size: 13px; color: #4E5A42; font-style: italic; }
  .ph-no-logos { font-family: 'Space Mono', monospace; font-size: 11px; color: #4E5A42; }

  @media (max-width: 768px) {
    .ph-page { padding: 24px 16px 60px; }
    .ph-gallery { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
    .ph-controls-grid { grid-template-columns: repeat(2, 1fr); }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

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
    <>
      <style>{css}</style>
      <AdminShell title="Admin · Photos" email={email} onSignOut={signOut}>
      <div className="ph" id="admin-photos-shell">

        <div className="ph-page" id="admin-photos-page">
          <div className="ph-page-header" id="admin-photos-page-header">
            <div className="ph-page-eyebrow">Admin · Photo Tool</div>
            <div className="ph-page-title">Photos</div>
            <div className="ph-page-sub">Upload, brand, and download images.</div>
          </div>

          <div className="ph-section" id="admin-photos-upload-section">
            <div className="ph-section-head">
              <span className="ph-section-label">Upload</span>
              <div className="ph-section-rule" />
            </div>
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
          </div>

          <div className="ph-section" id="admin-photos-originals-section">
            <div className="ph-section-head">
              <span className="ph-section-label">Originals</span>
              <div className="ph-section-rule" />
            </div>
            <PhotoLibrary
              uploads={uploads}
              selectedUploadId={selectedUploadId}
              onSelect={setSelectedUploadId}
              onDelete={(u) => deleteItem('photoUploads', u.id)}
              deleteErrors={deleteErrors}
            />
          </div>

          <div className="ph-section" id="admin-photos-render-section">
            <div className="ph-section-head">
              <span className="ph-section-label">Render</span>
              <div className="ph-section-rule" />
            </div>
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
          </div>

          <div className="ph-section" id="admin-photos-rendered-section">
            <div className="ph-section-head">
              <span className="ph-section-label">Rendered</span>
              <div className="ph-section-rule" />
            </div>
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
          </div>

        </div>
      </div>
      </AdminShell>
    </>
  );
}

export default function AdminPhotosPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>{(session) => <AdminPhotosPageContent email={session.email} getToken={session.getToken} signOut={session.signOut} />}</AdminGuard>
    </AdminSessionProvider>
  );
}
