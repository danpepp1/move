# Move

A personal apartment-setup companion for the Dallas move. Three parts:

- **Rooms** — add each room, list what you need to buy, mark `need → bought`, and
  track estimated vs. actual cost. Running totals give you the "budget brain" view
  (spent, still-to-buy, est. total) without touching real bank data.
- **Logistics** — set the move date (drives a countdown), track key dates (lease
  start, U-Haul pickup, utilities), and work a packing timeline.
- **Setup** — the handyman layer: tasks like mount the TV / assemble the bed, each
  with the tools it needs. The app rolls all outstanding tools into one 🧰 list.

Single-user, installable as a PWA on your iPhone (Safari → Share → Add to Home
Screen). Same house style as `buckets`: React + Vite frontend, Node/Express +
SQLite backend, one host serves both.

## Run locally

```bash
# backend  →  http://localhost:4110
cd backend && npm install && npm run dev

# frontend →  http://localhost:5191   (in a second terminal)
cd frontend && npm install && npm run dev
```

Open http://localhost:5191. First run seeds a starter moving checklist (rooms with
big-ticket items, a packing timeline, and setup tasks) — all editable/deletable.

The SQLite file lives at `backend/move.db` (git-ignored). No secrets needed for
local dev.

## Deploy (Fly.io, single host — same as buckets)

The `Dockerfile` builds the frontend and has the backend serve it plus the API.

```bash
# from the repo root, one time:
fly launch --no-deploy          # or: fly apps create dpeppsmove
fly volumes create move_data --region dfw --size 1

# lock the API behind a shared token (recommended once it's public):
fly secrets set APP_TOKEN=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")

fly deploy --remote-only
```

If you set `APP_TOKEN`, open the site once and paste the token into the unlock
screen — it's stored in `localStorage`, so you only do it per device. Update
`app`/`PUBLIC_ORIGIN` in `fly.toml` if the name `dpeppsmove` is taken.
