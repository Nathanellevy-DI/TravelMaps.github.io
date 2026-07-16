# TravelMaps Codebase Handoff & Knowledge Base

This document contains a comprehensive summary of all architectural updates, features, database migrations, and integrations implemented in the TravelMaps codebase. Paste this entire document into any new developer or AI assistant chat to immediately bootstrap their context.

---

## 🔑 Environment & Third-Party Keys
* **Resend API Key:** Set as `RESEND_API_KEY` env var on Render (do NOT commit to repo)
* **Resend Sender Email (Sandbox):** `"TravelMaps" <onboarding@resend.dev>`
* **Production Domain:** `https://www.travelmaps.world`
* **Secret Registration Bypass URL:** `https://www.travelmaps.world/#/secret-signup` (automatically applies invite code `TravelMapsVIP` to let invited users register instantly).
* **Required Server Env Vars (set on Render dashboard):**
  * `SUPABASE_URL` — Supabase project URL
  * `SUPABASE_KEY` — Supabase service role key
  * `DATABASE_URL` — PostgreSQL connection string
  * `ENCRYPTION_KEY` — Exactly 32 characters for AES-256-CBC media encryption
  * `JWT_SECRET` — Secret for signing auth tokens
  * `RESEND_API_KEY` — Resend.com API key for invitation emails

## 🏗️ Deployment Architecture
* **Frontend:** Hosted on **Vercel** (auto-deploys from `main` branch on GitHub). Domain: `www.travelmaps.world`.
* **Backend API:** Hosted on **Render** at `https://travelmaps.onrender.com`. Auto-deploys from the same `main` branch.
* **Database:** Supabase PostgreSQL (connection via `DATABASE_URL` env var).
* **File Storage:** Supabase Storage bucket `media` for encrypted media files.
* **GitHub Repo:** `Nathanellevy-DI/TravelMaps.github.io` — `main` branch.
* **Vite base path:** `base: '/'` in `vite.config.js` (changed from `/TravelMaps.github.io/` for Vercel).
* **IMPORTANT:** There is NO GitHub Actions CI/CD. Vercel auto-builds frontend from `main`. Render auto-deploys backend from `main`. The `gh-pages` branch is stale and unused.

---

## 🛠️ Work Accomplished & Architectural Overview

### 1. User Authentication & Waitlist Administration
* **Waitlist Bypass Flow:** Implemented a secret hash signup route `#/secret-signup` in `src/App.jsx` and `src/components/Auth/RegisterPage.jsx` which bypasses the waitlist restriction.
* **Synchronous Waitlist Emails:**
  * Upgraded `sendInvitationEmail(toEmail)` in `server/server.js` to prioritize dispatching emails via Resend's HTTP API, falling back to SMTP only if SMTP environment variables are configured.
  * Waitlist invite (`/api/admin/waitlist/invite`) and resend (`/api/admin/waitlist/resend-invite`) endpoints are now synchronous (`await`). They return success **only** if the email is successfully dispatched. If Resend returns an error (e.g., Sandbox 403 blocks), the error is sent to the frontend.
  * Updated `AdminPanel.jsx` to display detailed server-side email dispatch errors in browser alerts for troubleshooting.
* **Admin Database Migration:** Migrated the administrator user ID in the database from the non-UUID string `'u_admin_123'` to a valid UUID format (`d2f476a8-8b5e-4c12-9c3f-d372fa0a941f`) to satisfy database constraints.

### 2. Universal Syncing of Pins & Memories
* **Database Integration:** Replaced local `IndexedDB` storage in `src/contexts/PlacesContext.jsx` with active backend API requests (`GET /api/places`, `POST /api/places`, `DELETE /api/places/:id`, `PUT /api/places/:id`, `GET /api/places/:id`).
* **Offline Fallback & Auto-Sync:**
  * IndexedDB is maintained as an offline cache.
  * On login/mount, `fetchPlaces()` compares local IndexedDB data with the server. Any places created offline or prior to the backend migration are automatically uploaded (`POST`) to the database.
