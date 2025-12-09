# 🔑 Admin Secret Key - Quick Reference

## 📌 **Your Current Admin Secret Key**

```
lucky_admin_secret
```

---

## ⚡ **How to Create an Admin (Quick Steps)**

1. **Login** to the admin dashboard
2. Click **"Create New Admin"** button
3. **Fill in** the admin details:
   - Email
   - Password
   - Full Name
   - Phone Number
4. When prompted **"🔐 Enter admin creation secret:"**, type:
   ```
   lucky_admin_secret
   ```
5. Click **"Create Admin"**

---

## 🔒 **Security Note**

⚠️ **For Production:** Change `lucky_admin_secret` to a more secure key!

**Where to change it:**
- File: `backend/.env.railway`
- Variable: `ADMIN_CREATION_SECRET`
- Railway Dashboard: Variables section

---

## 📂 **Configuration Files**

| File | Purpose | Current Value |
|------|---------|---------------|
| `backend/.env.railway` | Production config | `lucky_admin_secret` |
| `backend/.env.example` | Template | `replace_with_secure_secret` |

---

## ✅ **Files Updated**

- ✅ `backend/.env.example` - Added `ADMIN_CREATION_SECRET` line
- ✅ Created comprehensive guide: `ADMIN_SECRET_KEY_GUIDE.md`
- ✅ Created this quick reference

---

**Need more details?** See `ADMIN_SECRET_KEY_GUIDE.md` for complete documentation.
