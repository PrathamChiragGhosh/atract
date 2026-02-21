/**
 * Google Drive Downloader Utility
 * Downloads all TXT files from a Google Drive folder to a local directory
 */

const { google } = require('googleapis');
const fs = require('fs-extra');
const path = require('path');

/**
 * Initialize Google Drive API client
 */
function getDriveClient() {
    try {
        // Check for credentials
        const credentialsPath = path.join(__dirname, '../../credentials.json');
        const credentialsExists = fs.existsSync(credentialsPath);

        if (!credentialsExists) {
            // Try environment variables for OAuth
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

            if (clientId && clientSecret && refreshToken) {
                const oauth2Client = new google.auth.OAuth2(
                    clientId,
                    clientSecret,
                    'http://localhost' // Redirect URI
                );

                oauth2Client.setCredentials({
                    refresh_token: refreshToken
                });

                return google.drive({ version: 'v3', auth: oauth2Client });
            }

            throw new Error('Google Drive credentials not found. Please provide credentials.json or set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env');
        }

        // Use service account credentials
        const auth = new google.auth.GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });

        return google.drive({ version: 'v3', auth });
    } catch (error) {
        console.error('Google Drive authentication error:', error.message);
        throw new Error(`Failed to initialize Google Drive client: ${error.message}`);
    }
}

/**
 * Download all TXT files from a Google Drive folder
 * @param {string} folderId - Google Drive folder ID
 * @param {string} downloadDir - Local directory to save files
 * @returns {Promise<object>} Download results
 */
async function downloadAllTxtFiles(folderId, downloadDir) {
    try {
        const drive = getDriveClient();

        // Ensure download directory exists
        await fs.ensureDir(downloadDir);

        console.log(`\n📥 Downloading TXT files from Google Drive folder: ${folderId}`);
        console.log(`   Download directory: ${downloadDir}`);

        // List all TXT files in the folder
        const response = await drive.files.list({
            q: `'${folderId}' in parents and mimeType='text/plain' and trashed=false`,
            fields: 'files(id, name, size, modifiedTime)',
            pageSize: 1000
        });

        const files = response.data.files || [];

        if (files.length === 0) {
            console.log('   ⚠ No TXT files found in the folder');
            return {
                success: false,
                message: 'No TXT files found in the specified Google Drive folder',
                files: [],
                downloadedCount: 0
            };
        }

        console.log(`   Found ${files.length} TXT file(s)`);

        const downloadedFiles = [];
        const errors = [];

        // Download each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                console.log(`   [${i + 1}/${files.length}] Downloading: ${file.name}`);

                // Get file content
                const fileResponse = await drive.files.get(
                    { fileId: file.id, alt: 'media' },
                    { responseType: 'stream' }
                );

                // Create destination path
                const fileName = file.name.replace(/[<>:"/\\|?*]/g, '_'); // Sanitize filename
                const destPath = path.join(downloadDir, fileName);

                // Create write stream
                const writeStream = fs.createWriteStream(destPath);

                // Pipe file content to local file
                await new Promise((resolve, reject) => {
                    fileResponse.data
                        .pipe(writeStream)
                        .on('finish', () => {
                            console.log(`      ✓ Saved: ${fileName}`);
                            resolve();
                        })
                        .on('error', (error) => {
                            console.error(`      ✗ Error saving ${fileName}:`, error.message);
                            reject(error);
                        });
                });

                downloadedFiles.push({
                    id: file.id,
                    name: file.name,
                    localPath: destPath,
                    size: file.size || 0,
                    modifiedTime: file.modifiedTime
                });

            } catch (error) {
                console.error(`   ✗ Error downloading ${file.name}:`, error.message);
                errors.push({
                    fileName: file.name,
                    error: error.message
                });
            }
        }

        console.log(`\n✓ Download completed:`);
        console.log(`   Successfully downloaded: ${downloadedFiles.length} file(s)`);
        if (errors.length > 0) {
            console.log(`   Errors: ${errors.length} file(s)`);
        }

        return {
            success: true,
            message: `Downloaded ${downloadedFiles.length} TXT file(s)`,
            files: downloadedFiles,
            downloadedCount: downloadedFiles.length,
            errors: errors,
            downloadDir: downloadDir
        };

    } catch (error) {
        console.error('Google Drive download error:', error);
        throw new Error(`Failed to download files from Google Drive: ${error.message}`);
    }
}

