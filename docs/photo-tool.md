# Admin Photo Tool — Architecture Notes

## Required env vars

```
# Client (already present)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Server-side (add to .env.local)
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY   # literal \n between lines; lib un-escapes automatically
```

Generate a service account key: Firebase Console → Project Settings → Service Accounts → Generate new private key.

## Firebase Storage paths

```
photos/originals/   ← uploaded source images (UUID.ext)
photos/rendered/    ← branded output images (UUID.jpg)
photos/logos/       ← logo assets (uploaded manually or via future route)
```

To seed logos: upload PNG/SVG files directly to `photos/logos/` in the Firebase Storage console or via the Firebase CLI.

## Firestore collections

### `photoUploads`
| Field        | Type   | Notes                         |
|-------------|--------|-------------------------------|
| id          | string | UUID                          |
| storagePath | string | `photos/originals/UUID.ext`   |
| downloadURL | string | Public GCS URL                |
| fileName    | string | Original filename             |
| contentType | string | e.g. `image/jpeg`             |
| width       | number | Pixels                        |
| height      | number | Pixels                        |
| uploadedBy  | string | Admin email                   |
| uploadedAt  | string | ISO timestamp                 |
| status      | string | `pending` / `complete` / `error` |

### `photoRenders`
| Field              | Type   | Notes                            |
|-------------------|--------|----------------------------------|
| id                | string | UUID                             |
| sourcePhotoId     | string | FK → photoUploads.id             |
| sourceStoragePath | string | `photos/originals/UUID.ext`      |
| logoStoragePath   | string | `photos/logos/name.png`          |
| renderStoragePath | string | `photos/rendered/UUID.jpg`       |
| renderDownloadURL | string | Public GCS URL                   |
| placement         | object | `{x,y,width,height,opacity}`     |
| rendererUsed      | string | `sharp` or `ffmpeg`              |
| createdBy         | string | Admin email                      |
| createdAt         | string | ISO timestamp                    |
| status            | string | `pending` / `complete` / `error` |

## Renderer abstraction

`lib/media/createRenderer(name)` returns a `MediaRenderer` instance.

- **`sharp`** (default / production): uses `sharp` for EXIF-aware JPEG composition.
- **`ffmpeg`**: uses `fluent-ffmpeg` + `ffmpeg-static`; selectable via `renderer: 'ffmpeg'` in the render API body. Writes temp files to `os.tmpdir()`, cleans up after run.

The render API route (`/api/admin/photos/render`) defaults to `sharp` and accepts an optional `renderer` field.

## API routes

All routes require a Firebase ID token in `Authorization: Bearer <token>` and check `admins/{email}` in Firestore.

| Route                          | Method | Purpose                          |
|-------------------------------|--------|----------------------------------|
| `/api/admin/photos/upload`    | POST   | Multipart upload → Storage + Firestore |
| `/api/admin/photos/list`      | GET    | List originals or rendered (`?type=`) |
| `/api/admin/photos/assets`    | GET    | List logos from Storage          |
| `/api/admin/photos/render`    | POST   | Render source + logo → Storage   |
| `/api/admin/photos/delete`    | DELETE | Remove Storage file + Firestore doc |

## Future work

- Async render jobs (queue-based, for large images or video)
- Batch render / bulk download
- Logo upload route (`/api/admin/photos/logos/upload`)
- Video/animation generation via the FFmpeg renderer (Phase 7 wired, not yet implemented)
- More advanced overlay controls (rotation, text, multiple layers)
- Firestore security rules aligned with the server-side admin check
