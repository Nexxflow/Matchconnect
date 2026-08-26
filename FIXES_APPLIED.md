# MatchConnect — Bug Audit & Fixes (2026-08-27)

Verified: backend boots cleanly (`node src/index.js`), all backend files pass
`node -c` syntax check, and `npm run build` on the frontend succeeds with
**zero errors** (1673 modules transformed) after these fixes.

## 🔴 Critical fixes (were breaking real functionality)

### 1. `/api/teams` route was never mounted
**File:** `backend/src/index.js`
The route file (`teamsRoutes.js` → `GET /teams/mine`) existed and worked, but
was never `require`'d and its `app.use(...)` line was commented out. The
frontend already calls `/teams/mine` in two places (`App.jsx`,
`CreateTournamentForm.jsx`) — every call was silently 404'ing.

**Real-world impact:** `myTeam` was always `null` client-side, so:
- Users with a registered team still got "You need a registered team"
- Tournament registration (`handleRegisterTournament`) never worked
- "Include my team" on tournament creation was blocked for everyone

**Fix:** added the `require` and uncommented the `app.use("/api/teams", teamsRoutes)` line.

### 2. Frontend case-sensitivity import bugs (same Mac→Linux trap, different files)
Three imports didn't match actual file names on disk. Works on Mac's
case-insensitive filesystem, **crashes the production build on Linux**:

| File | Imported as | Actual file was |
|---|---|---|
| `Profilescreen.jsx` | `./EditProfileModal` | `Editprofilemodal.jsx` |
| `Navbar.jsx` | `./Auth/EditProfileModal.jsx` | `Auth/Editprofilemodal.jsx` |
| `TournamentsTab.jsx` | `../CreateTournamentForm` | `Createtournamentform.jsx` |

**Fix:** renamed both files to match the imports (`EditProfileModal.jsx`,
`CreateTournamentForm.jsx`). Confirmed with a full `vite build` afterward.

**⚠️ Action needed on your machine:** these were plain `mv` in my working
copy. On your real repo, use `git mv` (same reasoning as Step 2 for the
backend files):
```bash
git mv frontend/src/app/components/Auth/Editprofilemodal.jsx frontend/src/app/components/Auth/EditProfileModal.jsx
git mv frontend/src/app/components/Createtournamentform.jsx frontend/src/app/components/CreateTournamentForm.jsx
```

### 3. `api.js` hardcoded `localhost:8000`
**File:** `frontend/src/app/api.js`
```js
// before
export const API_BASE = "http://localhost:8000/api";
// after
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
```
Falls back to localhost so `npm run dev` still works without a `.env`.

## 🟠 Security / config

### 4. Weak `JWT_SECRET`
`backend/.env` had a placeholder-looking secret. Replaced with a fresh
96-char random hex value:
```
418f30196bb8100b58f522b740358f4a59df19d49bed391d6291e1cace440fa645b08fb147c3d3fd64c1c6a80139900e
```
**Rotate this again before going live** — treat any secret that passed
through chat/screenshots as burned. Generate your own with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 5. Duplicate `FRONTEND_URL` line in `backend/.env`
Two identical `FRONTEND_URL=http://localhost:5173` lines — harmless (first
one wins) but removed the duplicate for cleanliness.

### 6. Created `frontend/.env` + `frontend/.env.example`
No frontend `.env` existed at all, so `VITE_FIREBASE_*` vars were always
`undefined` and Firebase messaging silently failed to init properly. Added:
- `frontend/.env` — local dev, `VITE_API_URL` set, Firebase keys blank
- `frontend/.env.example` — template for teammates / production
Your root `.gitignore` already covers `*/.env`, so these won't get committed
(only `.env.example` should be committed).
**You must fill in the `VITE_FIREBASE_*` values** from Firebase Console →
Project Settings → General → Your apps (I don't have these).

## 🟡 Cleanup (not currently breaking anything)

### 7. Removed `backend/src/firebase.js`
Dead file — frontend-style Vite/ESM Firebase client code sitting in the
backend folder, using `import.meta.env` (which doesn't even exist in
Node/CommonJS). Nothing required it. The real backend Firebase config is
`backend/src/config/firebase.js` (firebase-admin, correct).

### 8. `matchController.js` has dead `acceptChallenge`/`cancelChallenge`
These reference a `matches` table shape (`challenged_user_id`, `created_by`)
that doesn't match your actual schema, and aren't wired to any route. Not
currently causing errors since they're unreachable — flagging for whenever
you clean up the legacy targeted-challenge code (ties into the known
`challengesController.js` model-mismatch issue already in your backlog).

## Not touched (already known / scoped for later)
- Grounds `latitude`/`longitude` still not saved on create — Step 6, post-launch
- `challengesController.js` targeted vs. broadcast model mismatch — separate task

## Files changed
```
backend/src/index.js                                   (teams route wired)
backend/.env                                            (JWT_SECRET, dedup)
backend/src/firebase.js                                 (deleted)
frontend/src/app/api.js                                 (env-based API_BASE)
frontend/.env                                            (new)
frontend/.env.example                                    (new)
frontend/src/app/components/Auth/EditProfileModal.jsx    (renamed)
frontend/src/app/components/CreateTournamentForm.jsx     (renamed)
```
