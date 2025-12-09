// ============================================
// LOAN MANAGEMENT SYSTEM - MVP BACKEND
// File: server.js
// ============================================

const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
// Increase body size limits to support base64 image uploads from the borrower dashboard
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Request logging for collateral uploads (to help debug size issues)
app.use((req, res, next) => {
  if (req.path === '/api/borrower/collateral' && (req.method === 'POST')) {
    const len = req.headers['content-length'];
    console.log(`[Collateral Upload] Content-Length: ${len || 'n/a'}`);
  }
  next();
});

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  `http://${process.env.SERVER_IP}:5173`,
  `http://${process.env.SERVER_IP}:5174`,
  `http://${process.env.SERVER_IP}:3000`,
  // Vercel production URLs
  'https://philix-finance-managent.vercel.app',
  'https://philix-finance-managent-se6yjll10-5three.vercel.app',
  // Allow any Vercel preview deployments
  /^https:\/\/philix-finance-managent-.*\.vercel\.app$/,
  // Railway production URLs (add your actual frontend URL here)
  'https://philix-finance-frontend.up.railway.app',
  // Allow any Railway subdomain for development
  /^https:\/\/.*\.up\.railway\.app$/
];
// CORS
app.use(cors({
  origin: function (origin, cb) {
    // allow no-origin requests (like curl/Postman)
    if (!origin) return cb(null, true);
    
    // Check string origins
    if (allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    })) {
      return cb(null, true);
    }
    
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// ============================================
// DATABASE CONNECTION
// ============================================
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'loan_system',
  waitForConnections: true,
  connectionLimit: 10,
};

const pool = mysql.createPool(dbConfig);

// ============================================
// MIDDLEWARE
// ============================================
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Audit logging
const auditLog = async (userId, action, entityType, entityId, oldValues, newValues) => {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [userId, action, entityType, entityId, JSON.stringify(oldValues), JSON.stringify(newValues)]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
};

// ============================================
// HEALTH
// ============================================
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/db/health', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as ok');
    res.json({ db: rows[0]?.ok === 1 ? 'ok' : 'unknown' });
  } catch (e) {
    res.status(500).json({ db: 'error', message: e.message });
  }
});

