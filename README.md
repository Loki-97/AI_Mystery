# AI Mystery Room

A full-stack detective game built to the requirements in `spec.md`. The React client is in `client/`; the Express/MongoDB API is in `server/`.

## Run locally

1. Install Node.js 20+ and MongoDB (local or Atlas).
2. Copy `.env.example` to `server/.env` and set `MONGODB_URI`, a long `JWT_SECRET`, and `GEMINI_API_KEY`.
3. From the project root, run `npm install`, then `npm run dev`.
4. Open `http://localhost:5173`.

The dashboard includes a sample fictional case so the investigation interface can be explored without generating a new case. New case generation requires a Gemini API key. Passwords and the answer key remain server-side. For deployment, set environment variables on the server and build the client with `npm run build`.

## Architecture

- `client/`: React + Vite SPA.
- `server/`: Express REST API, Mongoose models, JWT auth, Gemini generation and validation.
- API prefix: `/api/v1`.
- Public case responses intentionally omit culprit and solution fields.

See `spec.md` for the product source of truth.
