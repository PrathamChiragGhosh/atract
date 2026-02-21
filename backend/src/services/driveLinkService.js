const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parseFile, parseUnstructuredTextWithAI } = require('./smartFilterParserService.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Service to handle drive link processing
 * Supports Google Drive, OneDrive, Dropbox, and direct file links
 */

// Initialize Gemini AI for parsing unstructured text
const genAI = process.env.GEMINI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

/**
 * Detect drive type from URL
 */
function detectDriveType(url) {
    if (url.includes('drive.google.com')) {
        return 'google';
    } else if (url.includes('onedrive.live.com') || url.includes('1drv.ms') || url.includes('sharepoint.com')) {
        return 'onedrive';
    } else if (url.includes('dropbox.com')) {
        return 'dropbox';
    } else if (url.match(/^https?:\/\/.+\..+\/.+\.(pdf|txt|doc|docx|xlsx|xls)$/i)) {
        return 'direct';
    }
    return null;
}

/**
 * Extract Google Drive file ID from URL
 */
function extractGoogleDriveFileId(url) {
    // Handle different Google Drive URL formats
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/folders\/([a-zA-Z0-9_-]+)/,
        /\/drive\/folders\/([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

/**
 * Download file from Google Drive
 */
async function downloadFromGoogleDrive(fileId, outputPath) {
    try {
        // Try direct download link
        const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        
        const response = await axios({
            method: 'GET',
            url: directUrl,
            responseType: 'stream',
            maxRedirects: 5,
            timeout: 30000
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`Failed to download from Google Drive (${fileId}):`, error.message);
        throw new Error(`Failed to download file from Google Drive: ${error.message}`);
    }
}

/**
 * List files in Google Drive folder
 */
async function listGoogleDriveFiles(folderId) {
    try {
        // For Google Drive API, we would need OAuth token
        // For now, we'll use a workaround: try to download common file patterns
        // This is a simplified approach - in production, use Google Drive API with proper authentication
        
        const fileTypes = ['pdf', 'txt', 'doc', 'docx', 'xlsx', 'xls'];
        const files = [];
        
        // Note: This is a basic implementation
        // In production, use Google Drive API v3 with proper authentication
        // For now, we'll return the folder ID and let the user know they need to provide file IDs
        
        return {
            files: [],
            message: 'Google Drive folder listing requires API authentication. Please provide direct file links or use Google Drive API credentials.'
        };
    } catch (error) {
        console.error('Error listing Google Drive files:', error);
        throw error;
    }
}

/**
 * Download file from OneDrive
 */
async function downloadFromOneDrive(url, outputPath) {
    try {
        // Convert OneDrive sharing link to direct download link
        let downloadUrl = url;
        
        // If it's a sharing link, convert to direct download
        if (url.includes('1drv.ms')) {
            // OneDrive sharing links need to be converted
            // This is a simplified approach
            downloadUrl = url.replace('1drv.ms', 'onedrive.live.com/download');
        }
        
        // Replace /view or /edit with /download
        downloadUrl = downloadUrl.replace(/\/(view|edit)/, '/download');
        
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            maxRedirects: 5,
            timeout: 30000
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Failed to download from OneDrive:', error.message);
        throw new Error(`Failed to download file from OneDrive: ${error.message}`);
    }
}

/**
 * Download file from Dropbox
 */
async function downloadFromDropbox(url, outputPath) {
    try {
        // Convert Dropbox sharing link to direct download link
        let downloadUrl = url;
        
        // Replace ?dl=0 with ?dl=1 for direct download
        downloadUrl = downloadUrl.replace('?dl=0', '?dl=1');
        if (!downloadUrl.includes('?dl=')) {
            downloadUrl += (downloadUrl.includes('?') ? '&' : '?') + 'dl=1';
        }
        
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            maxRedirects: 5,
            timeout: 30000
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Failed to download from Dropbox:', error.message);
        throw new Error(`Failed to download file from Dropbox: ${error.message}`);
    }
}

/**
 * Download direct file link
 */
async function downloadDirectFile(url, outputPath) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            maxRedirects: 5,
            timeout: 30000
        });

        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Failed to download direct file:', error.message);
        throw new Error(`Failed to download file: ${error.message}`);
    }
}

/**
 * Extract file extension from URL or content type
 */
function getFileExtension(url, contentType) {
    // Try to get from URL
    const urlMatch = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    if (urlMatch) {
        return '.' + urlMatch[1].toLowerCase();
    }
    
    // Try to get from content type
    if (contentType) {
        const mimeMap = {
            'application/pdf': '.pdf',
            'text/plain': '.txt',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
        };
        if (mimeMap[contentType]) {
            return mimeMap[contentType];
        }
    }
    
    return '.txt'; // Default
}

/**
 * Process drive link - download and parse files
 */
async function processDriveLink(driveLink, downloadDir) {
    try {
        const driveType = detectDriveType(driveLink);
        
        if (!driveType) {
            throw new Error('Unsupported drive link. Please provide Google Drive, OneDrive, Dropbox, or direct file link.');
        }

        console.log(`Detected drive type: ${driveType}`);

        // Create download directory if it doesn't exist
        if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        const allCandidates = [];
        const allHeaders = [];
        const processedFiles = [];

        // Handle different drive types
        if (driveType === 'google') {
            const fileId = extractGoogleDriveFileId(driveLink);
            
            if (!fileId) {
                throw new Error('Could not extract file ID from Google Drive link');
            }

            // Check if it's a folder or file
            if (driveLink.includes('/folders/') || driveLink.includes('/drive/folders/')) {
                // It's a folder - list files (requires API authentication in production)
                const folderInfo = await listGoogleDriveFiles(fileId);
                
                if (folderInfo.message) {
                    throw new Error(folderInfo.message);
                }
                
                // Process each file in folder
                for (const file of folderInfo.files) {
                    const fileExt = path.extname(file.name).toLowerCase();
                    if (['.pdf', '.txt', '.doc', '.docx', '.xlsx', '.xls'].includes(fileExt)) {
                        const filePath = path.join(downloadDir, `drive-${Date.now()}-${file.name}`);
                        await downloadFromGoogleDrive(file.id, filePath);
                        processedFiles.push({ path: filePath, name: file.name });
                    }
                }
            } else {
                // It's a single file
                const filePath = path.join(downloadDir, `drive-${Date.now()}-file`);
                await downloadFromGoogleDrive(fileId, filePath);
                
                // Try to detect file extension from response headers
                // For now, we'll try common extensions
                const extensions = ['.pdf', '.txt', '.doc', '.docx', '.xlsx', '.xls'];
                let downloaded = false;
                
                for (const ext of extensions) {
                    try {
                        const testPath = filePath + ext;
                        await downloadFromGoogleDrive(fileId, testPath);
                        processedFiles.push({ path: testPath, name: `file${ext}` });
                        downloaded = true;
                        break;
                    } catch (e) {
                        // Try next extension
                    }
                }
                
                if (!downloaded) {
                    // Default to .pdf
                    const finalPath = filePath + '.pdf';
                    await downloadFromGoogleDrive(fileId, finalPath);
                    processedFiles.push({ path: finalPath, name: 'file.pdf' });
                }
            }
        } else if (driveType === 'onedrive') {
            const filePath = path.join(downloadDir, `onedrive-${Date.now()}-file`);
            await downloadFromOneDrive(driveLink, filePath);
            
            // Try to detect extension
            const ext = getFileExtension(driveLink);
            const finalPath = filePath + ext;
            fs.renameSync(filePath, finalPath);
            processedFiles.push({ path: finalPath, name: `file${ext}` });
        } else if (driveType === 'dropbox') {
            const filePath = path.join(downloadDir, `dropbox-${Date.now()}-file`);
            await downloadFromDropbox(driveLink, filePath);
            
            // Try to detect extension
            const ext = getFileExtension(driveLink);
            const finalPath = filePath + ext;
            fs.renameSync(filePath, finalPath);
            processedFiles.push({ path: finalPath, name: `file${ext}` });
        } else if (driveType === 'direct') {
            const filePath = path.join(downloadDir, `direct-${Date.now()}-file`);
            await downloadDirectFile(driveLink, filePath);
            
            // Try to detect extension
            const ext = getFileExtension(driveLink);
            const finalPath = filePath + ext;
            fs.renameSync(filePath, finalPath);
            processedFiles.push({ path: finalPath, name: `file${ext}` });
        }

        // Parse all downloaded files
        for (const file of processedFiles) {
            try {
                const ext = path.extname(file.path).toLowerCase();
                
                if (!['.pdf', '.txt', '.doc', '.docx', '.xlsx', '.xls'].includes(ext)) {
                    console.log(`Skipping unsupported file: ${file.name}`);
                    continue;
                }

                console.log(`Parsing file: ${file.name}`);
                
                let parseResult = await parseFile(file.path, ext);
                
                // If file needs AI parsing
                if (parseResult.needsAIParsing && parseResult.rawText) {
                    parseResult = await parseUnstructuredTextWithAI(parseResult.rawText, { genAI, GEMINI_MODEL });
                }
                
                if (parseResult.candidates && parseResult.candidates.length > 0) {
                    allCandidates.push(...parseResult.candidates);
                    if (parseResult.headers && parseResult.headers.length > 0) {
                        // Merge headers (avoid duplicates)
                        parseResult.headers.forEach(header => {
                            if (!allHeaders.includes(header)) {
                                allHeaders.push(header);
                            }
                        });
                    }
                }
            } catch (parseError) {
                console.error(`Error parsing file ${file.name}:`, parseError.message);
                // Continue with other files
            }
        }

        // Clean up downloaded files
        processedFiles.forEach(file => {
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            } catch (e) {
                console.error(`Error cleaning up file ${file.path}:`, e.message);
            }
        });

        return {
            candidates: allCandidates,
            headers: allHeaders,
            totalFiles: processedFiles.length,
            totalCandidates: allCandidates.length
        };

    } catch (error) {
        console.error('Drive link processing error:', error);
        throw error;
    }
}

/**
 * Process multiple drive links (comma-separated or array)
 */
async function processMultipleDriveLinks(driveLinks, downloadDir) {
    const links = Array.isArray(driveLinks) ? driveLinks : driveLinks.split(',').map(l => l.trim());
    
    const allCandidates = [];
    const allHeaders = [];
    let totalFiles = 0;

    for (const link of links) {
        try {
            const result = await processDriveLink(link, downloadDir);
            allCandidates.push(...result.candidates);
            result.headers.forEach(header => {
                if (!allHeaders.includes(header)) {
                    allHeaders.push(header);
                }
            });
            totalFiles += result.totalFiles;
        } catch (error) {
            console.error(`Error processing link ${link}:`, error.message);
            // Continue with other links
        }
    }

    return {
        candidates: allCandidates,
        headers: allHeaders,
        totalFiles: totalFiles,
        totalCandidates: allCandidates.length
    };
}

module.exports = {
    processDriveLink,
    processMultipleDriveLinks,
    detectDriveType,
    extractGoogleDriveFileId
};

