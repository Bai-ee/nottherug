'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User, getIdToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { PhotoUpload, PhotoRender } from '@/lib/photos/types';
import type { LogoAsset } from '@/app/api/admin/photos/assets/route';

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400&family=Outfit:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #1F2318; }

  .ph { background: #1F2318; color: #B4C89E; font-family: 'Outfit', sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; }

  /* ── TOPBAR ── */
  .ph-top { position: sticky; top: 0; z-index: 20; height: 48px; background: #1F2318; border-bottom: 1px solid #2E3828; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; }
  .ph-top-l { display: flex; align-items: center; gap: 14px; }
  .ph-brand { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #4E5A42; }
  .ph-vsep  { width: 1px; height: 14px; background: #2E3828; }
  .ph-top-title { font-family: 'Fraunces', serif; font-size: 14px; font-weight: 400; color: #EEF4DB; }
  .ph-top-r { display: flex; align-items: center; gap: 20px; }
  .ph-topemail { font-family: 'Space Mono', monospace; font-size: 11px; color: #4E5A42; }
  .ph-signout { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #C4674B; background: none; border: none; cursor: pointer; padding: 0; transition: color 150ms; }
  .ph-signout:hover { color: #EEF4DB; }

  /* ── NAV ── */
  .ph-nav { display: flex; align-items: center; border-bottom: 1px solid #2E3828; background: #1A1E14; padding: 0 32px; }
  .ph-nav-link { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #4E5A42; padding: 12px 16px; border-bottom: 2px solid transparent; text-decoration: none; transition: color 150ms; display: block; }
  .ph-nav-link:hover { color: #B4C89E; }
  .ph-nav-link-active { color: #EEF4DB; border-bottom-color: #B4C89E; }

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

  .ph-empty { font-size: 13px; color: #4E5A42; font-style: italic; }
  .ph-no-logos { font-family: 'Space Mono', monospace; font-size: 11px; color: #4E5A42; }

  @media (max-width: 768px) {
    .ph-page { padding: 24px 16px 60px; }
    .ph-gallery { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
    .ph-controls-grid { grid-template-columns: repeat(2, 1fr); }
    .ph-top { padding: 0 16px; }
    .ph-nav { padding: 0 16px; }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadPhase = 'idle' | 'uploading' | 'success' | 'error';
type RenderPhase = 'idle' | 'rendering' | 'success' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPhotosPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

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

  // Auth + initial data load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || !firebaseUser.email) { router.push('/admin'); return; }
      const snap = await getDoc(doc(db, 'admins', firebaseUser.email));
      if (!snap.exists()) { router.push('/admin'); return; }
      setUser(firebaseUser);
      setAuthChecked(true);

      const token = await getIdToken(firebaseUser, true);
      const headers = { Authorization: `Bearer ${token}` };

      const [origRes, rendRes, logoRes] = await Promise.all([
        fetch('/api/admin/photos/list?type=originals', { headers }),
        fetch('/api/admin/photos/list?type=rendered', { headers }),
        fetch('/api/admin/photos/assets', { headers }),
      ]);

      if (origRes.ok) setUploads((await origRes.json()).items ?? []);
      if (rendRes.ok) setRenders((await rendRes.json()).items ?? []);
      if (logoRes.ok) setLogos((await logoRes.json()).logos ?? []);
    });
    return () => unsub();
  }, [router]);

  async function handleSignOut() {
    await signOut(auth);
    router.push('/admin');
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  async function uploadFile(file: File) {
    if (!user) return;
    setUploadPhase('uploading');
    setUploadProgress(10);
    setUploadMsg('');

    let token: string;
    try {
      token = await getIdToken(user, true);
    } catch {
      setUploadPhase('error');
      setUploadMsg('Could not get auth token.');
      return;
    }

    setUploadProgress(30);
    const form = new FormData();
    form.append('file', file);

    let res: Response;
    try {
      res = await fetch('/api/admin/photos/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
    } catch {
      setUploadPhase('error');
      setUploadMsg('Network error during upload.');
      return;
    }

    setUploadProgress(90);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setUploadPhase('error');
      setUploadMsg(body.error ?? `Upload failed (${res.status})`);
      return;
    }

    const body = await res.json();
    const upload: PhotoUpload = body.upload;
    setUploads((prev) => [upload, ...prev]);
    setUploadPhase('success');
    setUploadMsg(`Uploaded: ${upload.fileName} (${upload.width}×${upload.height})`);
    setUploadProgress(100);
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
    if (!user || !selectedUploadId || !selectedLogoPath) return;

    const sourceUpload = uploads.find((u) => u.id === selectedUploadId);
    if (!sourceUpload) return;

    setRenderPhase('rendering');
    setRenderMsg('');

    let token: string;
    try {
      token = await getIdToken(user, true);
    } catch {
      setRenderPhase('error');
      setRenderMsg('Could not get auth token.');
      return;
    }

    let res: Response;
    try {
      res = await fetch('/api/admin/photos/render', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourcePhotoId: sourceUpload.id,
          sourceStoragePath: sourceUpload.storagePath,
          logoStoragePath: selectedLogoPath,
          placement: {
            x: placementX,
            y: placementY,
            width: placementW,
            height: placementH,
            opacity: placementOpacity,
          },
          renderer: 'sharp',
        }),
      });
    } catch {
      setRenderPhase('error');
      setRenderMsg('Network error during render.');
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setRenderPhase('error');
      setRenderMsg(body.error ?? `Render failed (${res.status})`);
      return;
    }

    const body = await res.json();
    const render: PhotoRender = body.render;
    setRenders((prev) => [render, ...prev]);
    setRenderPhase('success');
    setRenderMsg('Render complete.');
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  async function deleteItem(
    collection: 'photoUploads' | 'photoRenders',
    id: string,
    storagePath: string,
  ) {
    if (!user) return;
    const token = await getIdToken(user, true);
    await fetch('/api/admin/photos/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ collection, id, storagePath }),
    });
    if (collection === 'photoUploads') {
      setUploads((prev) => prev.filter((u) => u.id !== id));
      if (selectedUploadId === id) setSelectedUploadId(null);
    } else {
      setRenders((prev) => prev.filter((r) => r.id !== id));
    }
  }

  const isUploading = uploadPhase === 'uploading';
  const isRendering = renderPhase === 'rendering';
  const canRender = !!selectedUploadId && !!selectedLogoPath && !isRendering;

  if (!authChecked) {
    return (
      <div style={{ background: '#1F2318', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400&display=swap');`}</style>
        <span style={{ fontFamily: '"Space Mono",monospace', fontSize: '11px', letterSpacing: '0.1em', color: '#4E5A42', textTransform: 'uppercase' }}>[LOADING...]</span>
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="ph" id="admin-photos-shell">

        {/* TOPBAR */}
        <div className="ph-top" id="admin-photos-topbar">
          <div className="ph-top-l">
            <span className="ph-brand">NTR</span>
            <div className="ph-vsep" />
            <span className="ph-top-title">Admin</span>
          </div>
          <div className="ph-top-r">
            <span className="ph-topemail">{user?.email}</span>
            <button className="ph-signout" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        {/* NAV */}
        <nav className="ph-nav" id="admin-photos-nav">
          <a className="ph-nav-link" href="/admin/dashboard">Overview</a>
          <a className="ph-nav-link ph-nav-link-active" href="/admin/dashboard/photos">Photos</a>
        </nav>

        {/* PAGE */}
        <div className="ph-page" id="admin-photos-page">
          <div className="ph-page-header" id="admin-photos-page-header">
            <div className="ph-page-eyebrow">Admin · Photo Tool</div>
            <div className="ph-page-title">Photos</div>
            <div className="ph-page-sub">Upload, brand, and download images.</div>
          </div>

          {/* ── UPLOAD ── */}
          <div className="ph-section" id="admin-photos-upload-section">
            <div className="ph-section-head">
              <span className="ph-section-label">Upload</span>
              <div className="ph-section-rule" />
            </div>

            <div
              id="admin-photos-upload-zone"
              className={`ph-upload-zone${dragOver ? ' ph-upload-zone-drag' : ''}`}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <div className="ph-upload-zone-icon">[↑]</div>
              <div className="ph-upload-zone-label">Tap to select or drag an image</div>
              <div className="ph-upload-zone-hint">JPEG · PNG · HEIC · phone camera supported</div>
              <button
                className="ph-btn"
                disabled={isUploading}
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                {isUploading ? 'Uploading…' : 'Choose Photo'}
              </button>

              {uploadPhase === 'uploading' && (
                <div style={{ width: '100%', maxWidth: 320 }}>
                  <div className="ph-progress-bar-shell">
                    <div className="ph-progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <div className="ph-progress-label">Uploading…</div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              className="ph-upload-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFileChange}
            />

            {uploadPhase === 'success' && <div className="ph-status-ok" id="admin-photos-upload-success">{uploadMsg}</div>}
            {uploadPhase === 'error' && <div className="ph-status-err" id="admin-photos-upload-error">Error: {uploadMsg}</div>}
          </div>

          {/* ── ORIGINALS ── */}
          <div className="ph-section" id="admin-photos-originals-section">
            <div className="ph-section-head">
              <span className="ph-section-label">Originals</span>
              <div className="ph-section-rule" />
            </div>
            {uploads.length === 0 ? (
              <div className="ph-empty">No uploads yet.</div>
            ) : (
              <div className="ph-gallery" id="admin-photos-originals-gallery">
                {uploads.map((u) => (
                  <div
                    key={u.id}
                    className={`ph-gallery-item${selectedUploadId === u.id ? ' ph-gallery-item-selected' : ''}`}
                    onClick={() => setSelectedUploadId(u.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="ph-gallery-img" src={u.downloadURL} alt={u.fileName} />
                    <div className="ph-gallery-meta">
                      <div className="ph-gallery-name">{u.fileName}</div>
                      <div className="ph-gallery-dim">{u.width}×{u.height}</div>
                    </div>
                    <div style={{ padding: '0 12px 10px', display: 'flex', gap: 6 }}>
                      <button
                        className="ph-btn-delete"
                        onClick={(e) => { e.stopPropagation(); deleteItem('photoUploads', u.id, u.storagePath); }}
                      >Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RENDER ── */}
          <div className="ph-section" id="admin-photos-render-section">
            <div className="ph-section-head">
              <span className="ph-section-label">Render</span>
              <div className="ph-section-rule" />
            </div>

            <div className="ph-render-panel" id="admin-photos-render-panel">
              {/* Logo selection */}
              <div className="ph-field-group" id="admin-photos-logo-selector">
                <div className="ph-field-label">Select Logo</div>
                {logos.length === 0 ? (
                  <div className="ph-no-logos">No logos in storage. Upload files to photos/logos/ in Firebase Storage.</div>
                ) : (
                  <div className="ph-logo-grid">
                    {logos.map((l) => (
                      <div
                        key={l.storagePath}
                        className={`ph-logo-item${selectedLogoPath === l.storagePath ? ' ph-logo-item-selected' : ''}`}
                        onClick={() => setSelectedLogoPath(l.storagePath)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="ph-logo-img" src={l.downloadURL} alt={l.name} />
                        <div className="ph-logo-name">{l.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Placement controls */}
              <div className="ph-field-group" id="admin-photos-placement-controls">
                <div className="ph-field-label">Logo Placement</div>
                <div className="ph-controls-grid">
                  <div className="ph-control">
                    <label className="ph-field-label" htmlFor="ph-x">X (px)</label>
                    <input id="ph-x" className="ph-control-input" type="number" value={placementX} onChange={(e) => setPlacementX(Number(e.target.value))} />
                  </div>
                  <div className="ph-control">
                    <label className="ph-field-label" htmlFor="ph-y">Y (px)</label>
                    <input id="ph-y" className="ph-control-input" type="number" value={placementY} onChange={(e) => setPlacementY(Number(e.target.value))} />
                  </div>
                  <div className="ph-control">
                    <label className="ph-field-label" htmlFor="ph-w">Width (px)</label>
                    <input id="ph-w" className="ph-control-input" type="number" value={placementW} onChange={(e) => setPlacementW(Number(e.target.value))} />
                  </div>
                  <div className="ph-control">
                    <label className="ph-field-label" htmlFor="ph-h">Height (px)</label>
                    <input id="ph-h" className="ph-control-input" type="number" value={placementH} onChange={(e) => setPlacementH(Number(e.target.value))} />
                  </div>
                  <div className="ph-control">
                    <label className="ph-field-label" htmlFor="ph-op">Opacity (0–1)</label>
                    <input id="ph-op" className="ph-control-input" type="number" min={0} max={1} step={0.05} value={placementOpacity} onChange={(e) => setPlacementOpacity(Number(e.target.value))} />
                  </div>
                </div>
              </div>

              {/* Render action */}
              <div className="ph-render-actions" id="admin-photos-render-actions">
                <button className="ph-btn" disabled={!canRender} onClick={handleRender}>
                  {isRendering ? 'Rendering…' : 'Render'}
                </button>
                {selectedUploadId && (
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '10px', color: '#4E5A42' }}>
                    Source: {uploads.find((u) => u.id === selectedUploadId)?.fileName ?? '—'}
                  </span>
                )}
              </div>

              {renderPhase === 'success' && <div className="ph-status-ok" id="admin-photos-render-success">{renderMsg}</div>}
              {renderPhase === 'error' && <div className="ph-status-err" id="admin-photos-render-error">Error: {renderMsg}</div>}
            </div>
          </div>

          {/* ── RENDERED OUTPUTS ── */}
          <div className="ph-section" id="admin-photos-rendered-section">
            <div className="ph-section-head">
              <span className="ph-section-label">Rendered</span>
              <div className="ph-section-rule" />
            </div>
            {renders.length === 0 ? (
              <div className="ph-empty">No rendered outputs yet.</div>
            ) : (
              <div className="ph-gallery" id="admin-photos-rendered-gallery">
                {renders.map((r) => (
                  <div key={r.id} className="ph-rendered-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="ph-gallery-img" src={r.renderDownloadURL} alt={r.id} />
                    <div className="ph-rendered-actions">
                      <a
                        className="ph-rendered-download"
                        href={r.renderDownloadURL}
                        download={`render-${r.id}.jpg`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download
                      </a>
                      <button
                        className="ph-btn-ghost ph-btn"
                        style={{ fontSize: '10px', padding: '5px 10px' }}
                        onClick={() => {
                          setSelectedUploadId(r.sourcePhotoId);
                          setSelectedLogoPath(r.logoStoragePath);
                          setPlacementX(r.placement.x);
                          setPlacementY(r.placement.y);
                          setPlacementW(r.placement.width);
                          setPlacementH(r.placement.height);
                          setPlacementOpacity(r.placement.opacity);
                          document.getElementById('admin-photos-render-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >Re-render</button>
                      <button
                        className="ph-btn-delete"
                        onClick={() => deleteItem('photoRenders', r.id, r.renderStoragePath)}
                      >Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
