const ServiceJob = require('../models/ServiceJob.js');
const pythonDocumentService = require('../services/pythonDocumentService.js');
const { matchCandidates, applyPercentageFilter, applyNumberFilter } = require('../services/smartFilterMatchingService.js');
const { generateExcelFile } = require('../services/smartFilterExcelService.js');
const { uploadsDir, resultsDir } = require('../middleware/uploadSmartFilter.js');
const path = require('path');
const fs = require('fs');

// Placeholder functions (to be implemented if needed)
const uploadFile = async (req, res) => {
    return res.status(501).json({ success: false, message: "Not implemented" });
};

const scanDriveAndProcess = async (req, res) => {
    return res.status(501).json({ success: false, message: "Not implemented" });
};

const downloadFromGoogleDrive = async (req, res) => {
    return res.status(501).json({ success: false, message: "Not implemented" });
};

const downloadExcel = async (req, res) => {
    try {
        const { fileId } = req.params;
        const filePath = path.join(resultsDir, fileId);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: "File not found"
            });
        }

        res.download(filePath, fileId);
    } catch (error) {
        console.error("Download error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to download file"
        });
    }
};

const uploadFolder = async (req, res) => {
    try {
        // Set timeout for file upload
        req.setTimeout(5 * 60 * 1000); // 5 minutes for upload
        res.setTimeout(5 * 60 * 1000);
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded"
            });
        }
        
        console.log(`\n📂 Starting folder upload: ${req.files.length} file(s)`);

        // Filter only supported file types
        const supportedFiles = req.files.filter(file => {
            const ext = path.extname(file.originalname).toLowerCase();
            return ['.xlsx', '.xls', '.doc', '.docx', '.pdf', '.txt'].includes(ext);
        });

        if (supportedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No supported files found. Please upload Excel, Word, PDF, or TXT files."
            });
        }

        // STEP 1: Just upload and store files (NO PROCESSING YET)
        // Processing will happen when user clicks "Analyze"
        console.log(`\n📂 Step 1: Uploading ${supportedFiles.length} file(s)...`);
        
        const fileTypeCounts = {
            pdf: 0,
            word: 0,
            excel: 0,
            txt: 0
        };

        // Just store file information (no processing yet)
        const uploadedFiles = [];
        for (const file of supportedFiles) {
                const originalExt = path.extname(file.originalname).toLowerCase();
                
                // Track file types
                if (['.pdf'].includes(originalExt)) fileTypeCounts.pdf++;
                else if (['.doc', '.docx'].includes(originalExt)) fileTypeCounts.word++;
                else if (['.xlsx', '.xls'].includes(originalExt)) fileTypeCounts.excel++;
                else if (['.txt'].includes(originalExt)) fileTypeCounts.txt++;

            uploadedFiles.push({
                originalName: file.originalname,
                savedPath: file.path,
                filename: file.filename,
                size: file.size,
                type: originalExt.replace('.', '').toUpperCase()
                    });

            console.log(`   ✓ Uploaded: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)`);
        }

        // Generate a unique folder ID
        const folderId = `folder-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Save file list to JSON (for later processing)
        const folderData = {
            folderId: folderId,
            uploadedAt: new Date().toISOString(),
            files: uploadedFiles,
            totalFiles: uploadedFiles.length,
            fileTypeCounts: fileTypeCounts
        };

        const jsonFilePath = path.join(uploadsDir, `${folderId}.json`);
        fs.writeFileSync(jsonFilePath, JSON.stringify(folderData, null, 2), 'utf-8');
        
        console.log(`\n💾 Step 1 Complete: Saved ${uploadedFiles.length} file(s) information`);
        console.log(`   Folder ID: ${folderId}`);
        console.log(`   JSON File: ${jsonFilePath}`);

        return res.status(200).json({
            success: true,
            message: `Successfully uploaded ${uploadedFiles.length} file(s). Click "Analyze" to process them.`,
            data: {
                folderId: folderId,
                fileName: `Folder - ${uploadedFiles.length} file(s)`,
                totalFiles: uploadedFiles.length,
                fileTypeCounts: fileTypeCounts,
                jsonFilePath: jsonFilePath
            }
        });

    } catch (error) {
        console.error("Folder upload error:", error);
        console.error("Error stack:", error.stack);
        
        let errorMessage = "Failed to upload folder";
        if (error.message) {
            errorMessage = error.message;
        } else if (error.code === 'ETIMEDOUT' || error.code === 'TIMEOUT') {
            errorMessage = "Request timed out. Please try uploading fewer files at once.";
        } else if (error.code === 'ENOENT') {
            errorMessage = "File or directory not found. Please check file paths.";
        } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
            errorMessage = "Too many files open. Please try uploading fewer files at once.";
        }
        
        return res.status(500).json({
            success: false,
            message: errorMessage,
            error: error.message,
            code: error.code || "UNKNOWN_ERROR"
        });
    }
};

/**
 * Analyze candidates from uploaded folder
 * This function processes files using Python Spire.Doc, matches with job, and filters
 */
const analyzeCandidates = async (req, res) => {
    try {
        req.setTimeout(15 * 60 * 1000); // 15 minutes
        res.setTimeout(15 * 60 * 1000);

        const { fileId, jobId, filterType, filterValue } = req.body;

        // Validation
        if (!fileId || !jobId) {
            return res.status(400).json({
                success: false,
                message: "File ID and Job ID are required"
            });
        }

        if (!filterType || (filterType !== 'percentage' && filterType !== 'number')) {
            return res.status(400).json({
                success: false,
                message: "Filter type must be 'percentage' or 'number'"
            });
        }

        if (filterType === 'percentage' && (!filterValue || filterValue < 0 || filterValue > 100)) {
            return res.status(400).json({
                success: false,
                message: "Percentage filter value must be between 0 and 100"
            });
        }

        if (filterType === 'number' && (!filterValue || filterValue < 1)) {
            return res.status(400).json({
                success: false,
                message: "Number filter value must be at least 1"
            });
        }

        // Get job details
        const job = await ServiceJob.findById(jobId).populate('clientId', 'name companyName');
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        console.log(`\n🔍 Starting analysis for folder: ${fileId}`);
        console.log(`   Job: ${job.jobName}`);
        console.log(`   Filter: ${filterType} = ${filterValue}`);

        // Load folder data (contains file paths)
        const jsonFilePath = path.join(uploadsDir, `${fileId}.json`);
        if (!fs.existsSync(jsonFilePath)) {
            return res.status(404).json({
                success: false,
                message: "Folder data not found. Please upload files first."
            });
        }

        const folderData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
        const uploadedFiles = folderData.files || [];

        if (uploadedFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files found in folder"
            });
        }

        console.log(`\n📄 Step 1: Extracting data from ${uploadedFiles.length} file(s) using Python Spire.Doc...`);

        // Step 1: Extract data from all files using Python Spire.Doc
        const allCandidates = [];
        const processedFiles = [];

        for (let i = 0; i < uploadedFiles.length; i++) {
            const fileInfo = uploadedFiles[i];
            const filePath = fileInfo.savedPath;

            try {
                console.log(`   [${i + 1}/${uploadedFiles.length}] Processing: ${fileInfo.originalName}`);
                
                // Use Python Spire.Doc service to extract data
                let extractedData = null;
                
                try {
                    extractedData = await pythonDocumentService.parseFile(filePath);
                    console.log(`      ✓ Python Spire.Doc extraction successful`);
                } catch (pythonError) {
                    console.error(`      ✗ Python extraction failed: ${pythonError.message}`);
                    // For TXT files, read directly as fallback
                    if (fileInfo.type === 'TXT') {
                        try {
                            const textContent = fs.readFileSync(filePath, 'utf-8');
                            extractedData = {
                                text: textContent,
                                candidates: [],
                                method: 'txt-fallback'
                            };
                            console.log(`      ✓ Using TXT fallback extraction`);
                        } catch (txtError) {
                            throw new Error(`Failed to read TXT file: ${txtError.message}`);
                        }
                    } else {
                        throw pythonError;
                    }
                }

                // Process extracted data
                let extractedText = '';
                if (extractedData) {
                    if (extractedData.text) {
                        extractedText = extractedData.text;
                    } else if (extractedData.rawText) {
                        extractedText = extractedData.rawText;
                    }
                }

                // Handle candidates from Excel or create from text
                if (extractedData.candidates && extractedData.candidates.length > 0) {
                    // Excel files may have multiple candidates
                    for (const candidate of extractedData.candidates) {
                        const candidateData = {
                            ...candidate,
                            sourceFile: fileInfo.originalName,
                            fileType: fileInfo.type.toLowerCase(),
                        extractedText: extractedText.slice(0, 32767),
                            wordCount: extractedText.split(/\s+/).filter(w => w.length > 0).length
                    };

                        if (!candidateData.name || candidateData.name.trim() === '') {
                            candidateData.name = fileInfo.originalName.replace(/\.[^/.]+$/, "");
                }

                        allCandidates.push({
                        rowNumber: allCandidates.length + 1,
                            fileName: candidateData.sourceFile || fileInfo.originalName,
                            fileType: candidateData.fileType || fileInfo.type.toLowerCase(),
                        name: candidateData.name || '',
                        email: candidateData.email || '',
                        mobile: candidateData.mobile || '',
                        age: candidateData.age || '',
                        experience: candidateData.experience || '',
                        skills: candidateData.skills || '',
                        location: candidateData.location || '',
                        preferredLocation: candidateData.preferredLocation || '',
                        noticePeriod: candidateData.noticePeriod || '',
                        gender: candidateData.gender || '',
                        qualification: candidateData.qualification || '',
                        currentRole: candidateData.currentRole || '',
                        salary: candidateData.salary || '',
                        extractedText: candidateData.extractedText || '',
                        wordCount: candidateData.wordCount || 0,
                            sourceFile: candidateData.sourceFile || fileInfo.originalName,
                            originalData: candidateData
                        });
                    }
                } else if (extractedText && extractedText.trim().length > 0) {
                    // For PDF/Word/TXT files, create candidate from text
                    const candidateData = {
                        name: fileInfo.originalName.replace(/\.[^/.]+$/, ""),
                        email: '',
                        mobile: '',
                        age: '',
                        experience: '',
                        skills: '',
                        location: '',
                        noticePeriod: '',
                        gender: '',
                        qualification: '',
                        currentRole: '',
                        salary: '',
                        sourceFile: fileInfo.originalName,
                        fileType: fileInfo.type.toLowerCase(),
                        extractedText: extractedText.slice(0, 32767),
                        wordCount: extractedText.split(/\s+/).filter(w => w.length > 0).length
                    };

                    allCandidates.push({
                        rowNumber: allCandidates.length + 1,
                        fileName: candidateData.sourceFile || fileInfo.originalName,
                        fileType: candidateData.fileType || fileInfo.type.toLowerCase(),
                        name: candidateData.name || '',
                        email: candidateData.email || '',
                        mobile: candidateData.mobile || '',
                        age: candidateData.age || '',
                        experience: candidateData.experience || '',
                        skills: candidateData.skills || '',
                        location: candidateData.location || '',
                        preferredLocation: candidateData.preferredLocation || '',
                        noticePeriod: candidateData.noticePeriod || '',
                        gender: candidateData.gender || '',
                        qualification: candidateData.qualification || '',
                        currentRole: candidateData.currentRole || '',
                        salary: candidateData.salary || '',
                        extractedText: candidateData.extractedText || '',
                        wordCount: candidateData.wordCount || 0,
                        sourceFile: candidateData.sourceFile || fileInfo.originalName,
                        originalData: candidateData
                    });
                }

                    processedFiles.push({
                    name: fileInfo.originalName,
                    candidates: extractedData.candidates ? extractedData.candidates.length : 1,
                    type: fileInfo.type,
                    wordCount: extractedText.split(/\s+/).filter(w => w.length > 0).length,
                    method: extractedData.method || 'spire'
                    });

                console.log(`      ✓ Extracted ${extractedData.candidates ? extractedData.candidates.length : 1} candidate(s)`);
            } catch (parseError) {
                console.error(`      ✗ Error processing ${fileInfo.originalName}:`, parseError.message);
                processedFiles.push({
                    name: fileInfo.originalName,
                    candidates: 0,
                    error: parseError.message
                });
            }
        }

        console.log(`\n   ✓ Step 1 Complete: Extracted ${allCandidates.length} candidate(s) from ${processedFiles.length} file(s)`);

        if (allCandidates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No candidate data found in the uploaded files."
            });
        }

        // Step 2: Match candidates with job requirements
        console.log(`\n🔍 Step 2: Matching ${allCandidates.length} candidate(s) with job requirements...`);

        const jobData = {
            jobName: job.jobName,
            jobRequirements: job.jobRequirements,
            gender: job.gender,
            age: job.age,
            workExperience: job.workExperience,
            keySkills: job.keySkills || [],
            location: job.location,
            noticePeriod: job.noticePeriod,
            workingHours: job.workingHours,
            shiftStartTime: job.shiftStartTime,
            shiftEndTime: job.shiftEndTime,
            salary: job.salary
        };

        const matchedCandidates = matchCandidates(allCandidates, jobData);
        console.log(`   ✓ Matching completed: ${matchedCandidates.length} candidate(s) matched`);

        // Step 3: Filter closest matches
        console.log(`\n🎯 Step 3: Filtering closest matches...`);
        console.log(`   Filter Type: ${filterType}`);
        console.log(`   Filter Value: ${filterValue}`);
        console.log(`   Total Matched: ${matchedCandidates.length}`);

        let filteredCandidates;
        if (filterType === 'percentage') {
            filteredCandidates = applyPercentageFilter(matchedCandidates, parseFloat(filterValue));
        } else {
            filteredCandidates = applyNumberFilter(matchedCandidates, parseInt(filterValue));
        }

        console.log(`   ✓ Filtered to ${filteredCandidates.length} candidate(s)`);

        // Step 4: Generate Excel file
        console.log(`\n📊 Step 4: Generating Excel file...`);

        const excelFileName = `smart-filter-results-${Date.now()}.xlsx`;
        const excelFilePath = path.join(resultsDir, excelFileName);

        const headers = [
            'Rank', 'Match Score', 'Name', 'Email', 'Mobile', 'Age', 'Gender',
                    'Experience', 'Current Role', 'Qualification', 'Skills',
            'Location', 'Preferred Location', 'Notice Period', 'Salary',
            'Source File', 'File Type', 'Word Count', 'Extracted Text'
        ];

        await generateExcelFile(filteredCandidates, headers, excelFilePath);

            console.log(`   ✓ Excel file generated: ${excelFileName}`);

            return res.status(200).json({
                success: true,
            message: `Successfully processed ${processedFiles.length} file(s), extracted ${allCandidates.length} candidate(s), matched ${matchedCandidates.length} candidate(s), and filtered ${filteredCandidates.length} closest match(es)`,
                data: {
                    totalFiles: processedFiles.length,
                    totalCandidates: allCandidates.length,
                totalMatched: matchedCandidates.length,
                totalFiltered: filteredCandidates.length,
                    processedFiles: processedFiles,
                candidates: filteredCandidates.map(c => ({
                    rank: filteredCandidates.indexOf(c) + 1,
                    name: c.name || 'N/A',
                    email: c.email || 'N/A',
                    mobile: c.mobile || 'N/A',
                    matchScore: c.matchScore || 0,
                    sourceFile: c.sourceFile || c.fileName || 'N/A'
                })),
                    excelFileId: excelFileName,
                excelFilePath: `/uploads/smart-filter/results/${excelFileName}`,
                job: {
                    jobName: job.jobName,
                    clientName: job.clientId?.name || 'N/A',
                    companyName: job.clientId?.companyName || 'N/A'
                }
            }
        });

    } catch (error) {
        console.error("Analyze candidates error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to analyze candidates",
            error: error.message
        });
    }
};

module.exports = {
    uploadFile,
    uploadFolder,
    scanDriveAndProcess,
    downloadFromGoogleDrive,
    analyzeCandidates,
    downloadExcel
};
