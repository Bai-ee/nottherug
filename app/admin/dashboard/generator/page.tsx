'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PhotoUpload } from '@/lib/photos/types';
import {
  CANVAS_PRESETS,
  DEFAULT_CANVAS_PRESET,
  DEFAULT_LOGO_ASSET,
  DEFAULT_LOGO_PLACEMENT,
  clampPlacement,
  type CanvasPresetKey,
  type LogoAssetKey,
  type NormalizedLogoPlacement,
  type GeneratorRender,
} from '@/lib/generator/types';
import { AdminSessionProvider } from '@/components/admin/AdminSession';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminFetch, useAbortSignal, isAbortError, readBodyStringField, AdminRequestError, type GetIdToken } from '@/components/admin/adminFetch';
import { GeneratorCanvas } from '@/components/admin/generator/GeneratorCanvas';
import { GeneratorControls } from '@/components/admin/generator/GeneratorControls';
import { GeneratorUploadPanel } from '@/components/admin/generator/GeneratorUploadPanel';
import { GeneratorExportOverlay, type GenPhase } from '@/components/admin/generator/GeneratorExportOverlay';
import { DeleteConfirmModal } from '@/components/admin/generator/DeleteConfirmModal';

// ─── Layout-only plumbing ─────────────────────────────────────────────────────
// The generator is a canvas editor: it sizes itself against the viewport and
// cannot scroll as a document (AdminShell renders it with layout="fixed" —
// see app/admin/admin.css `.admin-shell[data-admin-layout='fixed']`). Every
// visual (color, type, shadow, radius) now comes from the marketing classes
// in app/globals.css; this block is only the handful of sizes the canvas
// math and the desktop two-column controls grid depend on.
const css = `
  #admin-gen-canvas-zone { height: 260px; }
  #admin-gen-controls-grid { display: grid; grid-template-columns: 1fr; }
  @media (min-width: 768px) {
    #admin-gen-canvas-zone { height: 320px; }
    #admin-gen-controls-grid { grid-template-columns: 1fr 1fr; }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceMode = 'random' | 'selected';

// ─── Component ────────────────────────────────────────────────────────────────

function AdminGeneratorPageContent({
  email,
  getToken,
  signOut,
}: {
  email: string;
  getToken: GetIdToken;
  signOut: () => Promise<void>;
}) {
  // Source
  const [sourceMode,       setSourceMode]       = useState<SourceMode>('random');
  const [uploads,          setUploads]          = useState<PhotoUpload[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [uploadsLoaded,    setUploadsLoaded]    = useState(false);
  const [randomSource,     setRandomSource]     = useState<PhotoUpload | null>(null);
  const [pendingDelete,    setPendingDelete]    = useState<{ id: string; storagePath: string; fileName: string } | null>(null);
  const [deleteError,      setDeleteError]      = useState<{ id: string; storagePath: string; fileName: string; message: string } | null>(null);
  const [visibleCount,     setVisibleCount]     = useState(20);

  // Canvas
  const [preset, setPreset] = useState<CanvasPresetKey>(DEFAULT_CANVAS_PRESET);

  // Logo
  const [logoAsset, setLogoAsset] = useState<LogoAssetKey>(DEFAULT_LOGO_ASSET);

  // Placement
  const [placement, setPlacement] = useState<NormalizedLogoPlacement>(DEFAULT_LOGO_PLACEMENT);

  // Canvas display sizing
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // Output
  const [genPhase,   setGenPhase]   = useState<GenPhase>('idle');
  const [renders,    setRenders]    = useState<GeneratorRender[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [activeRender, setActiveRender] = useState<GeneratorRender | null>(null);
  const [genError, setGenError] = useState('');

  // Upload
  const [uploadPhase,    setUploadPhase]    = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMsg,      setUploadMsg]      = useState('');
  const [dragOver,       setDragOver]       = useState(false);

  // Refs
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const canvasZoneRef    = useRef<HTMLDivElement>(null);
  const isDraggingRef    = useRef(false);
  const fileInputRef     = useRef<HTMLInputElement>(null);

  const abortSignal = useAbortSignal();

  // ── Derived ──────────────────────────────────────────────────────────────────

  const currentPreset = CANVAS_PRESETS[preset];
  const aspectRatio   = currentPreset.width / currentPreset.height;

  const resolvedSource: PhotoUpload | null =
    sourceMode === 'selected'
      ? (uploads.find((u) => u.id === selectedUploadId) ?? null)
      : randomSource;

  const canGenerate =
    genPhase !== 'generating' &&
    (sourceMode === 'random'
      ? uploads.length === 0 || !!resolvedSource
      : !!selectedUploadId);

  const isGenerating = genPhase === 'generating';
  const isUploading  = uploadPhase === 'uploading';

  const logoOverlayCss = {
    position:     'absolute' as const,
    width:        `${placement.diameterRatio * 100}%`,
    aspectRatio:  '1',
    left:         `${(placement.xRatio - placement.diameterRatio / 2) * 100}%`,
    top:          `${(placement.yRatio - placement.diameterRatio * aspectRatio / 2) * 100}%`,
    borderRadius: '50%',
    overflow:     'hidden' as const,
    cursor:       'grab',
    touchAction:  'none' as const,
    boxShadow:    '0 2px 16px rgba(0,0,0,0.55)',
    zIndex:       2,
  };

  const latestRender = renders[0] ?? null;
  const displayRender = activeRender ?? latestRender;

  // ── Data load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const [origRes, histRes] = await Promise.allSettled([
        adminFetch<{ items: PhotoUpload[] }>('/api/admin/photos/list?type=originals', getToken, { signal: abortSignal }),
        adminFetch<{ renders: GeneratorRender[] }>('/api/admin/generator/list', getToken, { signal: abortSignal }),
      ]);

      if (origRes.status === 'fulfilled') {
        const items = origRes.value.items ?? [];
        setUploads(items);
        if (items.length > 0) {
          setRandomSource(items[Math.floor(Math.random() * items.length)]);
        }
      }
      setUploadsLoaded(true);

      if (histRes.status === 'fulfilled') {
        setRenders(histRes.value.renders ?? []);
      }
    })();
  }, [getToken, abortSignal]);

  // ── Canvas sizing via ResizeObserver ──────────────────────────────────────────

  useEffect(() => {
    const zone = canvasZoneRef.current;
    if (!zone) return;

    const compute = () => {
      const zoneW = zone.clientWidth;
      if (zoneW <= 0) return;
      // Use fixed zone heights matching the CSS constants — avoids relying on
      // clientHeight which may be 0 if the injected <style> hasn't been parsed yet.
      const zoneH = window.innerWidth >= 768 ? 320 : 260;
      const pad = 32; // 16px each side
      const availW = zoneW - pad;
      const availH = zoneH - pad;
      const ar = currentPreset.width / currentPreset.height;
      let w: number, h: number;
      if (ar > availW / availH) {
        w = availW;
        h = Math.round(w / ar);
      } else {
        h = availH;
        w = Math.round(h * ar);
      }
      setCanvasSize({ w: Math.max(80, w), h: Math.max(80, h) });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(zone);
    return () => ro.disconnect();
  }, [currentPreset.width, currentPreset.height]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function shuffleRandom() {
    if (uploads.length === 0) return;
    setRandomSource(uploads[Math.floor(Math.random() * uploads.length)]);
  }

  const placementFromClientPos = useCallback((clientX: number, clientY: number) => {
    const el = canvasWrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPlacement((prev) =>
      clampPlacement({
        xRatio:        (clientX - rect.left) / rect.width,
        yRatio:        (clientY - rect.top)  / rect.height,
        diameterRatio: prev.diameterRatio,
      }),
    );
  }, []);

  const onCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) return;
    placementFromClientPos(e.clientX, e.clientY);
  }, [placementFromClientPos]);

  const onLogoPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    isDraggingRef.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, []);

  const onLogoPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    placementFromClientPos(e.clientX, e.clientY);
  }, [placementFromClientPos]);

  const onLogoPointerUp = useCallback(() => {
    setTimeout(() => { isDraggingRef.current = false; }, 50);
  }, []);

  async function uploadFile(file: File) {
    setUploadPhase('uploading');
    setUploadProgress(10);
    setUploadMsg('');

    const form = new FormData();
    form.append('file', file);
    setUploadProgress(30);

    try {
      const data = await adminFetch<{ upload: PhotoUpload }>('/api/admin/photos/upload', getToken, {
        method: 'POST',
        body: form,
        signal: abortSignal,
      });
      setUploadProgress(90);
      const upload = data.upload;
      setUploads((prev) => [upload, ...prev]);
      if (!randomSource) setRandomSource(upload);
      setUploadPhase('success');
      const thumbnailNote = upload.thumbnailStatus === 'failed'
        ? ` — thumbnail generation failed${upload.thumbnailError ? `: ${upload.thumbnailError}` : ''}`
        : '';
      setUploadMsg(`Uploaded: ${upload.fileName}${thumbnailNote}`);
      setUploadProgress(100);
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

  // Only removes the upload from state once the API confirms `ok: true` — a
  // pending_cleanup / metadata_delete_failed response keeps it and surfaces
  // the error with a retry action instead of hiding the row.
  async function deleteUpload(id: string, storagePath: string, fileName: string) {
    try {
      await adminFetch<{ ok: true; status: 'deleted' }>('/api/admin/photos/delete', getToken, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: 'photoUploads', id }),
        signal: abortSignal,
      });
      setDeleteError((prev) => (prev?.id === id ? null : prev));
      setUploads((prev) => prev.filter((u) => u.id !== id));
      if (selectedUploadId === id) setSelectedUploadId(null);
      if (randomSource?.id === id) {
        const remaining = uploads.filter((u) => u.id !== id);
        setRandomSource(remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : null);
      }
    } catch (err) {
      if (isAbortError(err)) return;
      setDeleteError({ id, storagePath, fileName, message: err instanceof Error ? err.message : 'Delete failed' });
    }
  }

  async function handleGenerate() {
    if (sourceMode === 'selected' && !selectedUploadId) return;
    if (sourceMode === 'random' && !randomSource && uploads.length > 0) {
      shuffleRandom(); return;
    }

    setShowExport(true);
    setActiveRender(null);
    setGenError('');
    setGenPhase('generating');

    try {
      const body = await adminFetch<{ render: GeneratorRender }>('/api/admin/generator/render', getToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // No `renderer` field: sharp is the only production renderer, and
          // the route defaults to it. Do not offer a choice the UI can't
          // actually deliver on.
          sourceMode,
          sourcePhotoId: sourceMode === 'selected' ? selectedUploadId : randomSource?.id,
          canvasPreset: preset,
          logoAsset,
          placement,
        }),
        signal: abortSignal,
      });
      setActiveRender(body.render);
      setRenders((prev) => [body.render, ...prev.filter((render) => render.id !== body.render.id)]);
      setGenPhase('success');
    } catch (err) {
      if (isAbortError(err)) return;
      setGenPhase('error');
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    }
  }

  // ── Share handler ─────────────────────────────────────────────────────────────

  async function handleShare(r: GeneratorRender) {
    try {
      const blob = await fetch(r.renderDownloadURL).then((res) => res.blob());
      const file = new File([blob], `ntr-${r.id}.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Not The Rug' });
      } else {
        await navigator.share({ title: 'Not The Rug', url: r.renderDownloadURL });
      }
    } catch {
      const link = document.createElement('a');
      link.href = r.renderDownloadURL;
      link.download = `ntr-${r.id}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{css}</style>
      <AdminShell title="Generator" email={email} onSignOut={signOut} layout="fixed">
        <div id="admin-gen-shell" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

          <div id="admin-gen-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
            <GeneratorCanvas
              canvasZoneRef={canvasZoneRef}
              canvasWrapperRef={canvasWrapperRef}
              canvasSize={canvasSize}
              resolvedSource={resolvedSource}
              uploadsLoaded={uploadsLoaded}
              uploadsCount={uploads.length}
              sourceMode={sourceMode}
              logoOverlayCss={logoOverlayCss}
              logoAsset={logoAsset}
              onCanvasClick={onCanvasClick}
              onLogoPointerDown={onLogoPointerDown}
              onLogoPointerMove={onLogoPointerMove}
              onLogoPointerUp={onLogoPointerUp}
              preset={preset}
              onSelectPreset={setPreset}
            />

            <GeneratorControls
              placement={placement}
              onPlacementSizeChange={(diameterRatio) => setPlacement((prev) => clampPlacement({ ...prev, diameterRatio }))}
              onResetPlacement={() => setPlacement(DEFAULT_LOGO_PLACEMENT)}
              logoAsset={logoAsset}
              onSelectLogo={setLogoAsset}
              sourceMode={sourceMode}
              onSourceModeChange={setSourceMode}
              uploads={uploads}
              uploadsLoaded={uploadsLoaded}
              randomSource={randomSource}
              onShuffle={shuffleRandom}
              selectedUploadId={selectedUploadId}
              onSelectUpload={setSelectedUploadId}
            />

            <div
              id="admin-gen-bar"
              className="card card-pad"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'sticky', bottom: 0, borderRadius: 0 }}
            >
              <button className="btn btn-primary" style={{ width: '100%', maxWidth: 400, justifyContent: 'center' }} disabled={!canGenerate} onClick={handleGenerate}>
                {isGenerating ? 'Generating…' : 'Generate'}
              </button>
              <button
                id="admin-gen-upload-cta"
                className="btn btn-outline"
                style={{ width: '100%', maxWidth: 400, justifyContent: 'center' }}
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? 'Uploading…' : 'Upload Photo'}
              </button>
            </div>

            <GeneratorUploadPanel
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
              uploads={uploads}
              visibleCount={visibleCount}
              onShowMore={() => setVisibleCount((n) => n + 20)}
              selectedUploadId={selectedUploadId}
              onSelectUpload={(id) => { setSourceMode('selected'); setSelectedUploadId(id); }}
              onRequestDelete={(u) => setPendingDelete({ id: u.id, storagePath: u.storagePath, fileName: u.fileName })}
              deleteError={deleteError}
              onRetryDelete={() => deleteError && void deleteUpload(deleteError.id, deleteError.storagePath, deleteError.fileName)}
              onDismissDeleteError={() => setDeleteError(null)}
            />
          </div>

          {showExport && (
            <GeneratorExportOverlay
              genPhase={genPhase}
              genError={genError}
              displayRender={displayRender}
              renders={renders}
              onClose={() => setShowExport(false)}
              onSelectRender={setActiveRender}
              onShare={handleShare}
            />
          )}

          {pendingDelete && (
            <DeleteConfirmModal
              fileName={pendingDelete.fileName}
              onCancel={() => setPendingDelete(null)}
              onConfirm={() => {
                void deleteUpload(pendingDelete.id, pendingDelete.storagePath, pendingDelete.fileName);
                setPendingDelete(null);
              }}
            />
          )}

        </div>
      </AdminShell>
    </>
  );
}

export default function AdminGeneratorPage() {
  return (
    <AdminSessionProvider>
      <AdminGuard>{(session) => <AdminGeneratorPageContent email={session.email} getToken={session.getToken} signOut={session.signOut} />}</AdminGuard>
    </AdminSessionProvider>
  );
}
