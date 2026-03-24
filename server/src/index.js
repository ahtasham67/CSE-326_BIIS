require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const path = require('path');
const pool = require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const seatRoutes = require('./routes/seats');
const applicationRoutes = require('./routes/applications');
const seatChangeRoutes = require('./routes/seatChanges');
const residentRoutes = require('./routes/residents');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy in production (Render uses a reverse proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — allow Vite dev server in development
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));
}

// Session configuration with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'biis-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/seat-changes', seatChangeRoutes);
app.use('/api/residents', residentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the React build if it exists (production / Docker deployment)
const clientBuild = path.join(__dirname, '../../client/dist');
const fs = require('fs');
if (fs.existsSync(clientBuild)) {
  console.log('📦 Serving React build from', clientBuild);
  app.use(express.static(clientBuild));
  
  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// Reservation expiry cleanup — runs every 5 minutes
async function cleanupExpiredReservations() {
  try {
    // Find expired reservations
    const expired = await pool.query(
      `SELECT id, reserved_seat_id FROM applications 
       WHERE status = 'approved' AND payment_status = 'pending' AND payment_deadline < NOW()`
    );

    for (const app of expired.rows) {
      // Release reserved seat
      if (app.reserved_seat_id) {
        await pool.query(`UPDATE seats SET status = 'available' WHERE id = $1 AND status = 'reserved'`, [app.reserved_seat_id]);
      }
      // Mark application as expired
      await pool.query(
        `UPDATE applications SET status = 'expired', payment_status = 'expired', updated_at = NOW() WHERE id = $1`,
        [app.id]
      );
      console.log(`⏰ Application ${app.id} expired — seat ${app.reserved_seat_id} released`);
    }

    if (expired.rows.length > 0) {
      console.log(`🧹 Cleaned up ${expired.rows.length} expired reservation(s)`);
    }
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredReservations, 5 * 60 * 1000);
// Also run once on startup after 10 seconds
setTimeout(cleanupExpiredReservations, 10000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BIIS Server running on http://localhost:${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