* **`ensurePlaceOnBackend()` Helper (Session 2):**
  * Critical helper function that checks if a place exists on the backend (`GET /api/places/:id`) before any update/upload operation.
  * If the place only exists locally (returns 404), it automatically POSTs the full place to the backend first.
  * Called in `updatePlace()`, `updateVisibility()`, and `uploadMedia()`.
  * **Why this exists:** Places created by clicking the map get `p_` + timestamp IDs and are saved locally immediately. If the initial `POST /api/places` fails silently (network issues, token expired), the place only exists in IndexedDB. All subsequent operations (share, upload, edit notes) would fail with "Place not found" 404.
* **E2E Encrypted Memory Uploads:**
  * Memories (photos, videos, audio, text notes, files) are encrypted with AES-256-cbc on the server before storage.
  * When rendering place details, `PlaceDetailsModal.jsx` fetches the encrypted file from `/api/media/:media_id`, decrypts it, and renders it using memory-safe Blob URLs (`URL.createObjectURL`).
* **3GB File Upload Capabilities:**
  * Configured Multer in `server/server.js` to use disk storage (`server/uploads/`) instead of memory storage to avoid Out-Of-Memory (OOM) crashes.
  * File uploads now support up to **3GB** (increased from 20MB).
  * Implemented stream-based encryption piping (`readStream.pipe(cipher).pipe(writeStream)`) to process massive files without loading them into RAM.
  * Disabled connection timeout on the Node server (`server.timeout = 0`) to prevent cut-offs during 3GB transfers.
  * Replaced Base64 file loaders on the frontend with lightweight `URL.createObjectURL(file)` to prevent browser tab crashes.
  * Created generic file card UI with a **Download** button in `PlaceDetailsModal` for non-media attachments (PDFs, zip, docx).
* **Client-Side Image Compression:**
  * High-resolution images selected on the frontend are automatically compressed using HTML5 `<canvas>` (rescaled to max 2048px width/height and encoded as JPEG at `0.85` quality). This reduces image payload sizes by ~90% while preserving resolution.

### 3. Social Sharing with Friends
* **Real-time Search:** Replaced mock searches in `FriendsContent.jsx` with backend fetches (`/api/users/search?q=query`).
* **Direct Targeted Sharing:**
  * Added ability to share a pin with a **specific individual friend** rather than just "friends" or "public".
  * The `ShareModal.jsx` retrieves friends from `SocialContext` and lets the user select a specific friend. This sets the place's `visibility` column directly to that friend's user ID.
  * Updated backend SQL queries (`GET /api/places`) to retrieve places where `p.visibility = $userId`, allowing target friends to view them.
  * Hidden the "Share" and "Delete" actions in the sidebar for pins that are shared by friends.
* **Implicit Media Access:**
  * Updated backend media access control (`GET /api/media/:media_id`). If a user has permission to view a place, they are automatically authorized to decrypt and download any media/memories attached to it, avoiding 403 Forbidden errors on shared memories.
* **Locked Option Styling:**
  * Defined `.small-btn.primary` in `index.css` to match hover states, locking selected visibility states (Private, Group, Public) as active.

### 4. Real-Time Cross-Device Sync (Session 2)
* **Socket.IO Integration:**
  * Added `socket.io-client` to frontend (`PlacesContext.jsx`, `SocialContext.jsx`).
  * Added `socket.io` server to backend (`server/server.js` via `http.createServer` + `new Server()`).
  * On `places_update` event → calls `fetchPlaces()` to refresh all places.
  * On `friends_update` / `notification_update` → calls `loadSocialData()`.
  * Server emits these events on all relevant mutations (add/delete/update place, friend request, etc.).
  * Uses `loadingRef` to debounce rapid re-fetches.

### 5. YouTube Integration (Session 2)
* **YouTube Player on Pins:**
  * Added YouTube URL input field in `PlaceDetailsModal.jsx` — owners/collaborators can paste a YouTube link.
  * Extracts video ID from various URL formats (youtube.com/watch, youtu.be, embed, bare ID).
  * Renders an embedded `<iframe>` with `youtube-nocookie.com` for privacy.
  * YouTube URL saved via `updatePlace(placeId, { youtube_url })` → stored in `places.youtube_url` column.

