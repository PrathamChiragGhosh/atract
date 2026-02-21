const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/candidate-files');
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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = `candidate-${uniqueSuffix}${ext}`;
        cb(null, filename);
    }
});

// File filter - accept PDF, DOC, DOCX, TXT, XLS, XLSX
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx'];

    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, XLS, XLSX`), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 50 // Maximum 50 files
    }
});

// Export middleware function for multiple file uploads
// Frontend sends files with field name 'candidateFiles'
const uploadCandidateFiles = upload.array('candidateFiles', 50);

// Also create a version that accepts 'files' for backward compatibility
const uploadFiles = upload.array('files', 50);

module.exports = { 
    uploadCandidateFiles, // For frontend (uses 'candidateFiles' field)
    uploadFiles, // For API compatibility (uses 'files' field)
    upload // Also export the multer instance for direct use
};
