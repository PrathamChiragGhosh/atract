const http = require('http');

const PORT = process.env.PORT || 5001;

// Test if server is running
const testServer = () => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: PORT,
            path: '/admin/smart-filter/upload',
            method: 'GET',
            timeout: 3000
        }, (res) => {
            console.log(`✅ Server is running on port ${PORT}`);
            console.log(`   Status: ${res.statusCode}`);
            resolve(true);
        });

        req.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                console.error(`❌ Server is NOT running on port ${PORT}`);
                console.error(`   Error: Connection refused`);
                console.error(`\n💡 Solution: Start the server with:`);
                console.error(`   cd backend`);
                console.error(`   npm start`);
            } else {
                console.error(`❌ Error: ${err.message}`);
            }
            reject(err);
        });

        req.on('timeout', () => {
            req.destroy();
            console.error(`❌ Connection timeout`);
            reject(new Error('Timeout'));
        });

        req.end();
    });
};

testServer().catch(() => {
    process.exit(1);
});

