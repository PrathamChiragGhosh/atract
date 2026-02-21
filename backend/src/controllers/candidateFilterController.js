const pythonDocumentService = require('../services/pythonDocumentService');
const filteredFileGenerator = require('../services/filteredFileGenerator');
const path = require('path');
const fs = require('fs').promises;

class CandidateFilterController {
    /**
     * Upload and filter candidate files
     * POST /api/candidates/filter
     */
    async filterCandidates(req, res) {
        try {
            const files = req.files || [];
            const { job, filterPercentage, useLLM, outputFormat } = req.body;

            // Validate files
            if (!files || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No files uploaded'
                });
            }

            // Validate job requirements
            if (!job) {
                return res.status(400).json({
                    success: false,
                    message: 'Job requirements are required'
                });
            }

            // Parse job if it's a string
            let jobData = job;
            if (typeof job === 'string') {
                try {
                    jobData = JSON.parse(job);
                } catch (e) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid job requirements format'
                    });
                }
            }

            // Get file paths
            const filePaths = files.map(file => file.path);

            // Process and filter files using Python service
            const filterPercentageNum = parseFloat(filterPercentage) || 50.0;
            const useLLMBool = useLLM !== false; // Default to true

            console.log(`Processing ${filePaths.length} file(s) with filter percentage: ${filterPercentageNum}%`);

            const result = await pythonDocumentService.processAndFilterFiles(
                filePaths,
                jobData,
                filterPercentageNum,
                useLLMBool
            );

            // Generate filtered file if candidates found
            let filteredFilePath = null;
            if (result.candidates && result.candidates.length > 0) {
                const outputDir = path.join(__dirname, '../../uploads/filtered-resumes');
                const originalFileName = files[0]?.originalname || 'candidates';
                const format = outputFormat || 'xlsx';

                filteredFilePath = await filteredFileGenerator.generateFilteredFile(
                    result.candidates,
                    outputDir,
                    format,
                    originalFileName
                );

                // Make path relative for response
                const relativePath = path.relative(path.join(__dirname, '../../'), filteredFilePath);
                result.filteredFilePath = relativePath;
                result.filteredFileName = path.basename(filteredFilePath);
            }

            res.json({
                success: true,
                message: 'Files processed and filtered successfully',
                data: {
                    totalFiles: result.totalFiles || files.length,
                    totalCandidates: result.totalCandidates || 0,
                    filteredCandidates: result.filteredCandidates || result.candidates?.length || 0,
                    candidates: result.candidates || [],
                    filteredFilePath: result.filteredFilePath,
                    filteredFileName: result.filteredFileName,
                    processedFiles: result.processedFiles || []
                }
            });

        } catch (error) {
            console.error('Error filtering candidates:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to filter candidates',
                error: error.message
            });
        }
    }

    /**
     * Download filtered file
     * GET /api/candidates/filter/download/:filename
     */
    async downloadFilteredFile(req, res) {
        try {
            const { filename } = req.params;
            const filePath = path.join(__dirname, '../../uploads/filtered-resumes', filename);

            // Check if file exists
            try {
                await fs.access(filePath);
            } catch (error) {
                return res.status(404).json({
                    success: false,
                    message: 'File not found'
                });
            }

            // Send file
            res.download(filePath, filename, (err) => {
                if (err) {
                    console.error('Error downloading file:', err);
                    res.status(500).json({
                        success: false,
                        message: 'Failed to download file'
                    });
                }
            });

        } catch (error) {
            console.error('Error in downloadFilteredFile:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to download file',
                error: error.message
            });
        }
    }

    /**
     * Get filtered file info
     * GET /api/candidates/filter/files
     */
    async listFilteredFiles(req, res) {
        try {
            const outputDir = path.join(__dirname, '../../uploads/filtered-resumes');
            
            try {
                await fs.access(outputDir);
            } catch (error) {
                // Directory doesn't exist, return empty list
                return res.json({
                    success: true,
                    files: []
                });
            }

            const files = await fs.readdir(outputDir);
            const fileList = await Promise.all(
                files.map(async (file) => {
                    const filePath = path.join(outputDir, file);
                    const stats = await fs.stat(filePath);
                    return {
                        filename: file,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime
                    };
                })
            );

            // Sort by creation date (newest first)
            fileList.sort((a, b) => b.createdAt - a.createdAt);

            res.json({
                success: true,
                files: fileList
            });

        } catch (error) {
            console.error('Error listing filtered files:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to list files',
                error: error.message
            });
        }
    }

    /**
     * Check Python service status
     * GET /api/candidates/filter/status
     */
    async checkServiceStatus(req, res) {
        try {
            const isAvailable = await pythonDocumentService.checkService();
            
            res.json({
                success: true,
                serviceAvailable: isAvailable,
                pythonCommand: process.env.PYTHON_COMMAND || 'python3'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                serviceAvailable: false,
                error: error.message
            });
        }
    }
}

module.exports = new CandidateFilterController();

