# Plan: File Dropzone App — Next.js + PocketBase

## Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Dropzone**: `react-dropzone` (most popular, ~10M weekly downloads, headless)
- **Backend**: PocketBase (Docker, named volume persistence)
- **Auth**: PocketBase email/password via direct REST fetch (no SDK — see note below)

---

## Project Structure

```
/
├── docker-compose.yml
├── .env
├── pb_setup/
│   └── setup.sh               # first-run admin provisioning via PocketBase REST
├── frontend/
│   ├── src/
│   │   ├── config/
│   │   │   └── uploads.ts     # FILE SIZE + other upload constants — tweak here
│   │   ├── app/
│   │   │   ├── page.tsx               # redirect → /dashboard or /login
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── dashboard/page.tsx     # dropzone + file list
│   │   ├── components/
│   │   │   ├── Dropzone.tsx
│   │   │   └── FileList.tsx
│   │   ├── lib/
│   │   │   └── pb.ts          # thin fetch wrapper for PocketBase REST calls
│   │   └── middleware.ts      # auth guard → redirect unauthed to /login
│   ├── .env.local             # NEXT_PUBLIC_PB_URL
│   └── ...
```

---

## Config File: `src/config/uploads.ts`

```ts
export const UPLOAD_CONFIG = {
  maxFileSizeMb: 100,
  maxFileSizeBytes: 100 * 1024 * 1024,
  acceptedFileTypes: undefined,   // undefined = all types allowed
} as const;
```

This is the single source of truth for size limits. Both the client-side dropzone
validation and the PocketBase collection `maxSize` rule in setup.sh pull from this
value (setup.sh reads it as an env var `MAX_FILE_SIZE_BYTES`).

---

## Why No PocketBase SDK?

PocketBase ships a JS/TS SDK (`pocketbase` npm package) that wraps its REST API.
It adds:
- Auto auth-token persistence (localStorage)
- Typed collection methods (`pb.collection('files').create()`)
- Realtime SSE subscriptions

**Decision: skip it.** PocketBase's REST API is simple and well-documented.
A thin `lib/pb.ts` with `fetch` wrappers keeps the dependency count low and makes
the auth/upload logic transparent. We'll store the token in an httpOnly cookie for
SSR safety. This also avoids the SDK's localStorage coupling which causes hydration
issues in Next.js App Router.

---

## Docker / PocketBase

- `docker-compose.yml`: PocketBase on port 8090, named volume `pb_data`
- `.env`: `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, `MAX_FILE_SIZE_BYTES`
- `pb_setup/setup.sh` — **run manually once** after first `docker compose up`:
  - Calls `POST /api/admins` bootstrap endpoint with env creds (idempotent)
  - Creates `files` collection with fields: `file`, `owner` (relation → users)
  - Sets `maxSize` on the file field to `MAX_FILE_SIZE_BYTES`
  - Skips gracefully if admin already exists
- Port 8090 exposed in compose (PocketBase admin UI accessible at `localhost:8090/_/`)

---

## Auth Flow

- `middleware.ts`: checks auth cookie; unauthed `/dashboard` → redirect `/login`
- `/login`: email + password → `POST /api/collections/users/auth-with-password` → set httpOnly cookie → redirect `/dashboard`
- `/signup`: open public registration → `POST /api/collections/users/records` → auto-login → redirect `/dashboard`
- Logout: clear cookie → redirect `/login` (button top-right, next to email)

---

## Dashboard

- User email + logout button both top-right
- Large centered dropzone, placeholder: "Drop files here or click to browse"
- Multiple files per drop supported
- 100MB limit enforced client-side (from `UPLOAD_CONFIG`) and server-side via PocketBase collection rule
- On drop: immediate `POST /api/collections/files/records` multipart upload per file
- Upload error: show generic inline error message ("Upload failed. Please try again.") — no backend error details exposed
- Below dropzone: list of *the authenticated user's own files only* (name, size, timestamp, delete button)
  - `GET /api/collections/files/records?filter=(owner='<userId>')` 
  - Delete: `DELETE /api/collections/files/records/<id>` with confirmation

---

## Build Order

- [x] Docker: `docker-compose.yml` + `.env` + `.env.example` + `.gitignore`
- [x] `pb_setup/Dockerfile` — PocketBase 0.22.0 on debian:bookworm-slim
- [x] `pb_setup/setup.sh` — admin bootstrap + files collection creation
- [x] Next.js scaffold — TypeScript, Tailwind, App Router, src dir
- [x] `src/config/uploads.ts` — size constants
- [x] `src/lib/pb.ts` — fetch wrapper + auth helpers
- [x] `src/middleware.ts` — auth guard
- [x] `frontend/.env.local` — NEXT_PUBLIC_PB_URL
- [ ] `react-dropzone` npm install — **BLOCKED: network timeout, run manually:** `cd frontend && npm install react-dropzone`
- [x] `src/app/page.tsx` — redirect root → /dashboard
- [x] `src/app/layout.tsx` — clean up scaffold boilerplate
- [x] `src/app/login/page.tsx`
- [x] `src/app/signup/page.tsx`
- [x] `src/app/dashboard/page.tsx`
- [x] `src/components/Dropzone.tsx`
- [x] `src/components/FileList.tsx`

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Dropzone lib | `react-dropzone` | Most popular, headless, composable |
| PocketBase SDK | Skipped — use fetch | Avoids localStorage/hydration issues in App Router |
| Auth storage | httpOnly cookie | SSR-safe, works in middleware |
| File size config | `src/config/uploads.ts` | Single source of truth, easy to tweak |
| PocketBase volume | named `pb_data` | Survives container restarts |
| Styling | Tailwind, clean defaults | Simple, no custom theme |
