# Click-2-Clean (React + FastAPI + MySQL, JavaScript)

Converted from the Lovable project (TanStack Start + TypeScript) to:

- **frontend/**: React 19 + Vite, plain JavaScript (`.jsx`), Tailwind 4, GSAP, Three.js
- **backend/**: FastAPI + SQLAlchemy + MySQL

The landing page is the same design as in Lovable. Lovable's version had no backend
(the Report Waste and Admin Login buttons pointed nowhere), so this package adds a
small working one: a report form, an admin login and an admin list.

## What was changed

| Lovable | Now |
|---|---|
| TanStack Start, SSR, Cloudflare/Nitro build | Vite SPA + React Router |
| `.ts` / `.tsx` | `.js` / `.jsx` (types removed) |
| 45 unused shadcn components | removed (only `accordion` is used) |
| `*.asset.json` pointers to Lovable servers | plain files in `frontend/public/images/` |
| Report Waste / Admin Login = `#` | `/report` and `/admin` pages talking to FastAPI |
| Lovable error reporting, tests, build scripts | removed |

## 1. Photos

The ZIP from Lovable did not contain your photos. Copy them into
`frontend/public/images/` using the names listed in `frontend/public/images/README.txt`.

## 2. Database (MySQL 8)

```sql
CREATE DATABASE click2clean CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'c2c_user'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON click2clean.* TO 'c2c_user'@'localhost';
```

Tables are created automatically when the API starts (`backend/schema.sql` shows them).

## Reports API performance

`GET /api/reports?page=1&limit=20` returns `{ items, total, page, total_pages, summary }`.
The list contains lightweight report fields and summary counts; use
`GET /api/reports/{report_id}` to load the report image when opening a detail or
update view. Existing array consumers can request `legacy=true` (still paginated).
Report and notification GET responses use a short-lived cache; report writes
invalidate it immediately. New report images are stored as WebP at up to 480x480.

---

## ⚙️ How to Run Locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Windows: copy .env.example .env
```

Edit `.env`: set `DATABASE_URL`, a long random `JWT_SECRET`, and `ADMIN_PASSWORD`
(10+ characters). Then:

```bash
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs. Needs Python 3.10 or newer.

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. In development, Vite forwards `/api` and `/uploads` to
FastAPI on port 8000, so no extra CORS setup is needed. Needs Node 20.19+ (or 22).

For production, build with `VITE_API_URL=https://your-api-domain npm run build`, serve
`frontend/dist` as static files, and add that site's address to `CORS_ORIGINS`.
Because this is a single-page app, the host must send unknown paths (like `/report`)
to `index.html`.

## API

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/reports` | public | multipart: `photo`, `category` (wet/dry/hazardous/other), `note`, `latitude`, `longitude` |
| GET | `/api/reports/track/{code}` | public | status of one report by its tracking code |
| POST | `/api/auth/login` | public | `{username, password}` gives a JWT |
| GET | `/api/admin/reports` | admin | list, optional `status`, `category`, `limit`, `offset` |
| GET | `/api/admin/stats` | admin | counts by status and category |
| PATCH | `/api/admin/reports/{id}` | admin | `{status}`: reported / in_progress / resolved |

## Things to know

- **No AI sorting exists yet.** The landing page text says the AI identifies the waste
  type, but neither the Lovable project nor this one contains a classifier: the user
  picks the category on the report form. Either add one (for example a `/api/classify`
  endpoint) or reword the copy in `frontend/src/content/landing.js` and
  `frontend/src/components/landing/Phone.jsx`.
- Report photos are saved on the backend's disk (`backend/uploads/`). Back that folder up.
- Admin accounts: only the one from `.env` is created. Add more by inserting rows into
  `admin_users` with a hash from `app.security.hash_password`.
- The login attempt limiter is in memory and per process.
