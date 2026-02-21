const express = require("express");
const smartFilterController = require("../controllers/smartFilterController.js");
const smartFilterControllerV2 = require("../controllers/smartFilterControllerV2.js");
const verifyAdminToken = require("../middleware/adminAuthMiddleware.js");
const { upload, uploadMultiple } = require("../middleware/uploadSmartFilter.js");
const multer = require("multer");

const router = express.Router();

// Error handling wrapper for multer
const handleMulterError = (req, res, next) => {
    return (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    success: false,
                    message: err.message || "File upload error"
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message || "Invalid file"
            });
        }
        next();
    };
};

// All routes protected with admin authentication
router.post("/upload", verifyAdminToken, upload, smartFilterController.uploadFile);

// Upload folder route with improved error handling and timeout
router.post("/upload-folder", verifyAdminToken, (req, res, next) => {
    // Set longer timeout for multiple file processing (10 minutes)
    req.setTimeout(10 * 60 * 1000);
    res.setTimeout(10 * 60 * 1000);
    
    uploadMultiple(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                console.error("Multer error in upload-folder:", err);
                return res.status(400).json({
                    success: false,
                    message: err.message || "File upload error",
                    code: err.code || "MULTER_ERROR"
                });
            }
            console.error("File upload error in upload-folder:", err);
            return res.status(400).json({
                success: false,
                message: err.message || "Invalid file",
                code: "UPLOAD_ERROR"
            });
        }
        next();
    });
}, smartFilterController.uploadFolder);
// NEW: Complete upload, scan, match, filter, and download in one request
router.post("/upload-folder-and-match", verifyAdminToken, (req, res, next) => {
    req.setTimeout(15 * 60 * 1000); // 15 minutes
    res.setTimeout(15 * 60 * 1000);
    
    console.log(`\n📤 Upload-folder-and-match: Starting file upload...`);
    console.log(`   Content-Type: ${req.headers['content-type']}`);
    console.log(`   Content-Length: ${req.headers['content-length']}`);
    
    // Use the enhanced uploadMultiple function from middleware
    uploadMultiple(req, res, next);
}, smartFilterControllerV2.uploadFolderAndMatch);

router.post("/scan-drive", verifyAdminToken, smartFilterController.scanDriveAndProcess);
router.post("/download-google-drive", verifyAdminToken, smartFilterController.downloadFromGoogleDrive);
router.post("/analyze", verifyAdminToken, smartFilterController.analyzeCandidates);
router.get("/download/:fileId", verifyAdminToken, smartFilterController.downloadExcel);

module.exports = router;