// ============================================
// DEBUG (temporary; remove in production)
// ============================================
app.get('/api/debug/config', (req, res) => {
  try {
    res.json({
      dbHost: dbConfig.host,
      dbPort: dbConfig.port,
      dbName: dbConfig.database,
      frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
      serverIP: process.env.SERVER_IP,
      allowedOrigins: allowedOrigins
    });
  } catch (e) {
    res.status(500).json({ error: 'debug config error' });
  }
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// SECURE ADMIN CREATION ENDPOINT
app.post('/api/auth/create-admin', async (req, res) => {
  try {
    const { email, password, full_name, phone_number, admin_secret } = req.body;

    // Security Check 1: Verify admin creation secret
    if (admin_secret !== process.env.ADMIN_CREATION_SECRET) {
      return res.status(403).json({ error: 'Invalid admin creation secret' });
    }

    // Security Check 2: Check if any admin already exists (optional)
    const [existingAdmins] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
    );
    
    // Uncomment this if you want to prevent multiple admins
    // if (existingAdmins[0].count > 0) {
    //   return res.status(403).json({ error: 'Admin user already exists' });
    // }

    // Validation
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full_name are required' });
    }

    // Check if email already exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user - match actual table structure
    const [userResult] = await pool.execute(
      `INSERT INTO users (email, password_hash, role, phone_number)
       VALUES (?, ?, 'admin', ?)`,
      [email, passwordHash, phone_number]
    );

    const userId = userResult.insertId;

    // Create admin profile in borrowers table (for consistency)
    await pool.execute(
      `INSERT INTO borrowers (user_id, full_name, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())`,
      [userId, full_name]
    );

    await auditLog(userId, 'admin_created', 'user', userId, {}, { email, role: 'admin' });

    res.status(201).json({ 
      message: 'Admin account created successfully', 
      userId,
      email: email 
    });
  } catch (err) {
    console.error('Admin creation error:', err);
    res.status(500).json({ error: 'Server error during admin creation' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name, phone_number, id_number } = req.body;

    // Validation
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user - match actual table structure
    const [userResult] = await pool.execute(
      `INSERT INTO users (email, password_hash, role, phone_number)
       VALUES (?, ?, 'borrower', ?)`,
      [email, passwordHash, phone_number]
    );

    const userId = userResult.insertId;

    // Create borrower profile
    await pool.execute(
      `INSERT INTO borrowers (user_id, full_name, id_number, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [userId, full_name, id_number]
    );

    await auditLog(userId, 'user_registered', 'user', userId, {}, { email, role: 'borrower' });

    res.status(201).json({ message: 'Account created successfully', userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.execute(
      'SELECT id, email, password_hash, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await auditLog(user.id, 'user_login', 'user', user.id, {}, { timestamp: new Date() });

    res.json({ token, role: user.role, userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// BORROWER ROUTES
// ============================================
// Collateral - list (only show assessed collateral to borrowers)
app.get('/api/borrower/collateral', authenticateToken, authorize('borrower'), async (req, res) => {
  try {
    const [borrower] = await pool.execute('SELECT id FROM borrowers WHERE user_id = ?', [req.user.id]);
    if (borrower.length === 0) return res.status(404).json({ error: 'Borrower profile not found' });
    const borrowerId = borrower[0].id;
    const [rows] = await pool.execute(
      `SELECT id, type, description, serial_number, market_value, assessed_value, images, created_at, updated_at
       FROM collateral WHERE borrower_id = ? AND assessed_value IS NOT NULL ORDER BY created_at DESC`,
      [borrowerId]
    );

    const parseImages = (val) => {
      try {
        if (val == null) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') return val; // MySQL JSON -> object/array
        if (typeof val === 'string') return JSON.parse(val);
        return [];
      } catch (e) {
        console.warn('Failed to parse images for borrower collateral:', e.message);
        return [];
      }
    };

    const collateralWithImages = rows.map(row => ({
      ...row,
      images: parseImages(row.images)
    }));
    
    res.json(collateralWithImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Collateral - list pending (for borrowers to see their submitted but unassessed items)
app.get('/api/borrower/collateral/pending', authenticateToken, authorize('borrower'), async (req, res) => {
  try {
    const [borrower] = await pool.execute('SELECT id FROM borrowers WHERE user_id = ?', [req.user.id]);
    if (borrower.length === 0) return res.status(404).json({ error: 'Borrower profile not found' });
    const borrowerId = borrower[0].id;
    const [rows] = await pool.execute(
      `SELECT id, type, description, serial_number, market_value, created_at
       FROM collateral WHERE borrower_id = ? AND assessed_value IS NULL ORDER BY created_at DESC`,
      [borrowerId]
    );
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Collateral - add
app.post('/api/borrower/collateral', authenticateToken, authorize('borrower'), async (req, res) => {
  try {
    const approxBodySize = Buffer.byteLength(JSON.stringify(req.body || {}), 'utf8');
    console.log(`[Collateral Upload] Approx body size: ${approxBodySize} bytes`);
  } catch {}

  try {
    const { type, description, serial_number, market_value, images } = req.body;
    if (!type || market_value == null) return res.status(400).json({ error: 'type and market_value are required' });
    const [borrower] = await pool.execute('SELECT id FROM borrowers WHERE user_id = ?', [req.user.id]);
    if (borrower.length === 0) return res.status(404).json({ error: 'Borrower profile not found' });
    const borrowerId = borrower[0].id;
    
    // Convert images array to JSON string if provided
    const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;
    
    const [result] = await pool.execute(
      `INSERT INTO collateral (borrower_id, type, description, serial_number, market_value, images, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [borrowerId, type, description || null, serial_number || null, market_value, imagesJson]
    );
    await auditLog(req.user.id, 'collateral_added', 'collateral', result.insertId, {}, { type, market_value, imageCount: images?.length || 0 });
    res.status(201).json({ id: result.insertId, message: 'Collateral added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/borrower/dashboard', authenticateToken, authorize('borrower'), async (req, res) => {
  try {
    const [borrower] = await pool.execute(
      'SELECT id FROM borrowers WHERE user_id = ?',
      [req.user.id]
    );

    if (borrower.length === 0) {
      return res.status(404).json({ error: 'Borrower profile not found' });
    }

    const borrowerId = borrower[0].id;

    // Get active loans
    const [loans] = await pool.execute(
      `SELECT l.id, l.principal_amount, l.outstanding_balance, l.interest_rate, 
              l.term_months, l.status, l.disbursement_date, l.application_id,
              p.name as product_name
       FROM loans l
       JOIN loan_products p ON l.loan_product_id = p.id
       WHERE l.borrower_id = ? AND l.status = 'active'`,
      [borrowerId]
    );

    // Get next due date
    let nextDueDate = null;
    if (loans.length > 0) {
      const [schedule] = await pool.execute(
        `SELECT due_date FROM repayment_schedules 
         WHERE loan_id = ? AND status IN ('pending', 'partial') 
         ORDER BY due_date ASC LIMIT 1`,
        [loans[0].id]
      );
      if (schedule.length > 0) {
        nextDueDate = schedule[0].due_date;
      }
    }

    // Get recent payments
    const [payments] = await pool.execute(
      `SELECT amount, payment_method, completed_at, status
       FROM payments
       WHERE borrower_id = ? AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 5`,
      [borrowerId]
    );

    // Get loan applications (for notifications)
    const [applications] = await pool.execute(
      `SELECT id, requested_amount, term_months, purpose, status, review_notes, 
              created_at, updated_at
       FROM loan_applications
       WHERE borrower_id = ?
       ORDER BY created_at DESC`,
      [borrowerId]
    );

    res.json({
      loans,
      nextDueDate,
      totalOutstanding: loans.reduce((sum, l) => sum + parseFloat(l.outstanding_balance), 0),
      recentPayments: payments,
      applications
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/borrower/applications', authenticateToken, authorize('borrower'), async (req, res) => {
  try {
    const { loan_product_id, requested_amount, term_months, purpose, branch } = req.body;

    const [borrower] = await pool.execute(
      'SELECT id FROM borrowers WHERE user_id = ?',
      [req.user.id]
    );

    if (borrower.length === 0) {
      return res.status(404).json({ error: 'Borrower profile not found' });
    }

    const [result] = await pool.execute(
      `INSERT INTO loan_applications 
       (borrower_id, loan_product_id, requested_amount, term_months, purpose, branch, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [borrower[0].id, loan_product_id, requested_amount, term_months, purpose, branch]
    );

    await auditLog(req.user.id, 'application_submitted', 'loan_application', result.insertId, {}, req.body);

    res.status(201).json({ applicationId: result.insertId, message: 'Application submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// LOAN SCHEDULE CALCULATION
// ============================================
function calculateSchedule(principal, annualRate, termMonths, interestMethod, disbursementDate) {
  const schedule = [];
  const monthlyRate = annualRate / 12 / 100;

  if (interestMethod === 'flat') {
    const totalInterest = principal * (annualRate / 100) * (termMonths / 12);
    const monthlyPayment = (principal + totalInterest) / termMonths;
    const principalPortion = principal / termMonths;
    const interestPortion = totalInterest / termMonths;

    let balance = principal;
    for (let i = 1; i <= termMonths; i++) {
      const dueDate = new Date(disbursementDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      balance -= principalPortion;

      schedule.push({
        installment_number: i,
        due_date: dueDate,
        principal_due: principalPortion.toFixed(2),
        interest_due: interestPortion.toFixed(2),
        total_due: monthlyPayment.toFixed(2),
        balance_after: balance.toFixed(2),
        status: 'pending'
      });
    }
  } else { // declining balance
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                           (Math.pow(1 + monthlyRate, termMonths) - 1);
    let balance = principal;

    for (let i = 1; i <= termMonths; i++) {
      const interestDue = balance * monthlyRate;
      const principalDue = monthlyPayment - interestDue;
      balance -= principalDue;

      const dueDate = new Date(disbursementDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installment_number: i,
        due_date: dueDate,
        principal_due: principalDue.toFixed(2),
        interest_due: interestDue.toFixed(2),
        total_due: monthlyPayment.toFixed(2),
        balance_after: Math.max(0, balance).toFixed(2),
        status: 'pending'
      });
    }
  }

  return schedule;
}

// ============================================
// ADMIN ROUTES
// ============================================
// Collateral - list all
app.get('/api/admin/collateral', authenticateToken, authorize('admin', 'underwriter'), async (req, res) => {
  try {
    console.log('🔍 Admin collateral endpoint called');
    
    // First, get all collateral without joins to see what exists
    const [allCollateral] = await pool.execute(
      'SELECT * FROM collateral ORDER BY created_at DESC'
    );
    console.log('📊 Found collateral items:', allCollateral.length);
    
    const [rows] = await pool.execute(
      `SELECT c.id, c.type, c.description, c.serial_number, c.market_value, c.assessed_value,
              c.images, c.created_at, c.borrower_id,
              COALESCE(b.full_name, 'Unknown Borrower') as full_name, 
              COALESCE(u.email, 'Unknown Email') as email
       FROM collateral c
       LEFT JOIN borrowers b ON c.borrower_id = b.id
       LEFT JOIN users u ON b.user_id = u.id
       ORDER BY c.created_at DESC`
    );
    console.log('📋 Returned collateral with details:', rows.length);
    const parseImages = (val) => {
      try {
        if (val == null) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'object') return val;
        if (typeof val === 'string') return JSON.parse(val);
        return [];
      } catch (e) {
        console.warn('Failed to parse images for admin collateral:', e.message);
        return [];
      }
    };
    const withImages = rows.map(row => ({
      ...row,
      images: parseImages(row.images)
    }));
    res.json(withImages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Collateral - assess
app.post('/api/admin/collateral/:id/assess', authenticateToken, authorize('admin', 'underwriter'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { assessed_value, notes } = req.body || {};
    if (assessed_value == null) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'assessed_value is required' });
    }

    const [current] = await connection.execute('SELECT * FROM collateral WHERE id = ? FOR UPDATE', [id]);
    if (current.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Collateral not found or has been deleted' });
    }

    await connection.execute(
      'UPDATE collateral SET assessed_value = ?, updated_at = NOW() WHERE id = ?',
      [assessed_value, id]
    );

    // optional audit table if present
    try {
      await connection.execute(
        `INSERT INTO collateral_assessments (collateral_id, assessed_by, assessed_value, notes, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [id, req.user.id, assessed_value, notes || null]
      );
    } catch(e) {
      // table may not exist; ignore
    }

    await connection.commit();
    await auditLog(req.user.id, 'collateral_assessed', 'collateral', id, current[0], { assessed_value, notes });
    res.json({ message: 'Assessment saved', id: Number(id), assessed_value });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// Collateral - delete (soft delete - hide from admin but keep for borrower)
app.delete('/api/admin/collateral/:id', authenticateToken, authorize('admin', 'underwriter'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Get current collateral data for audit log
    const [current] = await connection.execute('SELECT * FROM collateral WHERE id = ? FOR UPDATE', [id]);
    
    if (!current.length) {
      return res.status(404).json({ error: 'Collateral not found' });
    }
    
    // Hard delete the collateral item
    const [result] = await connection.execute(
      'DELETE FROM collateral WHERE id = ?', 
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Collateral not found' });
    }
    
    await connection.commit();
    await auditLog(req.user.id, 'collateral_deleted', 'collateral', id, current[0], { deleted: true });
    res.json({ message: 'Collateral removed from admin view successfully', id: Number(id) });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.error('Error soft deleting collateral:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

app.get('/api/admin/applications', authenticateToken, authorize('admin', 'underwriter'), async (req, res) => {
  try {
    const [applications] = await pool.execute(
      `SELECT la.id, la.requested_amount, la.term_months, la.purpose, la.branch, la.status, 
              la.created_at, b.full_name, p.name as product_name, u.phone_number
       FROM loan_applications la
       JOIN borrowers b ON la.borrower_id = b.id
       JOIN users u ON b.user_id = u.id
       JOIN loan_products p ON la.loan_product_id = p.id
       ORDER BY la.created_at DESC`
    );

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all loans (active and closed) for admin
app.get('/api/admin/loans', authenticateToken, authorize('admin', 'underwriter'), async (req, res) => {
  try {
    const [loans] = await pool.execute(
      `SELECT 
        l.id,
        l.application_id,
        l.principal_amount,
        l.outstanding_balance,
        l.status,
        l.disbursement_date,
        l.maturity_date,
        l.created_at,
        l.updated_at,
        b.id as borrower_id,
        b.full_name as borrower_name,
        u.email as borrower_email,
        u.phone_number as borrower_phone,
        p.name as product_name,
        la.branch,
        (SELECT COUNT(*) FROM payments WHERE loan_id = l.id AND status = 'completed') as payment_count,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE loan_id = l.id AND status = 'completed') as total_paid
       FROM loans l
       JOIN borrowers b ON l.borrower_id = b.id
       JOIN users u ON b.user_id = u.id
       JOIN loan_products p ON l.loan_product_id = p.id
       LEFT JOIN loan_applications la ON l.application_id = la.id
       ORDER BY l.updated_at DESC, l.created_at DESC`
    );

    res.json(loans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/admin/applications/:id/review', authenticateToken, authorize('admin', 'underwriter'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { status, review_notes } = req.body; // status: 'approved' or 'rejected'

    console.log('🔍 DEBUG - Reviewing application:', {
      applicationId: id,
      status: status,
      reviewNotes: review_notes,
      userId: req.user.id
    });

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use "approved" or "rejected"' });
    }

    // Update application status
    const updateResult = await connection.execute(
      `UPDATE loan_applications 
       SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [status, review_notes, req.user.id, id]
    );

    console.log('✅ DEBUG - Application updated:', {
      affectedRows: updateResult[0].affectedRows,
      applicationId: id,
      status: status
    });

    // Audit log (non-blocking)
    auditLog(req.user.id, 'application_reviewed', 'loan_application', id, {}, { status, review_notes }).catch(err => {
      console.error('Audit log failed (non-critical):', err.message);
    });

    // If approved, automatically create the active loan
    if (status === 'approved') {
      // Get application details
      const [apps] = await connection.execute(
        `SELECT la.*, p.interest_rate, p.interest_method 
         FROM loan_applications la
         JOIN loan_products p ON la.loan_product_id = p.id
         WHERE la.id = ?`,
        [id]
      );

      if (apps.length > 0) {
        const app = apps[0];
        const disbursementDate = new Date();
        const maturityDate = new Date(disbursementDate);
        
        // Calculate maturity based on weeks (term_months actually stores weeks)
        const weeksToAdd = app.term_months;
        maturityDate.setDate(maturityDate.getDate() + (weeksToAdd * 7));

        // Create active loan (initially with principal as outstanding, will be updated after calculating interest)
        const [loanResult] = await connection.execute(
          `INSERT INTO loans 
           (application_id, borrower_id, loan_product_id, principal_amount, interest_rate, 
            term_months, disbursement_date, maturity_date, outstanding_balance, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
          [id, app.borrower_id, app.loan_product_id, app.requested_amount, app.interest_rate,
           app.term_months, disbursementDate, maturityDate, app.requested_amount]
        );

        const loanId = loanResult.insertId;

        // Generate weekly repayment schedule using our weekly rates
        const principal = parseFloat(app.requested_amount);
        const weeks = app.term_months; // Actually stores weeks
        
        // Calculate interest based on weeks
        let interestRate = 0;
        if (weeks === 1) interestRate = 13;
        else if (weeks === 2) interestRate = 20;
        else if (weeks === 3) interestRate = 30;
        else if (weeks === 4) interestRate = 35;
        else interestRate = (weeks / 4) * 35; // Proportional for other weeks
        
        const totalInterest = principal * (interestRate / 100);
        const totalAmount = principal + totalInterest;
        const weeklyPayment = totalAmount / weeks;
        const principalPerWeek = principal / weeks;
        const interestPerWeek = totalInterest / weeks;

        console.log('💰 Loan Calculation:', {
          principal,
          weeks,
          interestRate: interestRate + '%',
          totalInterest,
          totalAmount,
          weeklyPayment
        });

        // Update the loan's outstanding balance to be the TOTAL amount (principal + interest)
        await connection.execute(
          `UPDATE loans SET outstanding_balance = ?, interest_rate = ? WHERE id = ?`,
          [totalAmount.toFixed(2), interestRate, loanId]
        );

        // Create weekly installments
        for (let i = 1; i <= weeks; i++) {
          const dueDate = new Date(disbursementDate);
          dueDate.setDate(dueDate.getDate() + (i * 7)); // Add 7 days for each week
          
          const remainingBalance = principal - (principalPerWeek * i);

          await connection.execute(
            `INSERT INTO repayment_schedules 
             (loan_id, installment_number, due_date, principal_due, interest_due, total_due, 
              principal_paid, interest_paid, total_paid, balance_after, status)
             VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 'pending')`,
            [loanId, i, dueDate, principalPerWeek.toFixed(2), interestPerWeek.toFixed(2), 
             weeklyPayment.toFixed(2), Math.max(0, remainingBalance).toFixed(2)]
          );
        }

        // Audit log (non-blocking)
        auditLog(req.user.id, 'loan_disbursed', 'loan', loanId, {}, { appId: id, amount: app.requested_amount }).catch(err => {
          console.error('Audit log failed (non-critical):', err.message);
        });
      }
    }

    await connection.commit();
    res.json({ message: `Application ${status}${status === 'approved' ? ' and loan activated' : ''}` });
  } catch (err) {
    await connection.rollback();
    console.error('❌ Review application error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  } finally {
    connection.release();
  }
});

// Delete loan application
app.delete('/api/admin/applications/:id', authenticateToken, authorize('admin'), async (req, res) => {
  console.log('🗑️ DEBUG - Delete request received:', {
    applicationId: req.params.id,
    userId: req.user?.id,
    userRole: req.user?.role
  });
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // First check if application exists and get details for audit log
    const [apps] = await connection.execute(
      'SELECT * FROM loan_applications WHERE id = ?',
      [id]
    );
    
    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const application = apps[0];
    
    // Check if there's a loan for this application
    const [loans] = await connection.execute(
      'SELECT id, status, outstanding_balance FROM loans WHERE application_id = ?',
      [id]
    );
    
    // Allow deletion if:
    // 1. No loans exist, OR
    // 2. Application is rejected, OR  
    // 3. All loans are fully paid (closed with 0 balance)
    if (loans.length > 0 && application.status !== 'rejected') {
      const hasActiveLoan = loans.some(loan => 
        loan.status !== 'closed' || parseFloat(loan.outstanding_balance) > 0
      );
      
      if (hasActiveLoan) {
        return res.status(400).json({ 
          error: 'Cannot delete application with active loan. Please handle the loan first.' 
        });
      }
      
      console.log('✅ All loans are fully paid - allowing deletion');
    }
    
    // Delete associated loans if rejected OR fully paid
    if (loans.length > 0 && (application.status === 'rejected' || 
        loans.every(loan => loan.status === 'closed' && parseFloat(loan.outstanding_balance) === 0))) {
      
      console.log('🗑️ Deleting associated loans for application:', id, 
        application.status === 'rejected' ? '(rejected)' : '(fully paid)');
      
      // Delete payments first (to maintain referential integrity)
      for (const loan of loans) {
        await connection.execute(
          'DELETE FROM payments WHERE loan_id = ?',
          [loan.id]
        );
        
        // Delete repayment schedules
        await connection.execute(
          'DELETE FROM repayment_schedules WHERE loan_id = ?',
          [loan.id]
        );
      }
      
      // Delete loans
      await connection.execute(
        'DELETE FROM loans WHERE application_id = ?',
        [id]
      );
      
      console.log('✅ Deleted all associated data for application', id);
    }
    
    // Delete the application
    const [deleteResult] = await connection.execute(
      'DELETE FROM loan_applications WHERE id = ?',
      [id]
    );
    
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Log the deletion
    await auditLog(
      req.user.id, 
      'application_deleted', 
      'loan_application', 
      id, 
      application, 
      {}
    );
    
    await connection.commit();
    res.json({ 
      message: 'Application deleted successfully',
      deletedApplication: {
        id: application.id,
        borrower: application.full_name || 'Unknown',
        amount: application.requested_amount
      }
    });
    
  } catch (err) {
    await connection.rollback();
    console.error('Delete application error:', err);
    res.status(500).json({ error: 'Server error while deleting application' });
  } finally {
    connection.release();
  }
});

app.post('/api/admin/loans/:appId/disburse', authenticateToken, authorize('admin'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { appId } = req.params;
    const { disbursement_date } = req.body;

    // Get application details
    const [apps] = await connection.execute(
      `SELECT la.*, p.interest_rate, p.interest_method 
       FROM loan_applications la
       JOIN loan_products p ON la.loan_product_id = p.id
       WHERE la.id = ? AND la.status = 'approved'`,
      [appId]
    );

    if (apps.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Application not approved' });
    }

    const app = apps[0];
    const disbursementDateObj = disbursement_date ? new Date(disbursement_date) : new Date();
    const maturityDate = new Date(disbursementDateObj);
    maturityDate.setMonth(maturityDate.getMonth() + app.term_months);

    // Create loan
    const [loanResult] = await connection.execute(
      `INSERT INTO loans 
       (application_id, borrower_id, loan_product_id, principal_amount, interest_rate, 
        term_months, disbursement_date, maturity_date, outstanding_balance, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [appId, app.borrower_id, app.loan_product_id, app.requested_amount, app.interest_rate,
       app.term_months, disbursementDateObj, maturityDate, app.requested_amount]
    );

    const loanId = loanResult.insertId;

    // Generate repayment schedule
    const schedule = calculateSchedule(
      parseFloat(app.requested_amount),
      parseFloat(app.interest_rate),
      app.term_months,
      app.interest_method,
      disbursementDateObj
    );

    // Insert schedule
    for (const installment of schedule) {
      await connection.execute(
        `INSERT INTO repayment_schedules 
         (loan_id, installment_number, due_date, principal_due, interest_due, total_due, 
          principal_paid, interest_paid, total_paid, balance_after, status)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
        [loanId, installment.installment_number, installment.due_date, installment.principal_due,
         installment.interest_due, installment.total_due, installment.balance_after, installment.status]
      );
    }

    await connection.commit();
    await auditLog(req.user.id, 'loan_disbursed', 'loan', loanId, {}, { appId, amount: app.requested_amount });

    res.json({ loanId, message: 'Loan disbursed successfully' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// ============================================
// PAYMENT ROUTES - Using automatic status update system
// ============================================
// Store database connection in app.locals for routes to access
app.locals.db = pool;

// Import payment routes
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', authenticateToken, paymentRoutes);

// Legacy payment endpoint (kept for backward compatibility)
app.post('/api/borrower/payments', authenticateToken, authorize('borrower'), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { loan_id, amount, payment_method, payment_reference } = req.body;

    const [borrower] = await connection.execute('SELECT id FROM borrowers WHERE user_id = ?', [req.user.id]);
    if (borrower.length === 0) throw new Error('Borrower not found');

    // Record payment
    const [paymentResult] = await connection.execute(
      `INSERT INTO payments 
       (loan_id, borrower_id, amount, payment_method, payment_reference, status, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, 'completed', NOW(), NOW())`,
      [loan_id, borrower[0].id, amount, payment_method, payment_reference]
    );

    // Get pending installments
    const [installments] = await connection.execute(
      `SELECT * FROM repayment_schedules 
       WHERE loan_id = ? AND status IN ('pending', 'partial', 'overdue')
       ORDER BY installment_number ASC`,
      [loan_id]
    );

    let remainingAmount = parseFloat(amount);

    // Allocate payment to installments
    for (const inst of installments) {
      if (remainingAmount <= 0) break;

      const totalDue = parseFloat(inst.total_due);
      const totalPaid = parseFloat(inst.total_paid);
      const amountDue = totalDue - totalPaid;

      const allocationAmount = Math.min(remainingAmount, amountDue);
      
      const interestDue = parseFloat(inst.interest_due) - parseFloat(inst.interest_paid);
      const interestAllocation = Math.min(allocationAmount, interestDue);
      const principalAllocation = allocationAmount - interestAllocation;

      const newInterestPaid = parseFloat(inst.interest_paid) + interestAllocation;
      const newPrincipalPaid = parseFloat(inst.principal_paid) + principalAllocation;
      const newTotalPaid = newInterestPaid + newPrincipalPaid;

      const newStatus = newTotalPaid >= totalDue ? 'paid' : 'partial';

      await connection.execute(
        `UPDATE repayment_schedules 
         SET principal_paid = ?, interest_paid = ?, total_paid = ?, status = ?
         WHERE id = ?`,
        [newPrincipalPaid, newInterestPaid, newTotalPaid, newStatus, inst.id]
      );

      remainingAmount -= allocationAmount;
    }

    // Update loan outstanding balance
    const [loanData] = await connection.execute('SELECT outstanding_balance FROM loans WHERE id = ?', [loan_id]);
    const newBalance = parseFloat(loanData[0].outstanding_balance) - (parseFloat(amount) - remainingAmount);

    await connection.execute(
      'UPDATE loans SET outstanding_balance = ?, updated_at = NOW() WHERE id = ?',
      [newBalance, loan_id]
    );

    // Check if loan is fully paid
    if (newBalance <= 0) {
      await connection.execute('UPDATE loans SET status = "closed", updated_at = NOW() WHERE id = ?', [loan_id]);
    }

    await connection.commit();
    await auditLog(req.user.id, 'payment_made', 'payment', paymentResult.insertId, {}, { loan_id, amount });

    res.json({ message: 'Payment processed', paymentId: paymentResult.insertId, newBalance });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// ============================================
// DELINQUENCY DETECTION (Cron Job)
// ============================================
cron.schedule('0 0 * * *', async () => {
  console.log('Running delinquency check...');
  
  try {
    const [overdueInstallments] = await pool.execute(
      `SELECT rs.*, l.id as loan_id, l.borrower_id, b.full_name, u.email, u.phone_number
       FROM repayment_schedules rs
       JOIN loans l ON rs.loan_id = l.id
       JOIN borrowers b ON l.borrower_id = b.id
       JOIN users u ON b.user_id = u.id
       WHERE rs.status IN ('pending', 'partial') AND rs.due_date < CURDATE()
       AND l.status = 'active'`
    );

    for (const inst of overdueInstallments) {
      const daysOverdue = Math.floor((new Date() - new Date(inst.due_date)) / (1000 * 60 * 60 * 24));

      // Update status to overdue
      await pool.execute(
        'UPDATE repayment_schedules SET status = "overdue" WHERE id = ?',
        [inst.id]
      );

      // Flag loan as defaulted if > 90 days
      if (daysOverdue > 90) {
        await pool.execute(
          'UPDATE loans SET status = "defaulted", updated_at = NOW() WHERE id = ?',
          [inst.loan_id]
        );
        console.log(`Loan ${inst.loan_id} marked as defaulted`);
        // TODO: Send notification
      } else if (daysOverdue === 15 || daysOverdue === 30) {
        // Send overdue notice
        console.log(`Sending overdue notice to ${inst.email} for loan ${inst.loan_id}`);
        // TODO: Integrate Africa's Talking SMS / SendGrid email
      }
    }
  } catch (err) {
    console.error('Delinquency check error:', err);
  }
});

// ============================================
// REPORTING ENDPOINTS
// ============================================
app.get('/api/reports/dashboard', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [activeLoans] = await pool.execute(
      `SELECT COUNT(*) as count, SUM(outstanding_balance) as total_outstanding
       FROM loans WHERE status = 'active'`
    );

    const [pendingApps] = await pool.execute(
      `SELECT COUNT(*) as count FROM loan_applications WHERE status = 'pending'`
    );

    const [parData] = await pool.execute(
      `SELECT SUM(l.outstanding_balance) as par_amount
       FROM loans l
       JOIN repayment_schedules rs ON l.id = rs.loan_id
       WHERE l.status = 'active' AND rs.status = 'overdue'`
    );

    // Count total unique borrowers who have applied for loans
    const [totalBorrowers] = await pool.execute(
      `SELECT COUNT(DISTINCT borrower_id) as count 
       FROM loan_applications`
    );

    res.json({
      activeLoans: activeLoans[0].count,
      totalOutstanding: activeLoans[0].total_outstanding || 0,
      pendingApplications: pendingApps[0].count,
      portfolioAtRisk: parData[0].par_amount || 0,
      totalBorrowers: totalBorrowers[0].count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Global error handler for payload too large and others
app.use((err, req, res, next) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    console.error('Payload too large:', err.message);
    return res.status(413).json({ error: 'Payload too large', max: '20mb', hint: 'Please reduce image size or count' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error' });
});

// ============================================
// SERVER START
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server accessible at: http://localhost:${PORT} and http://41.63.30.187:${PORT}`);
  console.log('DB host:', dbConfig.host, 'port:', dbConfig.port, 'db:', dbConfig.database);
});