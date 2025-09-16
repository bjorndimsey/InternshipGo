// Startup script for the backend server
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting InternshipGo Backend Server...\n');

// Check if node_modules exists, if not install dependencies
const fs = require('fs');
const packageJsonPath = path.join(__dirname, 'package.json');
const nodeModulesPath = path.join(__dirname, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  const install = spawn('npm', ['install'], { 
    cwd: __dirname, 
    stdio: 'inherit',
    shell: true 
  });
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dependencies installed successfully\n');
      startServer();
    } else {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  startServer();
}

function startServer() {
  console.log('🔧 Starting server...');
  const server = spawn('node', ['server.js'], { 
    cwd: __dirname, 
    stdio: 'inherit',
    shell: true 
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.kill('SIGINT');
    process.exit(0);
  });
}
