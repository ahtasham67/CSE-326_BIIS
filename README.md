# BIIS — BUET Institutional Information System

Hall Seat Management System for university students and provosts. Built with **React + Express + PostgreSQL**.

---

## Features

### Student Portal
- 🪑 View seat availability — filter by hall, floor, or room number
- 📝 Apply for seat allocation with reason & supporting documents
- 🔄 Request seat change (for current residents)
- 📋 Track application status and provost feedback

### Provost Dashboard
- 📨 View all applications with **AI-generated summaries** and recommendation badges (Strong / Moderate / Weak)
- ✅ Approve or ❌ Deny applications with feedback (auto seat assignment on approval)
- 🔄 Manage seat change requests
- 🏠 View all hall residents — room, dining days, absence records

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React |
| Backend | Node.js + Express |
| Database | PostgreSQL (Neon) |
| Auth | Session-based (express-session + connect-pg-simple) |
| AI | Google Gemini API + rule-based fallback |
| File Uploads | Multer |

---

## Prerequisites

- **Node.js** v18+ and **npm**
- **PostgreSQL** database (local or hosted, e.g. [Neon](https://neon.tech))
- **Git**

### Install Node.js on Linux (Ubuntu/Debian)

```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v
npm -v
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ahtasham67/CSE-326_BIIS.git
cd CSE-326_BIIS
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set your values:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
SESSION_SECRET=your-random-secret-key
GEMINI_API_KEY=           # Optional — leave empty for rule-based AI fallback
PORT=5001
NODE_ENV=development
```

### 3. Run the setup script

```bash
chmod +x setup.sh start.sh
./setup.sh
```

This will:
- Install all dependencies (root, server, client)
- Run database migrations and seed sample data

### 4. Start the application

```bash
./start.sh
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5001 |

### 5. Login with demo accounts

| Role | Email | Password |
|------|-------|----------|
| Provost | provost1@biis.edu | provost123 |
| Provost | provost2@biis.edu | provost123 |
| Student | rahim@student.edu | student123 |
| Student | fatima@student.edu | student123 |
| Student | nusrat@student.edu | student123 |

---

## Manual Setup (without shell scripts)

```bash
# Install dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Run database migrations & seed data
cd server && node src/migrate.js && cd ..

# Start both servers (backend + frontend)
npm run dev
```

---

## Project Structure

```
CSE-326_BIIS/
├── server/                     # Express backend
│   ├── src/
│   │   ├── index.js            # Server entry point (serves React in production)
│   │   ├── db.js               # PostgreSQL connection pool
│   │   ├── migrate.js          # Schema creation + seed data
│   │   ├── middleware/
│   │   │   └── auth.js         # Session-based auth middleware
│   │   ├── routes/
│   │   │   ├── auth.js         # Login, register, logout
│   │   │   ├── seats.js        # Seat availability & filters
│   │   │   ├── applications.js # Seat allocation requests
│   │   │   ├── seatChanges.js  # Seat change requests
│   │   │   └── residents.js    # Hall resident management
│   │   └── services/
│   │       └── ai.js           # AI recommendation engine
│   ├── uploads/                # Uploaded documents
│   └── .env                    # Environment config (not committed)
├── client/                     # Vite + React frontend
│   ├── src/
│   │   ├── App.jsx             # Router with protected routes
│   │   ├── index.css           # BUET institutional theme
│   │   ├── api.js              # Axios API client
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state management
│   │   ├── components/         # Layout, Sidebar
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── student/        # Student pages
│   │       └── provost/        # Provost pages
│   └── vite.config.js
├── setup.sh                    # First-time setup script
├── start.sh                    # Start dev servers
├── package.json                # Root scripts
└── README.md
```

---

## Deployment on Render

1. Push your code to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repo
4. Configure:
   - **Build Command:** `npm run render-build`
   - **Start Command:** `npm start`
5. Set environment variables:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `SESSION_SECRET` — a strong random string
   - `NODE_ENV` = `production`
   - `GEMINI_API_KEY` — (optional) for AI-powered summaries

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | — |
| POST | `/api/auth/login` | Login | — |
| GET | `/api/auth/me` | Get current user | ✅ |
| POST | `/api/auth/logout` | Logout | ✅ |
| GET | `/api/seats` | List rooms with availability | ✅ |
| GET | `/api/seats/stats` | Availability summary | ✅ |
| GET | `/api/seats/halls` | List all halls | ✅ |
| POST | `/api/applications` | Submit seat application | Student |
| GET | `/api/applications` | List applications | ✅ |
| PATCH | `/api/applications/:id` | Approve/deny application | Provost |
| POST | `/api/seat-changes` | Request seat change | Student |
| GET | `/api/seat-changes` | List seat changes | ✅ |
| PATCH | `/api/seat-changes/:id` | Approve/deny change | Provost |
| GET | `/api/residents` | List hall residents | Provost |

---

## Contributors

- **Ahtashamul Haque** — CSE, BUET

---

## License

This project is developed for **CSE 326** coursework at Bangladesh University of Engineering and Technology (BUET).