### 6. Inline Notes on Pins (Session 2)
* **Notes Section:**
  * Added inline text notes editor in `PlaceDetailsModal.jsx`.
  * Owners/collaborators can edit and save notes.
  * Notes saved via `updatePlace(placeId, { notes })` → stored in `places.notes` column.
  * Separate from the encrypted "Note" tab in SecureImageUpload (which creates encrypted text files as media).

### 7. Collaborative Pins (Session 2)
* **Collaborative Toggle in ShareModal:**
  * Checkbox to mark a pin as "Collaborative" — allows shared users to add memories/notes.
  * Saved via `updatePlace(placeId, { collaborative: true })`.
  * Backend enforces: non-owners can only upload/edit if `place.collaborative = true` AND they have view access.
  * `COLLAB_ALLOWED_COLUMNS` on PUT endpoint restricts non-owners to only editing `notes`.

### 8. Permission & Security Hardening (Session 2)
* **Column Whitelisting on PUT:**
  * `PUT /api/places/:id` only allows updates to: `name, formatted, category, color, visibility, notes, youtube_url, collaborative`.
  * Non-owners (collaborative editors) further restricted to: `notes`.
* **Collaborative Auth on Upload:**
  * `POST /api/media/upload` checks place ownership. If non-owner, verifies `place.collaborative = true` AND user has view access.
* **sharedWith in Upload:**
  * `SecureImageUpload.jsx` now passes `sharedWith` array through `uploadMedia()` to the backend.
  * Backend creates `media_access` entries for shared users.

### 9. PWA & Home Screen Icon Fix (Session 2)
* **Fixed all asset paths from `/TravelMaps.github.io/...` to `/...`:**
  * `index.html`: favicon, apple-touch-icon, manifest, service worker paths.
  * `public/manifest.json`: `start_url`, `scope`, icon `src` paths.
  * These paths were left over from when the site was served from GitHub Pages at `username.github.io/TravelMaps.github.io/`. On Vercel with custom domain, root-relative paths are correct.

### 10. Shabbat Categories (Session 2)
* **Removed from default category list** (`CATEGORY_COLORS` in `PlacesContext.jsx`).
* **All approval logic is preserved** in code for future use:
  * `submitRequest()`, `approvePlace()` functions still exist in PlacesContext.
  * `isShabbat` check in `addPlace()` still sets `approvalStatus`.
  * MapComponent still has the Shabbat-specific popup button.
* **PlaceDetailsModal was rewritten** to remove the approval gate that was blocking ALL normal pins from showing details. Now all pins show full details immediately (notes, YouTube, media, upload). The Shabbat approval flow can be re-enabled when those categories are added back.

---

## 💾 Database Schema Reference

### 1. `users` Table
```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

> ⚠️ **Note:** `database.js` uses column name `password`. Some older docs say `password_hash`. Check which one the production DB actually has.

### 2. `places` Table
```sql
CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    name TEXT NOT NULL,
    formatted TEXT,
    category TEXT,
    color TEXT,
    visibility TEXT DEFAULT 'private',
    notes TEXT,
    youtube_url TEXT,
    collaborative BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. `media` Table
```sql
CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
    tier INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    iv TEXT NOT NULL,
    mime_type TEXT,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. `media_access` Table
```sql
CREATE TABLE IF NOT EXISTS media_access (
    media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY(media_id, user_id)
);
```

### 5. `friends` Table
```sql
CREATE TABLE IF NOT EXISTS friends (
    id TEXT PRIMARY KEY,
    user_id_1 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    action_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_friendship UNIQUE (user_id_1, user_id_2)
);
```

### 6. `notifications` Table
```sql
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    target_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚠️ Known Issues, Gotchas & Things to Investigate

### CRITICAL — Must Fix

1. **Image Upload May Still Fail**
   - The "Save failed" error was partially fixed (now shows actual server error message instead of generic text).
   - `ensurePlaceOnBackend()` was added to auto-create places before upload.
   - **BUT:** The actual upload has NOT been fully end-to-end tested yet. If upload still fails, check:
     - Server logs on Render for the actual error message.
     - The `ENCRYPTION_KEY` env var on Render — if it's not exactly 32 bytes, `crypto.createCipheriv` will throw.
     - Supabase storage bucket permissions — the `media` bucket needs public insert access for the backend service role.
     - The `POST /api/places` might fail with a duplicate key error if the place was partially synced.

