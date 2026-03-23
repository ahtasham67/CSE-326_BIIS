const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { analyzeApplication } = require('../services/ai');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, images, and Word documents are allowed'));
    }
  }
});

// POST /api/applications — student submits a seat allocation request
router.post('/', requireAuth, upload.single('document'), async (req, res) => {
  try {
    if (req.session.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit applications' });
    }

    const { hall_id, preferred_room_id, reason } = req.body;

    if (!hall_id || !reason) {
      return res.status(400).json({ error: 'Hall and reason are required' });
    }

    // Check for existing pending application
    const existing = await pool.query(
      `SELECT id FROM applications WHERE student_id = $1 AND status = 'pending'`,
      [req.session.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending application' });
    }

    const document_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Get student details for AI analysis
    const studentData = {
      student_name: req.session.user.name,
      department: req.session.user.department,
      year: req.session.user.year,
      reason,
      document_url
    };

    // Generate AI summary and recommendation
    const { summary, recommendation } = await analyzeApplication(studentData);

    const result = await pool.query(
      `INSERT INTO applications (student_id, hall_id, preferred_room_id, reason, document_url, ai_summary, ai_recommendation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.session.user.id, hall_id, preferred_room_id || null, reason, document_url, summary, recommendation]
    );

    res.status(201).json({ application: result.rows[0] });
  } catch (err) {
    console.error('Create application error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/applications — list applications
// Students see their own, provosts see applications for their hall
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;

    if (user.role === 'student') {
      const result = await pool.query(
        `SELECT a.*, h.name AS hall_name, r.room_number, r.floor
         FROM applications a
         JOIN halls h ON a.hall_id = h.id
         LEFT JOIN rooms r ON a.preferred_room_id = r.id
         WHERE a.student_id = $1
         ORDER BY a.created_at DESC`,
        [user.id]
      );
      return res.json({ applications: result.rows });
    }

    if (user.role === 'provost') {
      // Get provost's hall
      const hallResult = await pool.query('SELECT id FROM halls WHERE provost_id = $1', [user.id]);
      if (hallResult.rows.length === 0) {
        return res.json({ applications: [] });
      }

      const hallIds = hallResult.rows.map(h => h.id);
      const { status } = req.query;

      let query = `
        SELECT a.*, 
               u.name AS student_name, u.email AS student_email, 
               u.student_id AS student_roll, u.department, u.year,
               h.name AS hall_name, r.room_number, r.floor
        FROM applications a
        JOIN users u ON a.student_id = u.id
        JOIN halls h ON a.hall_id = h.id
        LEFT JOIN rooms r ON a.preferred_room_id = r.id
        WHERE a.hall_id = ANY($1)
      `;
      const params = [hallIds];

      if (status) {
        params.push(status);
        query += ` AND a.status = $${params.length}`;
      }

      query += ' ORDER BY a.created_at DESC';

      const result = await pool.query(query, params);
      return res.json({ applications: result.rows });
    }

    res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error('List applications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/applications/:id — provost approves or denies
router.patch('/:id', requireRole('provost'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or denied' });
    }

    // Verify the application belongs to provost's hall
    const hallResult = await pool.query('SELECT id FROM halls WHERE provost_id = $1', [req.session.user.id]);
    const hallIds = hallResult.rows.map(h => h.id);

    const app = await pool.query(
      'SELECT * FROM applications WHERE id = $1 AND hall_id = ANY($2)',
      [id, hallIds]
    );

    if (app.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (app.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Application has already been processed' });
    }

    const result = await pool.query(
      `UPDATE applications SET status = $1, feedback = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, feedback || null, id]
    );

    // If approved, assign a seat
    if (status === 'approved') {
      const application = app.rows[0];
      
      // Find an available seat (prefer the requested room, fallback to any in the hall)
      let seatQuery;
      if (application.preferred_room_id) {
        seatQuery = await pool.query(
          `SELECT s.id FROM seats s WHERE s.room_id = $1 AND s.status = 'available' LIMIT 1`,
          [application.preferred_room_id]
        );
      }

      if (!seatQuery || seatQuery.rows.length === 0) {
        seatQuery = await pool.query(
          `SELECT s.id FROM seats s 
           JOIN rooms r ON s.room_id = r.id 
           WHERE r.hall_id = $1 AND s.status = 'available' 
           LIMIT 1`,
          [application.hall_id]
        );
      }

      if (seatQuery.rows.length > 0) {
        const seatId = seatQuery.rows[0].id;
        
        // Mark seat as occupied
        await pool.query(`UPDATE seats SET status = 'occupied' WHERE id = $1`, [seatId]);

        // Create resident record
        await pool.query(
          `INSERT INTO residents (student_id, seat_id, hall_id, dining_days)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (student_id) DO UPDATE SET seat_id = $2, hall_id = $3, assigned_at = NOW()`,
          [application.student_id, seatId, application.hall_id, ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']]
        );
      }
    }

    res.json({ application: result.rows[0] });
  } catch (err) {
    console.error('Update application error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
