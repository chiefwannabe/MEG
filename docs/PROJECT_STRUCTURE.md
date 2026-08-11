# Project Structure & Reorganization Report (Pass 2)

## 1. Overview & Architecture Philosophy
The MEG project has undergone a second comprehensive architectural refactor to achieve maximum modularity, minimal root footprint, and alignment with modern web application practices. Features are now organized primarily by **responsibility** (pages, UI, components, core API/services) rather than arbitrary file types.

---

## 2. Confirmation of `.temp` Folder Status
- **`.temp/` folder status**: **100% UNTOUCHED and UNCHANGED**
- No files inside `.temp/` were modified, moved, renamed, or deleted during either refactoring pass.

---

## 3. Reasons for Directories & Files Remaining at Project Root

The following items are intentionally preserved at the workspace root:

| Item | Category | Reason for Root Location |
|---|---|---|
| `package.json` | Manifest | Standard Node.js / npm project metadata and entrypoint scripts. |
| `package-lock.json` | Lockfile | Dependency lockfile required for consistent npm installs. |
| `index.html` | App Entrypoint | Primary landing page / homepage of the study hub. |
| `.gitignore` | Git Config | Git ignore rules for repository root. |
| `.firebaserc` | Firebase Config | Project alias configuration required at root by Firebase CLI. |
| `.env.local` | Environment | Environment variables and secret tokens for local development. |
| `.temp/` | Temporary State | System temporary directory (explicitly kept untouched). |
| `.agents/`, `.claude/`, `.crush/` | IDE / AI Metadata | Workspace AI agent configuration and skills. |
| `.vercel/` | Deployment | Local Vercel deployment cache metadata. |
| `skills-lock.json` | Lockfile | Agent skills dependency lockfile. |
| `api/` | Serverless API | Vercel zero-config serverless function endpoint (`api/imagekit-auth.js`). |
| `assets/` | Storage Assets | Static reference file repository (`assets/Html_files/`). |
| `config/` | Project Config | Centralized build and framework config files (`firebase.json`, `vercel.json`, etc.). |
| `docs/` | Documentation | Central documentation workspace (architecture, audits, logs). |
| `scripts/` | Utility Scripts | Standalone Node.js build and generation tools. |
| `server/` | Dev Server | Development HTTP server script. |
| `src/` | Application Source | All feature pages, components, UI, assets, and database models. |

---

## 4. Directory & File Mapping (`Old Path → New Path`)

### Source Application (`src/`)
#### Assets (`src/assets/`)
- `assets/images/default-avatar.svg` → `src/assets/images/default-avatar.svg`

#### Feature Pages (`src/pages/`)
- `auth/auth.css` → `src/pages/auth/auth.css`
- `auth/auth.js` → `src/pages/auth/auth.js`
- `admin/admin.css` → `src/pages/admin/admin.css`
- `admin/admin.html` → `src/pages/admin/admin.html`
- `admin/admin.js` → `src/pages/admin/admin.js`
- `dashboard/index.css` → `src/pages/dashboard/index.css`
- `dashboard/index.html` → `src/pages/dashboard/index.html`
- `dashboard/index.js` → `src/pages/dashboard/index.js`
- `offline/*` → `src/pages/offline/*` (Game launcher + 16 standalone game HTML files + `games.json` + `generate-games.js`)
- `tip/*` → `src/pages/tip/*`
- `public/downloads.html` → `src/pages/public/downloads.html`
- `public/notes-app.html` → `src/pages/public/notes-app.html`
- `public/uploads.html` → `src/pages/public/uploads.html`

#### UI / Custom Cursor (`src/ui/cursor/`)
- `cursor.js` → `src/ui/cursor/cursor.js`
- `cursor.css` → `src/ui/cursor/cursor.css`
- `cursor-panel.js` → `src/ui/cursor/cursor-panel.js`
- `cursor-panel.css` → `src/ui/cursor/cursor-panel.css`

#### Core Services (`src/`)
- `src/firebase.js` (Firebase app initialization)
- `src/firestore.js` (Firestore database client API)

---

