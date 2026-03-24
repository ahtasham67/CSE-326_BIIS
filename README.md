# BIIS — BUET Institutional Information System

Hall Seat Management System for university students and provosts. Built with **React + Express + PostgreSQL**.

---

## Features

### Student Portal
- 🪑 View seat availability — filter by hall, floor, or room number
- 📝 Apply for seat allocation with reason & supporting documents
- 🔄 Request seat change (for current residents)
- 📋 Track application status and provost feedback
- 💳 Complete dummy payment within 24 hours to confirm seat
- ✖ Cancel pending or unpaid applications

### Provost Dashboard
- 📨 View all applications with **AI-generated summaries** and recommendation badges (Strong / Moderate / Weak)
- ⭐ **Priority Score (1-10)** with factor breakdown: Distance, Financial, Medical, Academic, Documents
- ✅ Approve or ❌ Deny applications with feedback
- 🔄 Manage seat change requests
- 🏠 View all hall residents — room, dining days, absence records

### 🎫 Reservation Flow (Train-Ticket Style)

```
Student Applies → Provost Reviews (AI Score) → Approved
     ↓
Seat RESERVED (24hr countdown starts)
     ↓
Student Pays ৳500 → Seat ASSIGNED → Becomes Resident
     OR
24hrs expire → Seat RELEASED → Application EXPIRED
     OR
Student cancels → Seat RELEASED → Application CANCELLED
```

- **Residents cannot apply** for a new seat (must use Change Seat)
- **Only one active application** allowed per student

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
| Deployment | Docker + Render |

---

## Prerequisites

- **Node.js** v18+ and **npm**
- **PostgreSQL** database (local or hosted, e.g. [Neon](https://neon.tech))
- **Git**

### Install Node.js on Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
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
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
cd server && node src/migrate.js && cd ..
npm run dev
```

---

## Project Structure

```
CSE-326_BIIS/
├── server/                     # Express backend
│   ├── src/
│   │   ├── index.js            # Server + expiry cleanup job
│   │   ├── db.js               # PostgreSQL connection pool
│   │   ├── migrate.js          # Schema + seed data
│   │   ├── middleware/auth.js  # Session auth middleware
│   │   ├── routes/
│   │   │   ├── auth.js         # Login, register, logout
│   │   │   ├── seats.js        # Seat availability
│   │   │   ├── applications.js # Apply, pay, cancel, resident-check
│   │   │   ├── seatChanges.js  # Seat change requests
│   │   │   └── residents.js    # Hall residents
│   │   └── services/ai.js     # Gemini AI scoring (5 factors, /10)
│   └── .env.example
├── client/                     # Vite + React frontend
│   └── src/
│       ├── index.css           # BUET institutional theme
│       ├── pages/
│       │   ├── student/        # SeatAvailability, ApplySeat, MyApplications, ChangeSeat
│       │   └── provost/        # Applications, Residents, SeatChanges
│       └── components/         # Layout, Sidebar
├── Dockerfile                  # Multi-stage Docker build
├── render.yaml                 # Render Blueprint
├── setup.sh / start.sh         # Dev scripts
└── README.md
```

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
| POST | `/api/applications/:id/pay` | Complete dummy payment | Student |
| POST | `/api/applications/:id/cancel` | Cancel application | Student |
| GET | `/api/applications/resident-check` | Check if student is resident | Student |
| POST | `/api/seat-changes` | Request seat change | Student |
| GET | `/api/seat-changes` | List seat changes | ✅ |
| PATCH | `/api/seat-changes/:id` | Approve/deny change | Provost |
| GET | `/api/residents` | List hall residents | Provost |

---

## Deployment on Render

1. Push code to GitHub
2. Create a **Web Service** on [Render](https://render.com)
3. Configure:
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
4. Set environment variables:
   - `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`, `GEMINI_API_KEY` (optional)
5. Deploy — migrations run automatically on startup

---

## Contributors

- **Ahtashamul Haque** — CSE, BUET

---

## License

This project is developed for **CSE 326** coursework at Bangladesh University of Engineering and Technology (BUET).
