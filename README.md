# TESBINN Digital Training Evaluation System

A mobile-first training evaluation application for TradeEthiopia School of Business and Innovation. Trainees submit structured feedback for an open course session, and administrators manage sessions, review analytics, and export the underlying records.

## Capabilities

- Four-page evaluation form with local draft recovery
- Course and open-session selection backed by MongoDB
- Required-rating and optional-field validation on both client and server
- Trainee and internal email notifications when SMTP is configured
- JWT-protected administrator console
- Dashboard filters, aggregate ratings, comments, and recent submissions
- Batch/session creation, editing, opening, closing, and safe deletion
- UTF-8 CSV export with complete session, trainee, rating, comment, and referral data
- Responsive English and Amharic trainee experience
- One-project Vercel deployment for the React client and Express API

## Architecture

```text
frontend/  React + Vite single-page client
backend/   Express API, MongoDB models, validation, email, and tests
api/       Vercel serverless adapter for the Express application
shared/    Questionnaire definition shared by the frontend and backend
```

The browser uses `/api/public/*` for trainee operations and `/api/admin/*` for authenticated administration. MongoDB stores batches and evaluations. The first successful database connection seeds the default sessions only when the batch collection is empty.

## Requirements

- Node.js 20.19 or newer
- npm
- MongoDB (local or Atlas)
- Optional SMTP account for notifications

## Local setup

1. Install dependencies:

   ```bash
   npm install
   npm --prefix frontend install
   ```

2. Copy `backend/.env.example` to `backend/.env` and set at least:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/tesbinn-evaluation
   JWT_SECRET=replace-with-a-long-random-secret
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=replace-with-a-strong-password
   CLIENT_URL=http://localhost:5173
   ```

3. To enable email, also configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, and `EMAIL_TO`. A submission remains successful if SMTP is unavailable; the failure is logged without asking the trainee to submit again.

4. Copy `frontend/.env.example` to `frontend/.env`.

5. Run the API and client in separate terminals:

   ```bash
   npm run dev:backend
   npm --prefix frontend run dev
   ```

   Alternatively, from inside `backend/`, run `npm run dev`. The backend package contains scripts only; dependencies remain centralized at the repository root.

The trainee form is at `http://localhost:5173/`; the admin login is at `http://localhost:5173/admin/login`.

## Verification

```bash
npm test
npm run build
```

`npm test` runs the backend validation/filter/CSV safety suite. `npm run build` creates the production frontend bundle in `frontend/dist`.

## Vercel deployment

The root `vercel.json` builds `frontend/` and routes `/api/*` to `api/[...all].js`. Configure these variables for Production and any Preview environments that need the API:

```env
VITE_API_URL=/api
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
CLIENT_URL=https://your-production-domain.example
CLIENT_URLS=https://an-additional-domain.example
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_USER=feedback@example.com
SMTP_PASS=your-email-password
EMAIL_FROM=feedback@example.com
EMAIL_TO=feedback@example.com
```

`VERCEL_URL` and `VERCEL_BRANCH_URL` are recognized automatically for same-deployment CORS. Add custom origins to `CLIENT_URL` or the comma-separated `CLIENT_URLS`; arbitrary Vercel origins are not trusted.

## API summary

Public:

- `GET /api/health`
- `GET /api/public/metadata`
- `POST /api/public/evaluations`

Administrator:

- `POST /api/admin/login`
- `GET /api/admin/catalog`
- `GET|POST /api/admin/batches`
- `PUT|DELETE /api/admin/batches/:id`
- `GET /api/admin/evaluations`
- `GET /api/admin/summary`
- `GET /api/admin/export`

Admin endpoints after login require `Authorization: Bearer <token>`. Evaluation, summary, and export endpoints accept `courseId`, `batchId`, `dateFrom`, and `dateTo` query filters; dates use `YYYY-MM-DD`.