### Assets & Document Store (`assets/` & `docs/`)
- `Html_files/` → `assets/Html_files/`
- `memory/*` → `docs/memory/*`
- `HEARTBEAT.md` → `docs/architecture/HEARTBEAT.md`
- `FIREBASE_AUDIT_REPORT.md` → `docs/audits/FIREBASE_AUDIT_REPORT.md`
- `PROJECT_STRUCTURE.md` → `docs/PROJECT_STRUCTURE.md`
- `AGENTS.md` → `docs/AGENTS.md`
- `IDENTITY.md` → `docs/IDENTITY.md`
- `MEMORY.md` → `docs/MEMORY.md`
- `SOUL.md` → `docs/SOUL.md`
- `TOOLS.md` → `docs/TOOLS.md`
- `USER.md` → `docs/USER.md`

---

## 5. Summary of Updated Imports & Configuration Paths

| Configuration / Script | Old Path | New Path / Updated Code |
|---|---|---|
| `package.json` `"build"` | `offline/generate-games.js` | `src/pages/offline/generate-games.js` |
| `package.json` `"generate"` | `offline/generate-games.js` | `src/pages/offline/generate-games.js` |
| `config/vercel.json` rewrites | `/offline/` | `/src/pages/offline/` |
| `server/server.js` rewrites | `/offline/` | `/src/pages/offline/` |
| `scripts/generate-uploads.js` | `../Html_files` | `../assets/Html_files` |
| `src/pages/auth/auth.js` | `../src/firebase.js`, `../src/firestore.js` | `../../firebase.js`, `../../firestore.js` |
| `src/pages/admin/admin.js` | `../src/firebase.js`, `../src/firestore.js` | `../../firebase.js`, `../../firestore.js` |
| `src/pages/dashboard/index.js` | `../src/firebase.js`, `../src/firestore.js` | `../../firebase.js`, `../../firestore.js` |
| `src/pages/public/notes-app.html` | `../src/firebase.js`, `../src/firestore.js` | `../../firebase.js`, `../../firestore.js` |
| `src/pages/public/uploads.html` | `../Html_files/` | `../../../assets/Html_files/` |
| Default avatar images | `/assets/images/default-avatar.svg` | `/src/assets/images/default-avatar.svg` |

---

## 6. Verification Results
- **Build Verification**: `npm run build` completed cleanly (generated both `games.json` and `files.json`).
- **Dev Server Verification**: `node server/server.js` launched cleanly listening on `http://localhost:8000`.
- **Git Tracking**: 100% of file moves were performed using `git mv` to preserve git commit history.

---

## 7. Clean Final Workspace Tree

```
/workspaces/MEG/
├── .env.local
├── .firebaserc
├── .gitignore
├── .temp/                               (UNCHANGED)
├── api/
│   └── imagekit-auth.js
├── assets/
│   └── Html_files/
│       ├── contacts-manager-debug.apk
│       └── files.json
├── config/
│   ├── firebase.json
│   ├── firestore.indexes.json
│   ├── firestore.rules
│   └── vercel.json
├── docs/
│   ├── architecture/
│   │   └── HEARTBEAT.md
│   ├── audits/
│   │   └── FIREBASE_AUDIT_REPORT.md
│   ├── memory/
│   │   ├── 2026-07-05.md ... 2026-07-17.md
│   │   └── index.html
│   ├── AGENTS.md
│   ├── IDENTITY.md
│   ├── MEMORY.md
│   ├── PROJECT_STRUCTURE.md
│   ├── SOUL.md
│   ├── TOOLS.md
│   └── USER.md
├── scripts/
│   ├── generate-uploads.js
│   └── theme-toggle.js
├── server/
│   └── server.js
├── src/
│   ├── assets/
│   │   └── images/
│   │       └── default-avatar.svg
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── admin.css
│   │   │   ├── admin.html
│   │   │   └── admin.js
│   │   ├── auth/
│   │   │   ├── auth.css
│   │   │   └── auth.js
│   │   ├── dashboard/
│   │   │   ├── index.css
│   │   │   ├── index.html
│   │   │   └── index.js
│   │   ├── offline/
│   │   │   ├── games.json
│   │   │   ├── generate-games.js
│   │   │   ├── index.html
│   │   │   └── (16 game html files)
│   │   ├── public/
│   │   │   ├── downloads.html
│   │   │   ├── notes-app.html
│   │   │   └── uploads.html
│   │   └── tip/
│   │       ├── index.html
│   │       ├── script.js
│   │       └── style.css
│   ├── ui/
│   │   └── cursor/
│   │       ├── cursor.css
│   │       ├── cursor.js
│   │       ├── cursor-panel.css
│   │       └── cursor-panel.js
│   ├── firebase.js
│   └── firestore.js
├── index.html
├── package.json
└── package-lock.json
```
