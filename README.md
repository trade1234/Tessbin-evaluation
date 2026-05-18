
# Digital Training Evaluation System

Mobile-first evaluation system for Trade Ethiopia training sessions.

---

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **Auth:** JWT (admin dashboard)

## Project Structure

- `frontend/` — React client for trainees and admins
- `backend/` — Express API, MongoDB models, CSV export

## Getting Started

### 1. Backend Setup

1. Copy `backend/.env.example` to `backend/.env` and fill in your values:
	```env
	PORT=5000
	MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<dbname>?retryWrites=true&w=majority
	JWT_SECRET=change-this-secret
	ADMIN_USERNAME=admin
	ADMIN_PASSWORD=change-this-password
	CLIENT_URL=http://localhost:5173
	```
2. Install dependencies and start the server:
	```bash
	cd backend
	npm install
	npm run dev
	```

### 2. Frontend Setup

1. Copy `frontend/.env.example` to `frontend/.env` and set the API URL:
	```env
	VITE_API_URL=http://localhost:5000/api
	```
2. Install dependencies and start the dev server:
	```bash
	cd frontend
	npm install
	npm run dev
	```

## Deployment

### Deploying to Vercel (Frontend)

1. Push the `frontend/` folder to your GitHub repository.
2. On [vercel.com](https://vercel.com), import your repo and set the following build settings:
	- **Framework Preset:** Vite
	- **Build Command:** `npm run build`
	- **Output Directory:** `dist`
	- **Environment Variable:** `VITE_API_URL` (point to your backend API URL)
3. Deploy and update your backend API URL as needed.

### Deploying Backend

Deploy your backend (e.g., on Render, Railway, or your own server). Make sure to update the frontend’s `VITE_API_URL` to the deployed backend URL.

## Features

- Anonymous evaluation form
- Course and batch selection
- Admin login
- Filterable submissions list
- CSV export
- Summary metrics and rating bars

## Configuration & Notes

- Course and batch catalog: `backend/src/data/catalog.js`
- Admin credentials: set via environment variables
- The logo is implemented as a React SVG component (`frontend/src/components/TesbinnLogo.jsx`).
- Optional features (e.g., multilingual support, notifications) are not yet implemented.

## Scripts

### Backend
- `npm run dev` — Start backend in development mode
- `npm start` — Start backend in production

### Frontend
- `npm run dev` — Start frontend in development mode
- `npm run build` — Build frontend for production
- `npm run preview` — Preview production build locally

## License

MIT — see `LICENSE` file (add one if missing).

---
For questions or support, contact the project maintainer.
