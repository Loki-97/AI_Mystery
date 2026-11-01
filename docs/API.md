# API reference

Base path: `/api/v1`. Responses use `{ success, message?, data?, error? }`. Browser sessions use the HTTP-only `casefile_session` cookie. All routes except registration, login, logout, and `/health` require an authenticated session.

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create an account and session. Body: `name`, `email`, `password`. |
| POST | `/auth/login` | Create a session. Body: `email`, `password`. |
| POST | `/auth/logout` | Clear the session cookie. |
| GET | `/auth/me` | Return the current user. |

## Mysteries

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/mysteries` | Generate a case. Body: `scenario`, optional `title`, `difficulty` (`Easy`, `Medium`, `Hard`). |
| GET | `/mysteries` | List the signed-in user’s cases. |
| GET | `/mysteries/:id` | Return public case data. Never includes the solution record. |
| GET | `/mysteries/:id/status` | Return generation and investigation status. |
| DELETE | `/mysteries/:id` | Delete an owned case and related records. |
| GET | `/mysteries/:id/suspects` | List public suspect profiles. |
| GET | `/mysteries/:id/suspects/:suspectId` | Read one profile. |
| GET | `/mysteries/:id/evidence` | List case exhibits. |
| GET | `/mysteries/:id/evidence/:evidenceId` | Read one exhibit. |
| GET, POST | `/mysteries/:id/notes` | Read or save private investigation notes. |
| PUT, DELETE | `/mysteries/:id/notes/:noteId` | Update or delete a note. |
| POST | `/mysteries/:id/accusations` | Submit one suspect ID and receive the evaluated final report. |
| GET | `/mysteries/:id/result` | Read the final report after an accusation. |

`POST /mysteries/:id/accusations` accepts `{ "suspectId": "...", "explanation": "..." }`. The server verifies ownership, case membership, and the one-submission rule before comparing the suspect ID to the confidential solution. The solution endpoint returns `403` until an accusation exists.

## Configuration

Set `MONGODB_URI`, `JWT_SECRET` (at least 32 characters), and `GEMINI_API_KEY` in `server/.env`. `GEMINI_MODEL`, `JWT_EXPIRES_IN`, `PORT`, `CLIENT_URL`, and `NODE_ENV` are configurable. A missing Gemini key disables case generation; the dashboard’s sample case remains available for UI exploration.
