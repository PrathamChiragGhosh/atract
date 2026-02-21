/**
 * Drive/Folder Scanner Utility
 * Recursively reads all files from a drive or folder path
 * Supports: PDF, Word, Excel, TXT files
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Recursively get all files from a directory (including subdirectories)
 * @param {string} dirPath - Root directory path
 * @param {array} arrayOfFiles - Array to store file paths
 * @param {array} supportedExtensions - File extensions to include
 * @returns {Promise<array>} Array of file paths
 */
async function getAllFiles(dirPath, arrayOfFiles = [], supportedExtensions = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.txt']) {
    try {
        // Check if directory exists
        if (!await fs.pathExists(dirPath)) {
            console.warn(`Directory does not exist: ${dirPath}`);
            return arrayOfFiles;
        }

        const stat = await fs.stat(dirPath);
        
        // If it's a file, not a directory
        if (stat.isFile()) {
            const ext = path.extname(dirPath).toLowerCase();
            if (supportedExtensions.includes(ext)) {
                arrayOfFiles.push(dirPath);
            }
            return arrayOfFiles;
        }

        // Read directory contents
        const files = await fs.readdir(dirPath);

        for (const file of files) {
            const fullPath = path.join(dirPath, file);
            
            try {
                const fileStat = await fs.stat(fullPath);

                if (fileStat.isDirectory()) {
                    // Recursively scan subdirectories
                    await getAllFiles(fullPath, arrayOfFiles, supportedExtensions);
                } else if (fileStat.isFile()) {
                    // Check if file extension is supported
                    const ext = path.extname(fullPath).toLowerCase();
                    if (supportedExtensions.includes(ext)) {
                        arrayOfFiles.push(fullPath);
                    }
                }
            } catch (error) {
                // Skip files/folders that can't be accessed
                console.warn(`Skipping ${fullPath}: ${error.message}`);
                continue;
            }
        }

        return arrayOfFiles;
    } catch (error) {
        console.error(`Error scanning directory ${dirPath}:`, error.message);
        return arrayOfFiles;
    }
}

/**
 * Get file information
 * @param {string} filePath - File path
 * @returns {Promise<object>} File information
 */
async function getFileInfo(filePath) {
    try {
        const stat = await fs.stat(filePath);
        return {
            path: filePath,
            name: path.basename(filePath),
            size: stat.size,
            extension: path.extname(filePath).toLowerCase(),
            created: stat.birthtime,
            modified: stat.mtime,
            directory: path.dirname(filePath)
        };
    } catch (error) {
        console.error(`Error getting file info for ${filePath}:`, error.message);
        return null;
    }
}

/**
 * Scan drive/folder and return all supported files
 * @param {string} rootPath - Root path to scan
 * @param {object} options - Scan options
 * @returns {Promise<object>} Scan results
 */
async function scanDrive(rootPath, options = {}) {
    const {
        supportedExtensions = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.txt'],
        maxFiles = 1000, // Limit for safety
        maxFileSize = 50 * 1024 * 1024 // 50MB default
    } = options;

    console.log(`\n📂 Scanning drive/folder: ${rootPath}`);
    console.log(`   Supported extensions: ${supportedExtensions.join(', ')}`);
    console.log(`   Max files: ${maxFiles}`);
    console.log(`   Max file size: ${(maxFileSize / 1024 / 1024).toFixed(2)} MB`);

    const allFiles = [];
    await getAllFiles(rootPath, allFiles, supportedExtensions);

    // Filter by file size and limit
    const validFiles = [];
    for (const filePath of allFiles.slice(0, maxFiles)) {
        try {
            const fileInfo = await getFileInfo(filePath);
            if (fileInfo && fileInfo.size <= maxFileSize) {
                validFiles.push(fileInfo);
            }
        } catch (error) {
            console.warn(`Skipping ${filePath}: ${error.message}`);
        }
    }

    console.log(`\n✓ Scan completed:`);
    console.log(`   Total files found: ${allFiles.length}`);
    console.log(`   Valid files: ${validFiles.length}`);

    // Group by file type
    const fileTypeCounts = {};
    validFiles.forEach(file => {
        const ext = file.extension;
        fileTypeCounts[ext] = (fileTypeCounts[ext] || 0) + 1;
    });

    console.log(`   File types:`, fileTypeCounts);

    return {
        totalFiles: allFiles.length,
        validFiles: validFiles.length,
        files: validFiles,
        fileTypeCounts,
        rootPath
    };
}

module.exports = {
    getAllFiles,
    getFileInfo,
    scanDrive
};