2. **Notes Disappearing After Save**
   - Inline notes (`place.notes`) save via `updatePlace()` → `PUT /api/places/:id`.
   - If the backend doesn't have the `notes` column yet (migration not run), the column would be silently ignored or error.
   - The `database.js` has `ALTER TABLE places ADD COLUMN IF NOT EXISTS notes TEXT;` — this runs on server startup. **Make sure the Render server has been restarted** after the latest deploy so the migration runs.
   - Also check: after saving notes, `fetchPlaces()` is NOT called. The local state update is optimistic. If Socket.IO fires a `places_update` event from another source, it could overwrite the local state with stale server data.

3. **Render Server Needs Redeployment**
   - The latest push added `GET /api/places/:id` endpoint and Socket.IO server setup.
   - If Render doesn't auto-deploy, the frontend will call endpoints that don't exist yet, causing silent failures.
   - **Verify:** Hit `https://travelmaps.onrender.com/api/places/test123` with auth header — should return 404 JSON, NOT a connection error or HTML.

### HIGH — Should Fix Soon

4. **`memories` vs `media` Naming Inconsistency**
   - The old codebase used `place.memories` array (local-only). The backend uses `place.media` (from the `media` table).
   - `normalizePlaces()` in PlacesContext maps `memories` → `media` and does `mime_type` → `type` conversion.
   - **Risk:** Some code paths might still reference `place.memories` instead of `place.media`. Grep for `memories` and verify all UI components use `place.media`.
   - `MapComponent.jsx` line 161 uses `(place.media || place.memories || []).length` as a fallback — this is OK but should be cleaned up.

5. **Stale Shabbat Code in MapComponent**
   - `MapComponent.jsx` still has `isShabbat` checks (lines 129, 151-158) that render a special button.
   - Since Shabbat categories are removed from the default list, this code is unreachable but clutters the codebase.
   - When re-enabling Shabbat categories, ensure the PlaceDetailsModal approval flow is also restored.

6. **SecureImageUpload Tier Validation UX**
   - Tier 1 (Private) requires selecting a friend via `sharedWith`. Tier 2 (Group) also requires friends.
   - If the user has NO friends, they cannot upload with Tier 1 or 2 — only Tier 3 (Public).
   - There's no user-friendly error explaining this.

7. **Socket.IO Creates Two Connections**
   - Both `PlacesContext` and `SocialContext` each create their own Socket.IO connection.
   - This means 2 WebSocket connections per logged-in user. Should consolidate into a shared `SocketContext`.

### MEDIUM — Quality & Polish

8. **`updateVisibility` and `updatePlace` Redundancy in ShareModal**
   - `ShareModal.handleShare()` calls `updateVisibility()` then `updatePlace({ collaborative })`.
   - This means 2 PUTs + 2 `ensurePlaceOnBackend()` checks (up to 4 requests).
   - Should consolidate into a single `updatePlace(placeId, { visibility, collaborative })` call.

9. **`addPlace` Error Handling is Silent**
   - `addPlace()` POSTs to the backend inside a `try/catch` that only `console.error`s.
   - If the POST fails, the user sees the place locally but it doesn't exist on the backend.
   - `ensurePlaceOnBackend()` handles this reactively, but proactively showing a "sync failed" indicator would be better.

10. **`password` vs `password_hash` Column Name**
    - `database.js` uses `password` (line 32). Some older docs say `password_hash`.
    - Check which one the actual production database uses to avoid auth query failures.

11. **Service Worker May Cache Stale Assets**
    - `sw.js` may cache old JS bundles. After deploying, users with old SW may see old site.
    - Consider adding version check or `skipWaiting()`.

12. **No Error Boundary in React**
    - If any component throws during render, the entire app goes blank (as seen with the `git` crash).
    - Adding a React Error Boundary around `<AppContent>` would show a fallback UI instead of a blank page.

---

## 📁 Key File Map

