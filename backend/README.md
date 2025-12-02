# Backend Folder

Place your backend API here. Suggested structure:

- package.json
- server.js (or app.js)
- routes/
- middleware/
- config.js
- .env.example

Quick steps once files are in place:
1) npm install
2) Copy .env.example to .env and fill values
3) Start the server: npm run dev (or npm start)
4) Ensure it listens on PORT=3000 and mounts routes under /api
5) Frontend should use VITE_API_URL=http://localhost:3000/api
