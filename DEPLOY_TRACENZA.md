# Tracenza deployment (Vercel frontend + Render backend + PostgreSQL)

Nothing has been deployed or pushed. These steps are for you to run.

## Render (backend + database)
1. Push the `tracenza-transformation` branch to your GitHub repo (your decision).
2. Render dashboard > New > Blueprint > select the repo. It reads `render.yaml` (service `tracenza-api`, Docker, `./backend`; PostgreSQL `tracenza-db`).
3. When prompted set: `FRONTEND_ORIGINS` = your Vercel URL (add after step 2 of Vercel; you can edit it later and redeploy). Leave `BOOTSTRAP_ADMIN_*` empty in `demo` mode.
4. Wait for the deploy, then check `https://<service>.onrender.com/health` and `/docs`. The service URL may carry a suffix if the name is taken; use the exact URL Render shows.
5. Seed demo data from your machine against the Render database (Render free has no shell). Copy the database's **External** connection string:
   `cd backend && DATABASE_URL="<external url>" python ../scripts/generate_demo_data.py && DATABASE_URL="<external url>" python ../scripts/seed_tracenza_demo.py`
   (requires `pip install -r requirements.txt`; the scripts add data, they do not reset unless you pass `--reset`.)

## Vercel (frontend)
1. New Project > import the repo. Root Directory: `frontend`. Framework: Vite. Install: `npm ci`. Build: `npm run build`. Output: `dist`.
2. Environment variable (Production): `VITE_API_URL` = `https://<your-render-service>.onrender.com/api`.
3. Deploy, then put the Vercel URL into Render's `FRONTEND_ORIGINS` and redeploy the API.
4. SPA routing is handled by `frontend/vercel.json`.

## Environment variables
Backend: `ENVIRONMENT` (demo|production), `DATABASE_URL` (from Render DB), `SECRET_KEY` (generated), `FRONTEND_ORIGINS`, `USE_MINIO=false`, optional `SMTP_*`, `LOCAL_SCHEDULER_SECONDS` (default 300; 0 disables the in-process deadline sweep).
Frontend: `VITE_API_URL`.

## Known blockers
- Render free PostgreSQL expires after a limited period and free web services sleep (first request can take about a minute). Use a paid DB for anything that must persist.
- Uploaded files use local disk on Render (ephemeral, lost on redeploy) because MinIO is not provisioned. Seeded documents will need re-seeding after a redeploy; use an S3/MinIO service for persistence.
- `demo` mode exposes public default passwords listed on the login page; do not use real data.
- The previous `validex-appar-reconx-api.onrender.com` URL is no longer referenced.
