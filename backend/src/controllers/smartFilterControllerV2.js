const ServiceJob = require('../models/ServiceJob.js');
const pythonDocumentService = require('../services/pythonDocumentService.js');
const { matchCandidates, applyPercentageFilter, applyNumberFilter } = require('../services/smartFilterMatchingService.js');
const { generateExcelFile } = require('../services/smartFilterExcelService.js');
const { uploadsDir, resultsDir } = require('../middleware/uploadSmartFilter.js');
const path = require('path');
const fs = require('fs');

/**
 * NEW IMPLEMENTATION: Upload Folder, Scan, Match, Filter, and Generate Downloadable File
 * Uses Python Spire.Doc library for file extraction only
 * No two-layer filtering - simple matching only
 * 
 * Flow:
 * 1. Upload multiple files (PDF, TXT, Word, Excel)
 * 2. Scan and extract data from all files using Python Spire.Doc
 * 3. Match candidates with job description
 * 4. Filter closest matches
 * 5. Generate downloadable Excel file
 */
const uploadFolderAndMatch = async (req, res) => {
    try {
        // Set timeout for long-running operations (15 minutes for large batches)
        req.setTimeout(15 * 60 * 1000);
        res.setTimeout(15 * 60 * 1000);

        const { jobId, filterType, filterValue } = req.body;

        // Validation
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files uploaded"
            });
        }

        console.log(`\n📂 Received ${req.files.length} file(s) for processing`);

        if (!jobId) {
            return res.status(400).json({
                success: false,
                message: "Job ID is required"
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

        console.log(`\n🚀 Starting complete processing pipeline...`);
        console.log(`   Files: ${req.files.length}`);
        console.log(`   Job: ${job.jobName}`);
        console.log(`   Filter: ${filterType} = ${filterValue}`);

        // ============================================
        // STEP 1: FILTER SUPPORTED FILES
        // ============================================
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

        console.log(`\n📂 Step 1: Filtered ${supportedFiles.length} supported file(s) from ${req.files.length} total`);

        // ============================================
        // STEP 2: EXTRACT DATA FROM ALL FILES USING PYTHON SPIRE.DOC
        // ============================================
        console.log(`\n📄 Step 2: Extracting data from ${supportedFiles.length} file(s) using Python Spire.Doc...`);
        
        const allCandidates = [];
        const processedFiles = [];
        const fileTypeCounts = { pdf: 0, word: 0, excel: 0, txt: 0 };

        // Process files sequentially to avoid overwhelming the system
        for (let i = 0; i < supportedFiles.length; i++) {
            const file = supportedFiles[i];
            const originalExt = path.extname(file.originalname).toLowerCase();

            try {
                // Track file types
                if (['.pdf'].includes(originalExt)) fileTypeCounts.pdf++;
                else if (['.doc', '.docx'].includes(originalExt)) fileTypeCounts.word++;
                else if (['.xlsx', '.xls'].includes(originalExt)) fileTypeCounts.excel++;
                else if (['.txt'].includes(originalExt)) fileTypeCounts.txt++;

                console.log(`   [${i + 1}/${supportedFiles.length}] Processing: ${file.originalname} (${originalExt})`);

                // Use Python Spire.Doc service to extract data
                let extractedData = null;
                
                try {
                    // Call Python service to parse file using Spire.Doc
                    extractedData = await pythonDocumentService.parseFile(file.path);
                    console.log(`      ✓ Python Spire.Doc extraction successful`);
                } catch (pythonError) {
                    console.error(`      ✗ Python extraction failed: ${pythonError.message}`);
                    // For TXT files, read directly as fallback
                    if (originalExt === '.txt') {
                        try {
                            const textContent = await fs.promises.readFile(file.path, 'utf-8');
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
                let candidateData = null;
                let extractedText = '';

                if (extractedData) {
                    // Get text content
                    if (extractedData.text) {
                        extractedText = extractedData.text;
                    } else if (extractedData.rawText) {
                        extractedText = extractedData.rawText;
                    }

                    // Get candidates from extracted data
                    if (extractedData.candidates && extractedData.candidates.length > 0) {
                        // Excel files may have multiple candidates
                        for (const candidate of extractedData.candidates) {
                            candidateData = {
                                ...candidate,
                                sourceFile: file.originalname,
                                fileType: originalExt,
                                extractedText: extractedText.slice(0, 32767),
                                wordCount: extractedText.split(/\s+/).filter(w => w.length > 0).length
                            };

                            // If no name, use filename
                            if (!candidateData.name || candidateData.name.trim() === '') {
                                candidateData.name = file.originalname.replace(/\.[^/.]+$/, "");
                            }

                            allCandidates.push({
                                rowNumber: allCandidates.length + 1,
                                fileName: candidateData.sourceFile || file.originalname,
                                fileType: candidateData.fileType || originalExt,
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
                                sourceFile: candidateData.sourceFile || file.originalname,
                                originalData: candidateData
                            });
                        }
                    } else if (extractedText && extractedText.trim().length > 0) {
                        // For PDF/Word/TXT files without structured data, create candidate from text
                        candidateData = {
                            name: file.originalname.replace(/\.[^/.]+$/, ""),
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
                            sourceFile: file.originalname,
                            fileType: originalExt,
                            extractedText: extractedText.slice(0, 32767),
                            wordCount: extractedText.split(/\s+/).filter(w => w.length > 0).length
                        };

                        allCandidates.push({
                            rowNumber: allCandidates.length + 1,
                            fileName: candidateData.sourceFile || file.originalname,
                            fileType: candidateData.fileType || originalExt,
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
                            sourceFile: candidateData.sourceFile || file.originalname,
                            originalData: candidateData
                        });
                    }

                    if (candidateData || (extractedData.candidates && extractedData.candidates.length > 0)) {
                        const candidateCount = extractedData.candidates ? extractedData.candidates.length : 1;
                        processedFiles.push({
                            name: file.originalname,
                            candidates: candidateCount,
                            type: originalExt.replace('.', '').toUpperCase(),
                            wordCount: extractedText.split(/\s+/).filter(w => w.length > 0).length,
                            method: extractedData.method || 'spire'
                        });
                        console.log(`      ✓ Extracted ${candidateCount} candidate(s) (${extractedText.length} chars, method: ${extractedData.method || 'spire'})`);
                    } else {
                        processedFiles.push({
                            name: file.originalname,
                            candidates: 0,
                            type: originalExt.replace('.', '').toUpperCase(),
                            error: 'No data extracted'
                        });
                        console.log(`      ⚠ No data extracted`);
                    }
                } else {
                    processedFiles.push({
                        name: file.originalname,
                        candidates: 0,
                        type: originalExt.replace('.', '').toUpperCase(),
                        error: 'Extraction returned no data'
                    });
                    console.log(`      ⚠ Extraction returned no data`);
                }
            } catch (parseError) {
                console.error(`      ✗ Error processing ${file.originalname}:`, parseError.message);
                processedFiles.push({
                    name: file.originalname,
                    candidates: 0,
                    error: parseError.message
                });
            }
        }

        console.log(`\n   ✓ Step 2 Complete: Extracted ${allCandidates.length} candidate(s) from ${processedFiles.length} file(s)`);
        console.log(`   File types: PDF=${fileTypeCounts.pdf}, Word=${fileTypeCounts.word}, Excel=${fileTypeCounts.excel}, TXT=${fileTypeCounts.txt}`);

        if (allCandidates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No candidate data found in the uploaded files. Please ensure files contain candidate information."
            });
        }

        // ============================================
        // STEP 3: MATCH CANDIDATES WITH JOB DESCRIPTION (SIMPLE MATCHING - NO TWO-LAYER)
        // ============================================
        console.log(`\n🔍 Step 3: Matching ${allCandidates.length} candidate(s) with job requirements...`);
        
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

        // Use simple matching only (no two-layer filtering)
        console.log(`   Using simple rule-based matching...`);
        const matchedCandidates = matchCandidates(allCandidates, jobData);
        console.log(`   ✓ Matching completed: ${matchedCandidates.length} candidate(s) matched`);

        // ============================================
        // STEP 4: FILTER CLOSEST MATCHES
        // ============================================
        console.log(`\n🎯 Step 4: Filtering closest matches...`);
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

        // ============================================
        // STEP 5: GENERATE DOWNLOADABLE EXCEL FILE
        // ============================================
        console.log(`\n📊 Step 5: Generating downloadable Excel file...`);

        const excelFileName = `smart-filter-results-${Date.now()}.xlsx`;
        const excelFilePath = path.join(resultsDir, excelFileName);

        try {
            // Prepare headers
            const headers = [
                'Rank', 'Match Score', 'Name', 'Email', 'Mobile', 'Age', 'Gender',
                'Experience', 'Current Role', 'Qualification', 'Skills',
                'Location', 'Preferred Location', 'Notice Period', 'Salary',
                'Source File', 'File Type', 'Word Count', 'Extracted Text'
            ];

            // Prepare rows
            const rows = filteredCandidates.map((candidate, index) => {
                const getFieldValue = (field, altNames = []) => {
                    if (candidate[field] && String(candidate[field]).trim()) {
                        return String(candidate[field]).trim();
                    }
                    for (const altName of altNames) {
                        if (candidate[altName] && String(candidate[altName]).trim()) {
                            return String(candidate[altName]).trim();
                        }
                    }
                    if (candidate.originalData && typeof candidate.originalData === 'object') {
                        if (candidate.originalData[field] && String(candidate.originalData[field]).trim()) {
                            return String(candidate.originalData[field]).trim();
                        }
                        for (const altName of altNames) {
                            if (candidate.originalData[altName] && String(candidate.originalData[altName]).trim()) {
                                return String(candidate.originalData[altName]).trim();
                            }
                        }
                    }
                    return '';
                };

                return {
                    'Rank': index + 1,
                    'Match Score': candidate.matchScore || 0,
                    'Name': getFieldValue('name', ['Name', 'fullName', 'candidateName']) || 'N/A',
                    'Email': getFieldValue('email', ['Email', 'emailId', 'emailAddress']) || 'N/A',
                    'Mobile': getFieldValue('mobile', ['Mobile', 'mobileNumber', 'phone', 'phoneNumber']) || 'N/A',
                    'Age': getFieldValue('age', ['Age']) || 'N/A',
                    'Gender': getFieldValue('gender', ['Gender', 'sex']) || 'N/A',
                    'Experience': getFieldValue('experience', ['experience', 'workExperience', 'yearsOfExperience']) || 'N/A',
                    'Current Role': getFieldValue('currentRole', ['currentRole', 'currentPosition', 'designation', 'jobTitle']) || 'N/A',
                    'Qualification': getFieldValue('qualification', ['qualification', 'education', 'degree']) || 'N/A',
                    'Skills': getFieldValue('skills', ['skills', 'keySkills', 'technicalSkills']) || 'N/A',
                    'Location': getFieldValue('location', ['location', 'city', 'currentLocation']) || 'N/A',
                    'Preferred Location': getFieldValue('preferredLocation', ['preferredLocation', 'preferredCity']) || 'N/A',
                    'Notice Period': getFieldValue('noticePeriod', ['noticePeriod', 'notice', 'np']) || 'N/A',
                    'Salary': getFieldValue('salary', ['salary', 'ctc', 'expectedSalary']) || 'N/A',
                    'Source File': candidate.sourceFile || candidate.fileName || 'N/A',
                    'File Type': candidate.fileType || 'N/A',
                    'Word Count': candidate.wordCount || 0,
                    'Extracted Text': candidate.extractedText || ''
                };
            });

            await generateExcelFile(filteredCandidates, headers, excelFilePath);

            console.log(`   ✓ Excel file generated: ${excelFileName}`);
            console.log(`   ✓ Total rows: ${rows.length}`);

            // ============================================
            // STEP 6: RETURN RESULTS
            // ============================================
            console.log(`\n✅ Complete processing pipeline finished successfully!`);
            console.log(`   Files processed: ${processedFiles.length}`);
            console.log(`   Candidates extracted: ${allCandidates.length}`);
            console.log(`   Candidates matched: ${matchedCandidates.length}`);
            console.log(`   Candidates filtered: ${filteredCandidates.length}`);
            console.log(`   Excel file: ${excelFileName}`);

            return res.status(200).json({
                success: true,
                message: `Successfully processed ${processedFiles.length} file(s), extracted ${allCandidates.length} candidate(s), matched ${matchedCandidates.length} candidate(s), and filtered ${filteredCandidates.length} closest match(es)`,
                data: {
                    totalFiles: processedFiles.length,
                    totalCandidates: allCandidates.length,
                    totalMatched: matchedCandidates.length,
                    totalFiltered: filteredCandidates.length,
                    fileTypeCounts: fileTypeCounts,
                    processedFiles: processedFiles,
                    candidates: filteredCandidates.map(c => ({
                        rank: filteredCandidates.indexOf(c) + 1,
                        name: c.name || 'N/A',
                        email: c.email || 'N/A',
                        mobile: c.mobile || 'N/A',
                        age: c.age || 'N/A',
                        gender: c.gender || 'N/A',
                        experience: c.experience || 'N/A',
                        skills: c.skills || 'N/A',
                        location: c.location || 'N/A',
                        matchScore: c.matchScore || 0,
                        matchDetails: c.matchDetails || {},
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

        } catch (excelError) {
            console.error("Excel generation error:", excelError);
            return res.status(500).json({
                success: false,
                message: `Failed to generate Excel file: ${excelError.message}`
            });
        }

    } catch (error) {
        console.error("Upload folder and match error:", error);
        console.error("Error stack:", error.stack);
        
        let errorMessage = "Failed to process folder and match candidates";
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

module.exports = {
    uploadFolderAndMatch
};
