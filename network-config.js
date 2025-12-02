#!/usr/bin/env node

/**
 * Network Configuration Manager for PHILIX Finance App
 * 
 * This script helps you quickly switch between different network configurations
 * when your local IP address changes (e.g., switching WiFi networks, using mobile hotspot, etc.)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Predefined network configurations
const NETWORK_CONFIGS = {
  localhost: {
    name: "Local Development (localhost only)",
    description: "Use when both frontend and backend are on the same machine",
    backend: {
      DB_HOST: "127.0.0.1",
      SERVER_IP: "localhost",
      FRONTEND_ORIGIN: "http://localhost:5173"
    },
    frontend: {
      VITE_API_URL: "http://localhost:3000/api"
    }
  },
  
  network1: {
    name: "Home WiFi Network",
    description: "Home network configuration - update IPs as needed",
    backend: {
      DB_HOST: "10.204.240.135",  // Update with your XAMPP server IP
      SERVER_IP: "10.204.240.135", // Update with your backend server IP
      FRONTEND_ORIGIN: "http://192.168.1.150:5173"
    },
    frontend: {
      VITE_API_URL: "http://192.168.1.150:3000/api"
    }
  },
  
  network2: {
    name: "Office WiFi Network", 
    description: "Office network configuration - update IPs as needed",
    backend: {
      DB_HOST: "192.168.122.1",    // Update with your XAMPP server IP
      SERVER_IP: "192.168.122.1",  // Update with your backend server IP  
      FRONTEND_ORIGIN: "http://10.1.143.199:5173"
    },
    frontend: {
      VITE_API_URL: "http://10.1.143.199:3000/api"
    }
  },

  mobile: {
    name: "Mobile Hotspot",
    description: "Mobile hotspot configuration - update IPs as needed", 
    backend: {
      DB_HOST: "192.168.137.100",  // Update with your XAMPP server IP
      SERVER_IP: "192.168.137.154", // Current IP from your .env
      FRONTEND_ORIGIN: "http://192.168.137.154:5173"
    },
    frontend: {
      VITE_API_URL: "http://192.168.137.154:3000/api"
    }
  },

  custom: {
    name: "Custom Configuration",
    description: "Manually enter IP addresses",
    backend: {
      DB_HOST: "",
      SERVER_IP: "",
      FRONTEND_ORIGIN: ""
    },
    frontend: {
      VITE_API_URL: ""
    }
  }
};

// Utility functions
function getCurrentIP() {
  try {
    // Try to get current IP address
    const interfaces = require('os').networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          return alias.address;
        }
      }
    }
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

function updateEnvFile(filePath, updates) {
  try {
    let content = '';
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
    }

    // Update or add each configuration
    Object.entries(updates).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const line = `${key}=${value}`;
      
      if (regex.test(content)) {
        content = content.replace(regex, line);
      } else {
        content += content.endsWith('\n') || content === '' ? '' : '\n';
        content += `${line}\n`;
      }
    });

    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function applyConfiguration(configName) {
  const config = NETWORK_CONFIGS[configName];
  if (!config) {
    console.error(`❌ Configuration '${configName}' not found`);
    return false;
  }

  console.log(`\n🔧 Applying configuration: ${config.name}`);
  console.log(`📝 Description: ${config.description}\n`);

  // Update backend .env
  const backendEnvPath = path.join(__dirname, 'backend', '.env');
  const backendUpdates = { ...config.backend };
  
  // Preserve existing values that aren't network-related
  if (fs.existsSync(backendEnvPath)) {
    const existingContent = fs.readFileSync(backendEnvPath, 'utf8');
    const preserveKeys = ['PORT', 'JWT_SECRET', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    
    preserveKeys.forEach(key => {
      const match = existingContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
      if (match && !backendUpdates[key]) {
        backendUpdates[key] = match[1];
      }
    });
  }

  updateEnvFile(backendEnvPath, backendUpdates);

  // Update frontend .env  
  const frontendEnvPath = path.join(__dirname, '.env');
  updateEnvFile(frontendEnvPath, config.frontend);

  console.log(`\n✅ Configuration '${config.name}' applied successfully!`);
  console.log(`\n📋 Applied settings:`);
  console.log(`   Backend server: ${config.backend.SERVER_IP || 'localhost'}`);
  console.log(`   Database host: ${config.backend.DB_HOST}`);
  console.log(`   Frontend API URL: ${config.frontend.VITE_API_URL}`);
  
  return true;
}

function listConfigurations() {
  console.log('\n📋 Available Network Configurations:\n');
  Object.entries(NETWORK_CONFIGS).forEach(([key, config]) => {
    console.log(`${key.padEnd(12)} - ${config.name}`);
    console.log(`${''.padEnd(15)}${config.description}`);
    console.log('');
  });
}

function showCurrentConfig() {
  console.log('\n📊 Current Configuration:\n');
  
  const currentIP = getCurrentIP();
  console.log(`🌐 Current IP Address: ${currentIP}\n`);

  // Read current backend config
  const backendEnvPath = path.join(__dirname, 'backend', '.env');
  if (fs.existsSync(backendEnvPath)) {
    console.log('🔧 Backend (.env):');
    const backendContent = fs.readFileSync(backendEnvPath, 'utf8');
    const backendLines = backendContent.split('\n').filter(line => 
      line.includes('DB_HOST=') || line.includes('SERVER_IP=') || line.includes('FRONTEND_ORIGIN=')
    );
    backendLines.forEach(line => console.log(`   ${line}`));
  }

  // Read current frontend config
  const frontendEnvPath = path.join(__dirname, '.env');
  if (fs.existsSync(frontendEnvPath)) {
    console.log('\n🎨 Frontend (.env):');
    const frontendContent = fs.readFileSync(frontendEnvPath, 'utf8');
    const frontendLines = frontendContent.split('\n').filter(line => 
      line.includes('VITE_API_URL=')
    );
    frontendLines.forEach(line => console.log(`   ${line}`));
  }
}

function customConfiguration() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function prompt(question) {
    return new Promise(resolve => {
      rl.question(question, resolve);
    });
  }

  (async () => {
    console.log('\n🔧 Custom Network Configuration Setup\n');
    
    const dbHost = await prompt('Enter XAMPP/Database Host IP: ');
    const serverIP = await prompt('Enter Backend Server IP: ');
    
    const customConfig = {
      name: "Custom Configuration",
      description: "User-defined configuration",
      backend: {
        DB_HOST: dbHost,
        SERVER_IP: serverIP,
        FRONTEND_ORIGIN: `http://${serverIP}:5173`
      },
      frontend: {
        VITE_API_URL: `http://${serverIP}:3000/api`
      }
    };

    // Apply the custom configuration
    console.log(`\n🔧 Applying custom configuration...`);
    
    const backendEnvPath = path.join(__dirname, 'backend', '.env');
    const backendUpdates = { ...customConfig.backend };
    
    // Preserve existing values
    if (fs.existsSync(backendEnvPath)) {
      const existingContent = fs.readFileSync(backendEnvPath, 'utf8');
      const preserveKeys = ['PORT', 'JWT_SECRET', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
      
      preserveKeys.forEach(key => {
        const match = existingContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
        if (match && !backendUpdates[key]) {
          backendUpdates[key] = match[1];
        }
      });
    }

    updateEnvFile(backendEnvPath, backendUpdates);
    updateEnvFile(path.join(__dirname, '.env'), customConfig.frontend);

    console.log(`\n✅ Custom configuration applied successfully!`);
    rl.close();
  })();
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🌐 PHILIX Finance - Network Configuration Manager\n');

  if (!command) {
    console.log('Usage: node network-config.js <command> [options]\n');
    console.log('Commands:');
    console.log('  list                    - Show available configurations');
    console.log('  current                 - Show current configuration');
    console.log('  apply <config-name>     - Apply a specific configuration');
    console.log('  custom                  - Setup custom configuration');
    console.log('  help                    - Show this help\n');
    console.log('Examples:');
    console.log('  node network-config.js list');
    console.log('  node network-config.js apply mobile');
    console.log('  node network-config.js current');
    return;
  }

  switch (command) {
    case 'list':
      listConfigurations();
      break;
    
    case 'current':
      showCurrentConfig();
      break;
    
    case 'apply':
      const configName = args[1];
      if (!configName) {
        console.error('❌ Please specify a configuration name');
        console.log('Run "node network-config.js list" to see available configurations');
        return;
      }
      if (configName === 'custom') {
        customConfiguration();
      } else {
        applyConfiguration(configName);
      }
      break;
    
    case 'custom':
      customConfiguration();
      break;
    
    case 'help':
    default:
      main();
      break;
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { NETWORK_CONFIGS, applyConfiguration, getCurrentIP };
