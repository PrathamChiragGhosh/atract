"use strict";

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const baseDir = path.join(__dirname, "../../uploads/proctoring");
const assetConfig = {
    snapshot: {
        folder: "snapshots",
        maxSize: 8 * 1024 * 1024,
        mimes: ["image/png", "image/jpeg", "image/webp"]
    },
    audio: {
        folder: "audio",
        maxSize: 15 * 1024 * 1024,
        mimes: ["audio/webm", "audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg"]
    }
};

const videoConfig = {
    folder: "videos",
    maxSize: 600 * 1024 * 1024,
    mimes: ["video/webm", "video/mp4", "video/mkv", "video/x-matroska"]
};

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function buildStorage(targetFolder) {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const userId = req.userId || "anonymous";
            const dir = path.join(baseDir, targetFolder, userId);
            ensureDir(dir);
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const timestamp = Date.now();
            const ext = path.extname(file.originalname) || this.defaultExtension || "";
            const sanitized = (file.fieldname || "asset").replace(/[^a-z0-9_-]/gi, "");
            cb(null, `${sanitized}-${timestamp}${ext}`.toLowerCase());
        }
    });
}

function uploadProctoringAsset(req, res, next) {
    try {
        const { assetType } = req.params;
        const config = assetConfig[assetType];

        if (!config) {
            return res.status(400).json({
                success: false,
                message: "Unsupported asset type"
            });
        }

        const storage = buildStorage(config.folder);
        const upload = multer({
            storage,
            limits: { fileSize: config.maxSize },
            fileFilter: (multerReq, file, cb) => {
                if (config.mimes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error(`Invalid file type for ${assetType}`));
                }
            }
        }).single("asset");

        upload(req, res, (error) => {
            if (error) {
                const statusCode = error instanceof multer.MulterError ? 400 : 422;
                return res.status(statusCode).json({
                    success: false,
                    message: error.message || "Failed to upload asset"
                });
            }
            return next();
        });
    } catch (error) {
        console.error("uploadProctoringAsset error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to store asset"
        });
    }
}

function uploadProctoringVideo(req, res, next) {
    try {
        const storage = buildStorage(videoConfig.folder);
        const upload = multer({
            storage,
            limits: { fileSize: videoConfig.maxSize },
            fileFilter: (multerReq, file, cb) => {
                if (videoConfig.mimes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error("Invalid video format. Use mp4 or webm exports from supported browsers."));
                }
            }
        }).single("video");

        upload(req, res, (error) => {
            if (error) {
                const statusCode = error instanceof multer.MulterError ? 400 : 422;
                return res.status(statusCode).json({
                    success: false,
                    message: error.message || "Failed to upload video"
                });
            }
            return next();
        });
    } catch (error) {
        console.error("uploadProctoringVideo error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to store video"
        });
    }
}

module.exports = {
    uploadProctoringAsset,
    uploadProctoringVideo
};


