// Load environment variables
require("dotenv").config();
const path = require("path");

// Load .env from backend directory
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const app = require("./src/app.js");
const http = require("http");

const PORT = process.env.PORT || 5002;
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

// Start server
server.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`✅ Server accessible at http://localhost:${PORT}`);
  console.log(`📡 Ready to accept connections from frontend`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error(`   Please stop the other process or use a different port`);
  } else {
    console.error(`❌ Server error:`, err);
  }
  process.exit(1);
});
