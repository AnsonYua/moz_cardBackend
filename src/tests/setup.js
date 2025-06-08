const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

let serverProcess;

async function waitForServer() {
    const maxAttempts = 30;
    const delay = 1000;
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await axios.get('http://localhost:3000/api/game/health');
            if (response.status === 200) {
                console.log('Server is ready!');
                return true;
            }
        } catch (error) {
            console.log(`Waiting for server... attempt ${i + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Server failed to start within timeout');
}

module.exports = async () => {
    console.log('Starting server...');
    serverProcess = spawn('node', ['server.js'], {
        stdio: 'inherit',
        detached: true
    });

    // Handle server process errors
    serverProcess.on('error', (error) => {
        console.error('Failed to start server process:', error);
        throw error;
    });

    // Save the server PID for teardown
    fs.writeFileSync(path.join(__dirname, 'server.pid'), String(serverProcess.pid));
    
    try {
        await waitForServer();
    } catch (error) {
        console.error('Server startup failed:', error);
        // Clean up the process if it exists
        if (serverProcess) {
            serverProcess.kill();
        }
        throw error;
    }
};

// For teardown.js
module.exports.stopServer = async () => {
    const pidPath = path.join(__dirname, 'server.pid');
    if (fs.existsSync(pidPath)) {
        const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'), 10);
        try {
            process.kill(pid);
            console.log('Server stopped successfully');
        } catch (e) {
            console.error('Error stopping server:', e);
        }
        fs.unlinkSync(pidPath);
    }
}; 