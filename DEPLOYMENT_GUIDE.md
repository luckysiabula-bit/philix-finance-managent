# 🚀 PHILIX Finance - Deployment Guide

This guide covers deploying your loan management system to the cloud with automatic loan status updates.

---

## 📋 What's New: Automatic Loan Status Updates

Your app now automatically:
- ✅ Updates loan status from `active` to `closed` when fully paid
- ✅ Tracks outstanding balance in real-time
- ✅ Marks repayment schedules as `paid` when payments are made
- ✅ Works at the database level (reliable and automatic)

---

## 🗄️ Database Migration Steps

### Step 1: Export Your XAMPP Database

```bash
# Open Command Prompt in XAMPP directory (usually C:\xampp\mysql\bin)
cd C:\xampp\mysql\bin

# Export your database
mysqldump -u root -p loan_system > C:\backup\loan_system_backup.sql

# If no password (default XAMPP), remove -p:
mysqldump -u root loan_system > C:\backup\loan_system_backup.sql
```

### Step 2: Set Up Database Structure

```sql
-- STEP 2A: Create complete database structure
-- File: schema.sql
-- This creates all tables, seed data, and stored procedures

-- Run this FIRST in your XAMPP phpMyAdmin or MySQL Workbench
```

### Step 3: Install Automatic Status Update System

```sql
-- STEP 2B: Add automation triggers
-- File: auto_loan_status_update.sql
-- This creates triggers that automatically update loan status
-- when payments are recorded

-- Run this SECOND after schema.sql
```

### Step 4: Test Locally (Optional but Recommended)

```sql
-- After installing the triggers, test with a sample payment:

-- 1. Find an active loan
SELECT id, outstanding_balance, status FROM loans WHERE status = 'active' LIMIT 1;

-- 2. Record a payment (replace loan_id with actual ID)
INSERT INTO payments (loan_id, borrower_id, amount, payment_method, status, completed_at, created_at)
VALUES (1, 1, 100.00, 'mobile_money', 'completed', NOW(), NOW());

-- 3. Check if status updated
SELECT id, outstanding_balance, status FROM loans WHERE id = 1;

-- If outstanding_balance is 0, status should be 'closed' ✅
```

---

## ☁️ Cloud Deployment Options

### 🏆 Option 1: Railway (RECOMMENDED - $5-8/month)

**Why Railway?**
- ✅ Easiest deployment (connects to GitHub)
- ✅ Includes MySQL database
- ✅ Automatic HTTPS
- ✅ Free trial available

**Steps:**

1. **Push Code to GitHub** (see GitHub section below)

2. **Sign up at Railway.app**
   - Go to https://railway.app
   - Sign in with GitHub
   - Get $5 free trial credit

3. **Create New Project**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository

4. **Add MySQL Database**
   - Click "+ New"
   - Select "Database" → "MySQL"
   - Railway creates database automatically

5. **Configure Backend**
   - Click on your backend service
   - Go to "Variables" tab
   - Add environment variables:
     ```
     DB_HOST=${{MySQL.MYSQL_PRIVATE_URL}} (Railway auto-fills this)
     DB_PORT=3306
     DB_USER=root
     DB_PASSWORD=${{MySQL.MYSQL_ROOT_PASSWORD}}
     DB_NAME=railway
     JWT_SECRET=your-super-secret-key-here-change-this
     ADMIN_CREATION_SECRET=your-admin-secret-here
     PORT=3000
     ```

6. **Import Your Database**
   ```bash
   # Option A: Import existing backup
   railway login
   railway link [your-project-id]
   railway run mysql -h [host] -u root -p[password] railway < loan_system_backup.sql
   
   # Option B: Run fresh setup (RECOMMENDED)
   # 1. Run schema.sql first
   # 2. Run auto_loan_status_update.sql second
   ```

7. **Deploy Frontend**
   - Railway auto-detects Vite
   - Add environment variable:
     ```
     VITE_API_URL=https://your-backend-url.railway.app/api
     ```

8. **Run Database Setup** (if using Option B)
   - Connect to Railway MySQL
   - **Step 1:** Run `schema.sql` (creates all tables + seed data)
   - **Step 2:** Run `auto_loan_status_update.sql` (adds triggers)
   - **Step 3:** Run `test_loan_payment.sql` (verify it works)
   - Done! ✅

---

### 💰 Option 2: Render (FREE with limitations)

**Pros:**
- ✅ Free tier available
- ✅ Easy GitHub integration
- ✅ Good for testing/demos

**Cons:**
- ⚠️ Free tier sleeps after 15 min inactivity (50s cold start)
- ⚠️ Need external MySQL (free options limited)

**Steps:**

1. **Sign up at Render.com**
   - Connect GitHub account

2. **Deploy Backend**
   - New → Web Service
   - Connect repository
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Instance Type: Free or Starter ($7/month for always-on)

3. **Add MySQL Database**
   - Option A: Use PlanetScale (free tier)
   - Option B: Use Render PostgreSQL (convert schema)
   - Option C: Use external MySQL provider

4. **Deploy Frontend**
   - New → Static Site
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

---

### 🌐 Option 3: Vercel (Frontend) + Railway (Backend)

**Best performance combo:**
- Vercel: Lightning-fast frontend CDN
- Railway: Reliable backend + database

