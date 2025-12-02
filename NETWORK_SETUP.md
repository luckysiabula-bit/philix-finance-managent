# Network Configuration Setup Guide

This guide helps you easily switch between different network configurations when your local IP changes (WiFi networks, mobile hotspot, etc.).

## Quick Start

### Windows Users:
```bash
# Show available configurations
switch-network.bat list

# Switch to mobile hotspot configuration  
switch-network.bat mobile_hotspot

# Switch to localhost (when on same machine)
switch-network.bat localhost

# Show current configuration
switch-network.bat current
```

### Linux/Mac Users:
```bash
# Make script executable first
chmod +x switch-network.sh

# Show available configurations
./switch-network.sh list

# Switch to mobile hotspot configuration
./switch-network.sh mobile_hotspot

# Switch to localhost (when on same machine)
./switch-network.sh localhost

# Show current configuration
./switch-network.sh current
```

## How It Works

The system uses three main files:

1. **`ip-config.json`** - Simple JSON file where you define your network configurations
2. **`network-config.js`** - Node.js script that updates your .env files
3. **`switch-network.bat/.sh`** - Easy-to-use batch/shell scripts

## Setting Up Your Network IPs

1. **Edit `ip-config.json`** to add your actual IP addresses:

```json
{
  "networks": {
    "home_wifi": {
      "name": "Home WiFi",
      "description": "My home network setup",
      "xampp_ip": "192.168.1.100",    ← Change this to your XAMPP server IP
      "server_ip": "192.168.1.150"     ← Change this to your Node.js server IP
    },
    "office_wifi": {
      "name": "Office WiFi", 
      "description": "My office network setup",
      "xampp_ip": "10.1.143.100",      ← Change this to your XAMPP server IP
      "server_ip": "10.1.143.199"      ← Change this to your Node.js server IP
    }
  }
}
```

2. **Find Your IP Address:**
   - Windows: Open Command Prompt and type `ipconfig`
   - Mac/Linux: Open Terminal and type `ifconfig` or `ip addr`
   - Look for your network adapter (WiFi/Ethernet) and find the IPv4 address

## Common Scenarios

### Scenario 1: Both XAMPP and Node.js on Same Computer
```bash
# Use localhost configuration
switch-network.bat localhost
```

### Scenario 2: XAMPP on Different Computer in Network
1. Find the IP of the computer running XAMPP
2. Update the `xampp_ip` in `ip-config.json` for your network
3. Switch to that network configuration

### Scenario 3: Mobile Hotspot
```bash
# Update mobile_hotspot IPs in ip-config.json first, then:
switch-network.bat mobile_hotspot
```

### Scenario 4: New Network (Custom IPs)
```bash
# This will prompt you for IP addresses
switch-network.bat custom
```

## After Switching Networks

**Always restart your servers after switching configurations:**

1. **Stop Backend Server:** Press `Ctrl+C` in your backend terminal
2. **Stop Frontend Server:** Press `Ctrl+C` in your frontend terminal  
3. **Restart Backend:**
   ```bash
   cd backend
   npm run dev
   ```
4. **Restart Frontend:**
   ```bash
   npm run dev
   ```

## Troubleshooting

### Problem: "Cannot connect to database"
- Check that XAMPP is running on the correct computer
- Verify the `xampp_ip` in your configuration is correct
- Make sure MySQL is started in XAMPP

### Problem: "Cannot connect to backend API"
- Check that your Node.js backend server is running
- Verify the `server_ip` is correct in your configuration
- Make sure the backend server is accessible from your frontend computer

### Problem: "CORS errors"
- The backend `.env` file should have the correct `FRONTEND_ORIGIN`
- This gets updated automatically when you switch configurations

### Problem: Script not working
- Make sure you have Node.js installed
- Run `npm install` in the project root if needed
- On Linux/Mac, make sure script is executable: `chmod +x switch-network.sh`

## Manual Configuration (if scripts don't work)

You can manually edit these files:

### Backend `.env` file (backend/.env):
```env
PORT=3000
JWT_SECRET=dev-secret-change
DB_HOST=192.168.1.100          ← Your XAMPP IP
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=loan_system
FRONTEND_ORIGIN=http://192.168.1.150:5173  ← Your frontend URL
SERVER_IP=192.168.1.150        ← Your backend server IP
```

### Frontend `.env` file (.env):
```env
VITE_API_URL=http://192.168.1.150:3000/api  ← Your backend API URL
```

## Tips

1. **Save your configurations:** Once you figure out the IPs for a network, save them in `ip-config.json` so you can quickly switch back
2. **Use descriptive names:** Give your networks meaningful names in the JSON file
3. **Test connectivity:** After switching, test that you can access both the database and API
4. **Document your setup:** Write down which computer runs what (XAMPP, Node.js, frontend)

## Example Network Setups

### Setup 1: Everything on one laptop
```json
"localhost": {
  "xampp_ip": "127.0.0.1",
  "server_ip": "localhost"
}
```

### Setup 2: XAMPP on desktop, Node.js on laptop
```json
"home_network": {
  "xampp_ip": "192.168.1.100",    // Desktop IP
  "server_ip": "192.168.1.150"    // Laptop IP  
}
```

### Setup 3: All services on desktop, accessing from laptop
```json
"remote_desktop": {
  "xampp_ip": "192.168.1.100",    // Desktop IP
  "server_ip": "192.168.1.100"    // Same desktop IP
}
```