| File | Purpose |
|------|---------|
| `src/contexts/PlacesContext.jsx` | Global state for places, categories. Backend sync, Socket.IO, `ensurePlaceOnBackend()` |
| `src/contexts/SocialContext.jsx` | Friends, notifications, Socket.IO sync |
| `src/contexts/AuthContext.jsx` | Auth state, login, register, token management |
| `src/components/Modals/PlaceDetailsModal.jsx` | Pin details: notes, YouTube, media grid, upload form |
| `src/components/Media/SecureImageUpload.jsx` | Upload form: file/note/voice tabs, tier selector, compression |
| `src/components/Modals/ShareModal.jsx` | Visibility/sharing settings, collaborative toggle |
| `src/components/Map/MapComponent.jsx` | Leaflet map, markers, popups |
| `src/components/UI/Sidebar.jsx` | Saved places list, search, category filter |
| `src/App.jsx` | Root: AuthProvider → SocialProvider → PlacesProvider → AppContent |
| `server/server.js` | Express API, Socket.IO server, all endpoints, encryption |
| `server/database.js` | PostgreSQL pool, table creation, migrations |
| `index.html` | Entry HTML, PWA meta tags, manifest link |
| `public/manifest.json` | PWA manifest for "Add to Home Screen" |
| `vite.config.js` | Vite build config, `base: '/'` |

---

## 🐛 Session 2 Bug Fixes Log (Mistakes to Avoid)

These are bugs that were introduced and fixed during Session 2. **Do NOT repeat these mistakes.**

### 1. Stray `git` Token Crash
- **What happened:** Line 1 of `PlacesContext.jsx` started with `git/**` instead of `/**`. This compiled to `git;` in the production bundle, which threw `ReferenceError: git is not defined` and crashed the entire app (blank white page).
- **Root cause:** Likely a merge conflict artifact or accidental keystroke.
- **How it was found:** Used Chrome DevTools MCP → `list_console_messages` → saw `Uncaught ReferenceError: git is not defined`. Then downloaded the production JS bundle and searched around the crash column offset to find `git;const Hm=...`.
- **Lesson:** Always check line 1 of every edited file. Always run `npm run build` AND test the built output before pushing.

### 2. Approval Gate Blocking All Normal Pins
- **What happened:** `PlaceDetailsModal` had an `isApproved` check that defaulted to `false` for all non-Shabbat places (because `place.approvalStatus` was `undefined`). This hid the ENTIRE details view (notes, YouTube, media, upload) for every pin.
- **Root cause:** The approval flow was written assuming all places have an `approvalStatus` field. Normal places don't.
- **Lesson:** Always handle `undefined` fields. For gating features, default to "open" unless explicitly restricted.

### 3. `/TravelMaps.github.io/` Paths on Vercel
- **What happened:** All icon, manifest, and SW paths in `index.html` used `/TravelMaps.github.io/` prefix, which is the GitHub Pages repo path. On Vercel, these 404'd.
- **Root cause:** The paths were never updated when the site moved from GitHub Pages to Vercel.
- **Lesson:** When changing hosting providers, audit ALL hardcoded paths.

### 4. "Place not found" 404 on Share/Update
- **What happened:** Places created by clicking the map were saved locally but the `POST /api/places` to the backend sometimes failed silently. When the user tried to share or update the place, the backend returned 404.
- **Root cause:** `addPlace()` catches backend POST errors silently (`console.error`). No retry or indicator.
- **Fix:** Added `ensurePlaceOnBackend()` helper that auto-creates places before any backend operation.

### 5. Generic "Save failed" Error Message
- **What happened:** `SecureImageUpload` showed "Save failed. Please try again." for ALL upload errors, hiding the actual server error.
- **Fix:** Now shows `err.message` from the server response. Also added separate `status` state for "Compressing image..." messages.

---

## 🔄 Git Commit History (Session 2)

1. `bae1dac` — feat: real-time sync, YouTube integration, notes, upload fixes, permissions
2. `4840a05` — fix: remove stray 'git' token on line 1 of PlacesContext causing runtime crash
3. `55a088c` — fix: auto-sync places to backend, fix PWA manifest/icon paths for Vercel
