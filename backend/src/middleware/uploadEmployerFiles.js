const multer = require("multer");

// Configure multer for memory storage (we'll handle base64 strings differently)
// This middleware will parse FormData and make files available in req.files
// Text fields will be available in req.body

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit for profile pictures and logos
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only image files are allowed."), false);
        }
    }
});

// Middleware to handle profile picture and company logo uploads
const uploadEmployerFiles = upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'companyLogo', maxCount: 1 }
]);

module.exports = { uploadEmployerFiles };

