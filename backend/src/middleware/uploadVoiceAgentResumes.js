const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory for voice agent resumes
const uploadsDir = path.join(__dirname, "../../uploads/voice-agent/resumes");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create session-specific folder
        const sessionId = req.body.sessionId || req.userId || "temp";
        const sessionDir = path.join(uploadsDir, sessionId);
        
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        
        cb(null, sessionDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `resume-${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Accept only PDF, DOC, and DOCX files
    const allowedMimes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only PDF, DOC, and DOCX files are allowed."), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Middleware for multiple resume uploads
const uploadVoiceAgentResumes = upload.array("resumes", 50); // Max 50 resumes

module.exports = { uploadVoiceAgentResumes };

