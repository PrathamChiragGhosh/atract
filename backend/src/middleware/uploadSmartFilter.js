const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory for Smart Filter if it doesn't exist
const uploadsDir = path.join(__dirname, "../../uploads/smart-filter");
const resultsDir = path.join(__dirname, "../../uploads/smart-filter/results");

[uploadsDir, resultsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `smart-filter-${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

// File filter - accepts Excel, Word, PDF, and TXT
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        // Excel
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
        // Word
        "application/msword", // .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        // PDF
        "application/pdf",
        // TXT
        "text/plain",
        // Allow empty mime types (sometimes browser doesn't send mime type for folder uploads)
        ""
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.doc', '.docx', '.pdf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Check by extension first (more reliable for folder uploads)
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.originalname}. Only Excel (.xlsx, .xls), Word (.doc, .docx), PDF (.pdf), and TXT (.txt) files are allowed.`), false);
    }
};

// Configure multer with better error handling for multiple files
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB per file limit
        files: 100, // Maximum number of files
        fieldSize: 100 * 1024 * 1024 // 100MB total field size
    }
});

// Enhanced upload multiple with better error handling
const uploadMultiple = (req, res, next) => {
    const uploadHandler = upload.array('files', 100);
    
    uploadHandler(req, res, (err) => {
        if (err) {
            // Handle multer errors
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: `File too large: ${err.field}. Maximum file size is 50MB.`
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        message: `Too many files. Maximum 100 files allowed.`
                    });
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({
                        success: false,
                        message: `Unexpected file field. Use 'files' field name for multiple files.`
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: `File upload error: ${err.message}`
                });
            }
            
            // Handle other errors
            return res.status(400).json({
                success: false,
                message: `File upload error: ${err.message}`
            });
        }
        
        // Verify files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded. Please select at least one file."
            });
        }
        
        console.log(`✓ Successfully uploaded ${req.files.length} file(s)`);
        next();
    });
};

module.exports = {
    upload: upload.single('file'),
    uploadMultiple: uploadMultiple,
    uploadsDir,
    resultsDir
};

