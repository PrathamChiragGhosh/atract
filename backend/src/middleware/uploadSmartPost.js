const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory for smart post JD files
const uploadsDir = path.join(__dirname, "../../uploads/smart-post");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create employer-specific folder
        const employerId = req.userId || "temp";
        const employerDir = path.join(uploadsDir, employerId);
        
        if (!fs.existsSync(employerDir)) {
            fs.mkdirSync(employerDir, { recursive: true });
        }
        
        cb(null, employerDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `jd-${uniqueSuffix}-${sanitizedName}`;
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
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

module.exports = upload;

