# 🧪 Local Testing Guide - Automatic Loan Status Updates

## ✅ What Was Implemented

### **Admin Dashboard Enhancements:**
1. ✅ New "All Loans" section showing active and paid loans
2. ✅ Filter by status: All / Active / Paid/Closed / Defaulted
3. ✅ Real-time display of:
   - Borrower details
   - Outstanding balance (shows K 0 for paid loans)
   - Payment count
   - Total amount paid
   - Loan status (✅ PAID badge for closed loans)
4. ✅ Summary statistics: Active loans, Paid loans, Total disbursed, Total collected

### **Backend Enhancements:**
1. ✅ New endpoint: `GET /api/admin/loans` - Returns all loans with payment info
2. ✅ Automatic status updates via database triggers
3. ✅ Enhanced payment tracking

---

## 🚀 Local Testing Steps

### **Step 1: Install Database Triggers (5 minutes)**

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Select your `loan_system` database
3. Click **SQL** tab
4. Open the file `auto_loan_status_update.sql` in a text editor
5. Copy ALL content
6. Paste into phpMyAdmin SQL tab
7. Click **Go**
8. ✅ You should see: "Automatic loan status update system installed successfully!"

---

### **Step 2: Start Your Servers**

#### Backend:
```bash
cd backend
npm start
```
Server should start on: `http://localhost:3000`

#### Frontend:
```bash
# In the root directory
npm run dev
```
Frontend should start on: `http://localhost:5173`

---

### **Step 3: Test the New Admin Dashboard**

1. **Login as Admin**
   - Go to: `http://localhost:5173`
   - Login with your admin credentials

2. **Check the New "All Loans" Section**
   - Scroll down past "Loan Applications"
   - You'll see a new section: **"All Loans"**
   - This shows ALL loans (active and paid)

3. **Test the Filter**
   - Try the dropdown: "All Loans" / "Active Loans" / "Paid/Closed Loans"
   - Each filter shows different loan statuses

---

### **Step 4: Test Automatic Status Update (The Magic! ✨)**

#### **Scenario A: Test with Existing Loan**

```sql
-- 1. Find an active loan in phpMyAdmin
SELECT id, borrower_id, principal_amount, outstanding_balance, status 
FROM loans 
WHERE status = 'active' 
LIMIT 1;

-- Let's say you found: loan_id=1, borrower_id=2, outstanding_balance=500

-- 2. Record a payment to FULLY PAY the loan
INSERT INTO payments (loan_id, borrower_id, amount, payment_method, status, completed_at, created_at)
VALUES (1, 2, 500.00, 'mobile_money', 'completed', NOW(), NOW());

-- 3. Check if loan status changed automatically
SELECT id, outstanding_balance, status, updated_at 
FROM loans 
WHERE id = 1;

-- Expected Result:
-- status = 'closed' ✅
-- outstanding_balance = 0 ✅
```

#### **Scenario B: Test via Admin Dashboard**

1. **Approve a new loan application**
   - In admin dashboard, approve a pending application
   - Loan becomes active automatically

2. **Simulate borrower payment** (using phpMyAdmin for now)
   ```sql
   -- Get the loan details
   SELECT id, borrower_id, outstanding_balance FROM loans WHERE status = 'active' LIMIT 1;
   
   -- Make a payment (replace IDs)
   INSERT INTO payments (loan_id, borrower_id, amount, payment_method, status, completed_at, created_at)
   VALUES (1, 2, 500.00, 'mobile_money', 'completed', NOW(), NOW());
   ```

3. **Refresh Admin Dashboard**
   - Click the 🔄 Refresh button in the "All Loans" section
   - You should see:
     - Outstanding balance changed to K 0
     - Status badge shows "✅ PAID"
     - Row background is green
     - "Paid Loans" counter increased

---

### **Step 5: Verify Summary Statistics**

After making a loan payment, check the bottom of "All Loans" section:

- **Active Loans**: Should decrease by 1
- **Paid Loans**: Should increase by 1
- **Total Collected**: Should increase by payment amount

---

## 🎯 What to Look For (Success Indicators)

### **In Admin Dashboard:**
✅ New "All Loans" section appears below "Loan Applications"
✅ Filter dropdown works (All / Active / Closed / Defaulted)
✅ Paid loans show with green background
✅ Status badge shows "✅ PAID" for closed loans
✅ Outstanding balance shows "K 0" for paid loans
✅ Summary stats update correctly