/**
 * Download all files (any type) from a Google Drive folder
 * @param {string} folderId - Google Drive folder ID
 * @param {string} downloadDir - Local directory to save files
 * @param {array} allowedExtensions - File extensions to download (default: all supported)
 * @returns {Promise<object>} Download results
 */
async function downloadAllFiles(folderId, downloadDir, allowedExtensions = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.txt']) {
    try {
        const drive = getDriveClient();

        // Ensure download directory exists
        await fs.ensureDir(downloadDir);

        console.log(`\n📥 Downloading files from Google Drive folder: ${folderId}`);
        console.log(`   Download directory: ${downloadDir}`);
        console.log(`   Allowed extensions: ${allowedExtensions.join(', ')}`);

        // Build MIME type query
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.txt': 'text/plain'
        };

        const mimeTypeQueries = allowedExtensions
            .map(ext => mimeTypes[ext])
            .filter(Boolean)
            .map(mime => `mimeType='${mime}'`)
            .join(' or ');

        // List all files in the folder
        const response = await drive.files.list({
            q: `'${folderId}' in parents and (${mimeTypeQueries}) and trashed=false`,
            fields: 'files(id, name, size, mimeType, modifiedTime)',
            pageSize: 1000
        });

        const files = response.data.files || [];

        if (files.length === 0) {
            console.log('   ⚠ No supported files found in the folder');
            return {
                success: false,
                message: 'No supported files found in the specified Google Drive folder',
                files: [],
                downloadedCount: 0
            };
        }

        console.log(`   Found ${files.length} file(s)`);

        const downloadedFiles = [];
        const errors = [];

        // Download each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                console.log(`   [${i + 1}/${files.length}] Downloading: ${file.name}`);

                // Get file content
                const fileResponse = await drive.files.get(
                    { fileId: file.id, alt: 'media' },
                    { responseType: 'stream' }
                );

                // Create destination path
                const fileName = file.name.replace(/[<>:"/\\|?*]/g, '_'); // Sanitize filename
                const destPath = path.join(downloadDir, fileName);

                // Create write stream
                const writeStream = fs.createWriteStream(destPath);

                // Pipe file content to local file
                await new Promise((resolve, reject) => {
                    fileResponse.data
                        .pipe(writeStream)
                        .on('finish', () => {
                            console.log(`      ✓ Saved: ${fileName}`);
                            resolve();
                        })
                        .on('error', (error) => {
                            console.error(`      ✗ Error saving ${fileName}:`, error.message);
                            reject(error);
                        });
                });

                downloadedFiles.push({
                    id: file.id,
                    name: file.name,
                    localPath: destPath,
                    size: file.size || 0,
                    mimeType: file.mimeType,
                    extension: path.extname(file.name).toLowerCase(),
                    modifiedTime: file.modifiedTime
                });

            } catch (error) {
                console.error(`   ✗ Error downloading ${file.name}:`, error.message);
                errors.push({
                    fileName: file.name,
                    error: error.message
                });
            }
        }

        console.log(`\n✓ Download completed:`);
        console.log(`   Successfully downloaded: ${downloadedFiles.length} file(s)`);
        if (errors.length > 0) {
            console.log(`   Errors: ${errors.length} file(s)`);
        }

        return {
            success: true,
            message: `Downloaded ${downloadedFiles.length} file(s)`,
            files: downloadedFiles,
            downloadedCount: downloadedFiles.length,
            errors: errors,
            downloadDir: downloadDir
        };

    } catch (error) {
        console.error('Google Drive download error:', error);
        throw new Error(`Failed to download files from Google Drive: ${error.message}`);
    }
}

module.exports = {
    downloadAllTxtFiles,
    downloadAllFiles,
    getDriveClient
};

