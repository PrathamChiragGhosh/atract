const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const connectDB = require("./config/db.js");
const errorHandler = require("./middleware/errorMiddleware.js");

// Import Routes
const jobSeekerRoutes = require("./routes/jobSeekerRoutes.js");
const employerRoutes = require("./routes/employerRoutes.js");
const jobRoutes = require("./routes/jobRoutes.js");
const voiceAgentRoutes = require("./routes/voiceAgentRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const genieRoutes = require("./routes/genieRoutes.js");
const blogRoutes = require("./routes/blogRoutes.js");
const publishRoutes = require("./routes/publishRoutes.js");
const blogPublisherRoutes = require("./routes/blogPublisherRoutes.js");
const referralStatsRoutes = require("./routes/referralStatsRoutes.js");
const contactRoutes = require("./routes/contactRoutes.js");
const promptContactRoutes = require("./routes/promptContactRoutes.js");
const promptConsultationRoutes = require("./routes/promptConsultationRoutes.js");
// Admin Client & Service Job Routes
const clientRoutes = require("./routes/clientRoutes.js");
const serviceJobRoutes = require("./routes/serviceJobRoutes.js");
// Admin Smart Filter Routes
const smartFilterRoutes = require("./routes/smartFilterRoutes.js");
// PDF Module Routes
const pdfRoutes = require("./routes/pdfRoutes.js");
const pdfSubscriptionRoutes = require("./routes/pdfSubscriptionRoutes.js");
const pdfUserRoutes = require("./routes/pdfUserRoutes.js");

dotenv.config();
connectDB().then(() => {
  // Initialize auto-publish cron service after DB connection
  const { initAutoPublishCron } = require('./services/cronService.js');
  initAutoPublishCron().catch((err) => {
    console.error('Failed to initialize auto-publish cron on startup:', err.message);
  });

  // Initialize job alert cron service after DB connection
  const { initJobAlertCron } = require('./services/jobAlertCronService.js');
  initJobAlertCron();

  // Initialize referral stats email cron service after DB connection
  const { initReferralStatsEmailCron } = require('./services/referralStatsEmailCronService.js');
  initReferralStatsEmailCron();
});

const app = express();

// ---------------- MORGAN LOGGING ----------------
app.use(morgan("dev"));

// ---------------- CORS CONFIG ----------------
const corsOptions = {
    origin: [
        process.env.CORS_1,
        process.env.CORS_2,
process.env.CORS_3,
        'http://localhost:3000', // Atract frontend
        'http://localhost:3010', // PDF Module frontend (if still needed)
    ].filter(Boolean),
    credentials: true,
};

app.use(cors(corsOptions));

// ---------------- BODY PARSING ----------------
// Increased limits for multiple file uploads (smart filter folder upload)
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// ---------------- STATIC FILE SERVING (PDF Module) ----------------
// Create PDF upload and compressed directories if they don't exist
const pdfUploadsDir = path.join(__dirname, "../uploads/pdf");
const pdfCompressedDir = path.join(__dirname, "../compressed/pdf");
const pdfTempDir = path.join(__dirname, "../temp/pdf");
const pythonDir = path.join(__dirname, "../python");

[pdfUploadsDir, pdfCompressedDir, pdfTempDir, pythonDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve static files for PDF module
app.use("/uploads/pdf", express.static(pdfUploadsDir));
app.use("/compressed/pdf", express.static(pdfCompressedDir));
// Serve static files for Smart Filter
const smartFilterResultsDir = path.join(__dirname, "../uploads/smart-filter/results");
if (!fs.existsSync(smartFilterResultsDir)) {
    fs.mkdirSync(smartFilterResultsDir, { recursive: true });
}
app.use("/uploads/smart-filter/results", express.static(smartFilterResultsDir));

// ---------------- ROUTES ----------------
app.use("/jobseeker", jobSeekerRoutes);
app.use("/employer", employerRoutes);
app.use("/job", jobRoutes);
app.use("/voice-agent", voiceAgentRoutes);
app.use("/admin", adminRoutes);
app.use("/admin/clients", clientRoutes);
app.use("/admin/service-jobs", serviceJobRoutes);
app.use("/admin/smart-filter", smartFilterRoutes);
app.use("/genie", genieRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/publish-settings', publishRoutes);
app.use('/api/blog-publisher', blogPublisherRoutes);
app.use('/api/referral-stats', referralStatsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/prompt-contact', promptContactRoutes);
app.use('/api/prompt-consultation', promptConsultationRoutes);
// ---------------- PDF MODULE ROUTES ----------------
app.use("/api/pdf", pdfRoutes);
app.use("/api/subscription", pdfSubscriptionRoutes);
app.use("/api/user", pdfUserRoutes);
// ---------------- AI ROUTES (Groq) ----------------
const aiRoutes = require("./routes/aiRoutes.js");
app.use("/api/ai", aiRoutes);
// ---------------- CANDIDATE FILTER ROUTES ----------------
const candidateFilterRoutes = require("./routes/candidateFilterRoutes.js");
app.use("/api/candidates", candidateFilterRoutes);

// ---------------- ERROR HANDLER ----------------
app.use(errorHandler);

module.exports = app;
