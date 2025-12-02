# Network Access Guide

## Server Network Configuration

- **IPv4 Address:** `10.1.143.199`
- **Subnet Mask:** `255.255.248.0` (/21)
- **Default Gateway:** `10.1.136.1`
- **DNS Suffix:** `GOV.ZM`
- **Network Range:** `10.1.136.0` - `10.1.143.255`

## Application Access URLs

### Local Access (Same Machine)
- **Backend API:** `http://localhost:3000/api`
- **Frontend:** `http://localhost:5173`
- **Debug Config:** `http://localhost:3000/api/debug/config`
- **Health Check:** `http://localhost:3000/api/health`

### Network Access (Other Devices)
- **Backend API:** `http://10.1.143.199:3000/api`
- **Frontend:** `http://10.1.143.199:5173`
- **Debug Config:** `http://10.1.143.199:3000/api/debug/config`
- **Health Check:** `http://10.1.143.199:3000/api/health`

## XAMPP MySQL Configuration

- **Host:** `127.0.0.1` (localhost)
- **Port:** `3306`
- **Database:** `loan_system`
- **User:** `root`

**Note:** MySQL is configured for local access only. If you need remote database access, you'll need to:
1. Change `DB_HOST` to `10.1.143.199` in `backend/.env`
2. Configure MySQL to allow remote connections
3. Grant privileges to the root user from your IP range

## CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://10.1.143.199:5173`
- `http://10.1.143.199:3000`

## Switching Between Local and Network Access

### For Frontend (Choose ONE):

**Option 1 - Local Access Only:**
```env
# .env
VITE_API_URL=http://localhost:3000/api
```

**Option 2 - Network Access:**
```env
# .env
VITE_API_URL=http://10.1.143.199:3000/api
```

After changing `.env`, restart your Vite dev server:
```bash
npm run dev
```

## Testing the Configuration

1. **Check backend is running:**
   ```
   http://localhost:3000/api/health
   or
   http://10.1.143.199:3000/api/health
   ```
   Should return: `{"ok": true}`

2. **Check database connection:**
   ```
   http://localhost:3000/api/db/health
   or
   http://10.1.143.199:3000/api/db/health
   ```
   Should return: `{"db": "ok"}`

3. **View configuration:**
   ```
   http://localhost:3000/api/debug/config
   or
   http://10.1.143.199:3000/api/debug/config
   ```
   Should show all allowed origins and server IP

## Accessing from Other Devices

Any device on your network (IP range: 10.1.136.0 - 10.1.143.255) can access your application:

1. **Ensure Windows Firewall allows connections** on ports 3000 and 5173
2. **Access the frontend** at: `http://10.1.143.199:5173`
3. **The frontend will automatically connect** to the backend API

## Firewall Configuration (Windows)

If you can't access from other devices, you may need to allow ports:

```powershell
# Allow port 3000 (Backend)
netsh advfirewall firewall add rule name="Loan System Backend" dir=in action=allow protocol=TCP localport=3000

# Allow port 5173 (Frontend)
netsh advfirewall firewall add rule name="Loan System Frontend" dir=in action=allow protocol=TCP localport=5173

# Allow port 3306 (MySQL - only if needed for remote access)
netsh advfirewall firewall add rule name="MySQL XAMPP" dir=in action=allow protocol=TCP localport=3306
```

## Troubleshooting

### Cannot connect from other devices:
1. Check Windows Firewall settings
2. Verify XAMPP MySQL is running
3. Ensure backend server is running on port 3000
4. Test with: `http://10.1.143.199:3000/api/health`

### CORS errors:
1. Check that the origin is in the allowed list
2. View current config at: `http://10.1.143.199:3000/api/debug/config`
3. Restart the backend server after any `.env` changes

### Database connection errors:
1. Verify XAMPP MySQL is running
2. Check credentials in `backend/.env`
3. Test database health: `http://localhost:3000/api/db/health`
4. Check MySQL logs in XAMPP control panel

## Security Notes

⚠️ **Important for Production:**
- Remove or restrict access to `/api/debug/config` endpoint
- Use strong `JWT_SECRET` (not "dev-secret-change")
- Configure proper MySQL passwords
- Use HTTPS instead of HTTP
- Implement rate limiting
- Restrict CORS origins to specific domains