**Frontend (Vercel):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd /path/to/your/project
vercel
```

**Backend (Railway):**
- Follow Railway steps above

---

## 📦 GitHub Push Instructions

### Method 1: Using Git Commands (Recommended)

```bash
# 1. Initialize Git (if not already)
cd /path/to/your/project
git init

# 2. Add all files
git add .

# 3. Create first commit
git commit -m "Initial commit - PHILIX Finance Loan Management System"

# 4. Create GitHub repository
# Go to github.com → New Repository → Name it (e.g., philix-finance-app)

# 5. Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/philix-finance-app.git
git branch -M main
git push -u origin main
```

### Method 2: GitHub Desktop (Visual)

1. Download GitHub Desktop: https://desktop.github.com
2. File → Add Local Repository
3. Select your project folder
4. Click "Publish repository"
5. Choose name and public/private
6. Publish!

---

## 🔒 Security Checklist Before Deployment

- [ ] Update `JWT_SECRET` in backend `.env`
- [ ] Update `ADMIN_CREATION_SECRET`
- [ ] Remove `.env` files from Git (check `.gitignore`)
- [ ] Change default admin password after first login
- [ ] Enable HTTPS (Railway does this automatically)
- [ ] Set strong MySQL root password
- [ ] Review CORS settings in `server.js`

---

## 🧪 Testing After Deployment

### 1. Test Backend Health
```bash
curl https://your-backend.railway.app/api/health
# Should return: {"ok":true}
```

### 2. Test Database Connection
```bash
curl https://your-backend.railway.app/api/db/health
# Should return: {"db":"ok"}
```

### 3. Test Login
```bash
curl -X POST https://your-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_password"}'
```

### 4. Test Payment & Auto Status Update
- Login as borrower
- Make a payment that fully pays off a loan
- Check if loan status changed to `closed` ✅

---

## 📊 Database Status Update Features

### Automatic Triggers Installed:
1. **trg_after_payment_insert** - Runs when new payment recorded
2. **trg_after_payment_update** - Runs when payment status changes
3. **update_loan_status_after_payment** - Procedure that does the work

### Manual Commands:

```sql
-- Recalculate all loan statuses (useful after migration)
CALL recalculate_all_loan_statuses();

-- Check loans that should be closed
SELECT id, outstanding_balance, status 
FROM loans 
WHERE outstanding_balance <= 0 AND status = 'active';

-- View payment summary
SELECT 
  l.id as loan_id,
  l.status,
  l.outstanding_balance,
  COUNT(p.id) as payment_count,
  SUM(p.amount) as total_paid
FROM loans l
LEFT JOIN payments p ON l.id = p.loan_id AND p.status = 'completed'
GROUP BY l.id;
```

---

## 🆘 Troubleshooting

### Issue: Loans not auto-updating to "closed"

**Solution:**
```sql
-- Check if triggers exist
SHOW TRIGGERS LIKE 'payments';

-- If missing, re-run: auto_loan_status_update.sql

-- Manually fix existing loans
CALL recalculate_all_loan_statuses();
```

### Issue: "Access denied" on database

**Solution:**
- Check DB_HOST, DB_USER, DB_PASSWORD in environment variables
- Ensure Railway MySQL is running
- Check connection string format

### Issue: CORS errors

**Solution:**
- Update `allowedOrigins` in `backend/server.js`
- Add your frontend URL (e.g., `https://your-app.railway.app`)

---

## 💡 Cost Breakdown

### Railway (All-in-One)
- **Trial**: $5 free credit
- **Production**: ~$5-8/month
  - Backend: ~$2-3/month
  - MySQL: ~$3-5/month
  - Frontend: Often free (low resource)

### Render Free Tier
- **Cost**: $0/month
- **Limitations**: 
  - Backend sleeps after 15 min
  - 50-second cold start
  - Good for demos, not production

### Vercel + Railway
- **Frontend (Vercel)**: FREE
- **Backend + DB (Railway)**: ~$5-8/month
- **Total**: ~$5-8/month with best performance

---

## 🎯 **CRITICAL: Complete SQL Deployment Order**

### **Local Setup (XAMPP Testing):**
1. ✅ **Run `schema.sql`** - Creates database structure + seed data
2. ✅ **Run `auto_loan_status_update.sql`** - Adds automation triggers  
3. ✅ **Run `test_loan_payment.sql`** - Verify automation works
4. ✅ **Optional: Run `fix_existing_loans.sql`** - Fix any existing data

### **Cloud Deployment Options:**

#### **Option A: Import Complete Database (Easiest)**
1. ✅ Export XAMPP database (after running all SQL scripts locally)
2. ✅ Import to Railway/Render MySQL
3. ✅ Done!

#### **Option B: Fresh Cloud Setup (Recommended)**  
1. ✅ Push code to GitHub
2. ✅ Deploy to Railway/Render
3. ✅ **Run `schema.sql`** in cloud MySQL first
4. ✅ **Run `auto_loan_status_update.sql`** in cloud MySQL second
5. ✅ **Run `tmp_rovodev_deployment_script.sql`** to verify setup
6. ✅ Test with `test_loan_payment.sql`

## 🎉 Next Steps

---

## 📞 Need Help?

Common resources:
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- MySQL Workbench: Download from mysql.com

---

**Created by**: PHILIX Finance Development Team
**Last Updated**: 2024
**Version**: 2.0 (with automatic loan status updates)
