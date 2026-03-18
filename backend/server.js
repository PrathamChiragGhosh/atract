// Load environment variables
require("dotenv").config();
const path = require("path");

// Load .env from backend directory
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = require("./src/app.js");
const http = require("http");

const DEFAULT_PORT = Number(process.env.PORT || process.env.DEFAULT_PORT) || 5001;
const HOST = process.env.HOST || "0.0.0.0";

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io (optional - only if socketServer exists)
try {
  const { initializeSocket } = require("./src/socket/socketServer.js");
  const corsOptions = {
    origin: [process.env.CORS_1, process.env.CORS_2, process.env.CORS_3].filter(Boolean),
    credentials: true,
  };
  initializeSocket(server, corsOptions);
  console.log("✅ Socket.io server initialized");
} catch (err) {
  console.log("⚠️  Socket.io not initialized (module may not exist):", err.message);
}

// Start server with automatic port fallback if the chosen port is in use
let currentPort = DEFAULT_PORT;
const MAX_ATTEMPTS = 10;

function startServer(port, attemptsLeft = MAX_ATTEMPTS) {
  server.listen(port, HOST, () => {
    console.log(`✅ Server running on http://${HOST}:${port}`);
    console.log(`✅ Server accessible at http://localhost:${port}`);
    console.log(`📡 Ready to accept connections from frontend`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
      if (attemptsLeft > 0) {
        const nextPort = port + 1;
        console.log(`   Trying port ${nextPort} (${attemptsLeft - 1} attempts left)`);
        // Small delay before retrying to avoid tight loop
        setTimeout(() => startServer(nextPort, attemptsLeft - 1), 200);
      } else {
        console.error('   No available ports found after multiple attempts. Exiting.');
        process.exit(1);
      }
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
}

startServer(currentPort);
