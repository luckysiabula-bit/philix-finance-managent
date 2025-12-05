# PHILIX Finance Frontend (React + Vite)

This is the React frontend for the PHILIX Finance app.

## Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+ (or pnpm/yarn if you prefer)
- A running backend API (default assumed: http://localhost:3000/api)

## Quick Start
```bash
# 1) Install dependencies
npm install

# 2) Copy env template and adjust if needed
cp .env.example .env
# Update VITE_API_URL in .env to point to your backend

# 3) Start the dev server (Vite defaults to http://localhost:5173)
npm run dev
```

## Environment Variables
Vite exposes variables prefixed with `VITE_` to the client. The app uses:

- `VITE_API_URL` (required) – Base URL for the backend API.
  - Example: `http://localhost:3000/api`

See `.env.example` for a template. After changing env values, restart the dev server.

## Configuration Notes
- The app reads `VITE_API_URL` in `src/App.jsx` and trims trailing slashes to avoid `//` in requests.
- Requests include a `Bearer` token from `localStorage` when available.

## Expected Backend Endpoints
- `POST /auth/login` – returns `{ token, role }` or `{ token, user: { role } }` (adjust frontend if different)
- `GET /reports/dashboard` – admin dashboard data
- `GET /admin/applications` – admin applications list
- `GET /borrower/dashboard` – borrower dashboard data

If your backend uses different paths, set `VITE_API_URL` accordingly or update API routes in `src/App.jsx`.

## Build & Preview
```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

## Troubleshooting
- CORS errors: Ensure the backend allows origin `http://localhost:5173` and headers `Content-Type, Authorization`.
- 404s on API calls: Verify `VITE_API_URL` and backend route prefixes (e.g., `/api`).
- Auth issues: Confirm login response includes a role and that protected routes accept the `Authorization: Bearer <token>` header.

## License
MIT
# Restored to normal desktop version - Sat Dec  6 12:30:47 AM CAT 2025
