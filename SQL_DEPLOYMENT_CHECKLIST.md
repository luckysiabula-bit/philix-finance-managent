# 🗄️ **SQL Files Deployment Checklist**

## **📋 Critical Files (Must Run in Order)**

### **1. FOUNDATION: `schema.sql` (604 lines)**
- ✅ Creates `loan_system` database
- ✅ All 13 core tables (users, borrowers, loans, payments, collateral, etc.)
- ✅ Seed data (admin user, loan products, system settings)
- ✅ Views for reporting (portfolio, delinquency, PAR)
- ✅ Stored procedures for collateral management
- ✅ Performance indexes
- **🚨 RUN THIS FIRST**

### **2. AUTOMATION: `auto_loan_status_update.sql` (200 lines)**
- ✅ Payment processing triggers
- ✅ Auto-close loans when fully paid
- ✅ Real-time balance calculations
- ✅ Repayment schedule updates
- **🚨 RUN THIS SECOND**

### **3. TESTING: `test_loan_payment.sql` (65 lines)**
- ✅ Step-by-step testing workflow
- ✅ Verify automation works
- ✅ Expected results documentation
- **🚨 RUN THIS THIRD (for testing)**

## **🔧 Optional/Fix Files**

### **Data Fixes (if needed):**
- `fix_existing_loans.sql` (52 lines) - Fix loans that should be closed
- `fix_all_borrowers.sql` (34 lines) - System-wide payment status check
- `fix_status_column.sql` (8 lines) - Add 'rejected' status to applications

### **Alternative Installations:**
- `install_payment_triggers.sql` (123 lines) - Alternative trigger installation
- `tmp_rovodev_xampp_mysql_fix.sql` (127 lines) - XAMPP-specific fixes

### **Verification:**
- `tmp_rovodev_deployment_script.sql` (48 lines) - Deployment verification

## **🚀 Deployment Workflow**

### **Local XAMPP Testing:**
```sql
1. Run schema.sql                    -- Creates everything
2. Run auto_loan_status_update.sql  -- Adds automation  
3. Run test_loan_payment.sql        -- Verify it works
4. Optional: fix_existing_loans.sql -- If you have existing data
```

### **Cloud Deployment (Railway/Render):**
```sql
Option A: Import complete XAMPP backup
Option B: Run fresh setup (same order as local)
```

## **✅ Verification Steps**

After deployment, run these checks:
```sql
-- Check database exists
SHOW DATABASES LIKE 'loan_system';

-- Check all tables created
SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'loan_system';
-- Expected: 13+ tables

-- Check triggers installed
SHOW TRIGGERS;
-- Expected: trg_after_payment_insert, trg_after_payment_update

-- Check seed data
SELECT COUNT(*) FROM users WHERE role = 'admin';
-- Expected: 1

SELECT COUNT(*) FROM loan_products;
-- Expected: 4
```

## **🆘 Common Issues**

1. **"Table already exists"** → You ran schema.sql twice
2. **"Trigger already exists"** → Run `DROP TRIGGER IF EXISTS` first
3. **Loans not auto-closing** → Check if triggers exist with `SHOW TRIGGERS`
4. **No seed data** → schema.sql didn't complete successfully

## **🎯 Success Criteria**

- ✅ Database created with all tables
- ✅ Admin user exists (email: admin@loanapp.com)
- ✅ 4 loan products available
- ✅ Payment triggers working
- ✅ Test payment successfully closes loan
- ✅ Outstanding balances update automatically