### **In Database:**
✅ Triggers exist: `SHOW TRIGGERS FROM loan_system;`
✅ Loan status changes to 'closed' automatically
✅ Outstanding balance becomes 0
✅ Repayment schedules marked as 'paid'

---

## 🐛 Troubleshooting

### **Issue: "All Loans" section not showing**

**Solution:**
```javascript
// Check browser console (F12) for errors
// Look for:
// - CORS errors
// - 401/403 errors (authentication)
// - Network errors
```

### **Issue: Loan status not updating automatically**

**Solution:**
```sql
-- 1. Check if triggers are installed
SHOW TRIGGERS FROM loan_system WHERE `Trigger` LIKE 'trg_after_payment%';

-- Should show:
-- trg_after_payment_insert
-- trg_after_payment_update

-- 2. If missing, re-run auto_loan_status_update.sql

-- 3. Manually trigger update for existing loans
CALL recalculate_all_loan_statuses();
```

### **Issue: Backend error 500 on /api/admin/loans**

**Solution:**
```bash
# Check backend console for errors
# Common issue: MySQL connection

# Restart backend:
cd backend
npm start
```

### **Issue: Filter not working**

**Solution:**
```javascript
// Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
// Or hard refresh the page
```

---

## 📸 Expected Visual Results

### **Before Payment:**
```
Loan #1: John Doe
Outstanding: K 500
Status: 🟢 Active
Background: Blue-ish
```

### **After Full Payment:**
```
Loan #1: John Doe
Outstanding: K 0 (in green)
Status: ✅ PAID
Background: Green
Total Paid: K 500 ✓ Fully Paid
```

---

## 🧪 Complete Test Scenario

```sql
-- STEP 1: Create a test loan (if needed)
-- Approve an application in admin dashboard first

-- STEP 2: Check initial state
SELECT 
  l.id,
  l.principal_amount,
  l.outstanding_balance,
  l.status,
  COUNT(p.id) as payment_count
FROM loans l
LEFT JOIN payments p ON l.id = p.loan_id
WHERE l.id = 1
GROUP BY l.id;

-- STEP 3: Make a partial payment
INSERT INTO payments (loan_id, borrower_id, amount, payment_method, status, completed_at, created_at)
VALUES (1, 2, 200.00, 'mobile_money', 'completed', NOW(), NOW());

-- Check: Should still be 'active' but balance reduced
SELECT id, outstanding_balance, status FROM loans WHERE id = 1;
-- Expected: outstanding_balance = 300, status = 'active'

-- STEP 4: Make final payment
INSERT INTO payments (loan_id, borrower_id, amount, payment_method, status, completed_at, created_at)
VALUES (1, 2, 300.00, 'mobile_money', 'completed', NOW(), NOW());

-- Check: Should be 'closed' with 0 balance
SELECT id, outstanding_balance, status FROM loans WHERE id = 1;
-- Expected: outstanding_balance = 0, status = 'closed' ✅

-- STEP 5: Verify in admin dashboard
-- Refresh page and check "All Loans" section
```

---

## ✅ Checklist

- [ ] Backend server running (localhost:3000)
- [ ] Frontend server running (localhost:5173)
- [ ] Database triggers installed (ran auto_loan_status_update.sql)
- [ ] Can login as admin
- [ ] "All Loans" section visible in admin dashboard
- [ ] Filter dropdown works
- [ ] Can see active loans
- [ ] Made test payment in database
- [ ] Loan status changed to 'closed' automatically
- [ ] Outstanding balance shows K 0
- [ ] Status badge shows "✅ PAID"
- [ ] Summary stats are correct
- [ ] Refresh button works

---

## 🎉 Success Criteria

**You'll know it's working when:**

1. ✅ Admin dashboard shows new "All Loans" section
2. ✅ When a borrower pays fully, loan status automatically changes to "closed"
3. ✅ Outstanding balance becomes K 0
4. ✅ Admin can filter by: All / Active / Paid / Defaulted
5. ✅ Paid loans show with green background and ✅ PAID badge
6. ✅ Summary shows correct counts of active vs paid loans
7. ✅ No manual status updates needed!

---

## 🚀 Next: Deploy to Cloud

Once local testing is successful, you're ready to deploy!

See: `DEPLOYMENT_GUIDE.md` for cloud deployment instructions.

---

**Questions during testing?**

1. Check browser console (F12) for frontend errors
2. Check terminal/console where backend is running for errors
3. Check phpMyAdmin for database changes
4. Use `SHOW TRIGGERS` to verify triggers are installed

**Everything working?** 🎉 You're ready to deploy to production!
