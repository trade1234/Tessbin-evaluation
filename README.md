# Digital Training Evaluation System

Mobile-first evaluation system for Trade Ethiopia training sessions.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB Atlas
- Auth: JWT admin login

## Project Structure

- `frontend/`: React client for trainees and admins
- `backend/`: Express API, MongoDB models, CSV export
- `api/`: Vercel serverless entrypoint for the backend
- `vercel.json`: Vercel routing for frontend and backend in one deployment

## Local Setup

### Backend

1. Create `backend/.env` from `backend/.env.example`.
2. Set:

```env
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=change-this-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
CLIENT_URL=http://localhost:5173
```

3. Start the backend:

```bash
cd backend
npm install
npm run dev
```

### Frontend

1. Create `frontend/.env` from `frontend/.env.example`.
2. Set:

```env
VITE_API_URL=http://localhost:5000/api
```

3. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Vercel Deployment

This repo is configured for one Vercel project:

- `frontend/` builds the React app
- `api/index.js` runs the Express backend as a serverless function
- `vercel.json` sends `/api/*` to the backend and all other routes to the React app

### Required Vercel Environment Variables

```env
VITE_API_URL=/api
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password
CLIENT_URL=https://your-vercel-domain.vercel.app
```

### Important Notes

- `VITE_API_URL` must be `/api` in Vercel, not `http://localhost:5000/api`
- redeploy after changing Vercel environment variables
- the backend will fail in Vercel if `MONGODB_URI` or `JWT_SECRET` is missing
- if you use preview deployments, you may want to relax or update `CLIENT_URL`

## Features

- Anonymous evaluation form
- Course and session selection
- Admin login
- Batch/session management
- CSV export
- Summary metrics and rating bars

## Scripts

### Backend

- `npm run dev`: start backend in development mode
- `npm start`: start backend in production mode

### Frontend

- `npm run dev`: start frontend in development mode
- `npm run build`: build frontend for production
- `npm run preview`: preview frontend production build locally
