const app = require("./src/app.js");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const { initializeSocket } = require("./src/socket/socketServer.js");

// Load .env file from backend directory
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

// Debug: Log if Stripe key is loaded
if (process.env.STRIPE_SECRET_KEY) {
  console.log('✅ STRIPE_SECRET_KEY loaded from .env');
} else {
  console.warn('⚠️  STRIPE_SECRET_KEY not found in environment variables');
}

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "0.0.0.0";

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const corsOptions = {
    origin: [process.env.CORS_1, process.env.CORS_2, process.env.CORS_3].filter(Boolean),
    credentials: true,
};
initializeSocket(server, corsOptions);

// Enhanced server listening with error handling
server.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`✅ Server accessible at http://localhost:${PORT}`);
  console.log(`✅ Socket.io server initialized`);
  console.log(`📡 Ready to accept connections`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error(`   Please stop the other process or use a different port`);
  } else {
    console.error(`❌ Server error:`, err);
  }
  process.exit(1);
});
