const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory for Smart Select if it doesn't exist
const uploadsDir = path.join(__dirname, "../../uploads/smart-select");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `${uniqueSuffix}${ext}`;
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

// Middleware for multiple resume files and optional JD file
const uploadSmartSelectFiles = upload.fields([
    { name: 'resumes', maxCount: 50 },
    { name: 'jdFile', maxCount: 1 }
]);

module.exports = { uploadSmartSelectFiles };

