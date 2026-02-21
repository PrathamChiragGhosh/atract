"use client";

import { useState } from 'react';
import { useServiceJobs } from '@/hooks/useAdminServiceJobs';
import { useUploadSmartFilterFile, useUploadFolder, useAnalyzeCandidates, useUploadFolderAndMatch, downloadExcelFile } from '@/hooks/useAdminSmartFilter';
import { CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';
import { HiArrowUpTray, HiDocumentText, HiXMark } from 'react-icons/hi2';
import './page.css';

export default function SmartFilterPage() {
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [fileId, setFileId] = useState(null);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [filterType, setFilterType] = useState('percentage');
    const [filterValue, setFilterValue] = useState('');
    const [customPercentage, setCustomPercentage] = useState('');
    const [results, setResults] = useState(null);
    const [showAllCandidates, setShowAllCandidates] = useState(false);
    const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'folder'

    const { data: jobsData } = useServiceJobs({ limit: 1000 });
    const jobs = jobsData?.data || [];
    const uploadFile = useUploadSmartFilterFile();
    const uploadFolder = useUploadFolder();
    const analyzeCandidates = useAnalyzeCandidates();
    const uploadFolderAndMatch = useUploadFolderAndMatch(); // NEW: Complete flow

    /**
     * Auto-detect file type from file extension
     */
    const detectFileType = (fileName) => {
        const fileExt = fileName.split('.').pop().toLowerCase();
        if (['xlsx', 'xls'].includes(fileExt)) return 'excel';
        if (['doc', 'docx'].includes(fileExt)) return 'word';
        if (['pdf'].includes(fileExt)) return 'pdf';
        if (['txt'].includes(fileExt)) return 'txt';
        return null;
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Auto-detect file type
        const fileType = detectFileType(file.name);
        if (!fileType) {
            toast.error('Unsupported file type. Please upload Excel (.xlsx, .xls), Word (.doc, .docx), PDF (.pdf), or TXT (.txt) files only.');
            e.target.value = ''; // Reset input
            return;
        }

        try {
            setUploadedFile(file);
            const result = await uploadFile.mutateAsync({ file, fileType });
            if (result.success) {
                setFileId(result.data.fileId);
                toast.success('File uploaded successfully');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload file');
            setUploadedFile(null);
            e.target.value = ''; // Reset input
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setUploadedFiles([]);
        setFileId(null);
    };

    const handleFolderSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Filter only supported file types (PDF, Word, TXT, Excel)
        const supportedFiles = files.filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return ['xlsx', 'xls', 'doc', 'docx', 'pdf', 'txt'].includes(ext);
        });

        if (supportedFiles.length === 0) {
            toast.error('No supported files found. Please select files containing Excel (.xlsx, .xls), Word (.doc, .docx), PDF (.pdf), or TXT (.txt) files.');
            e.target.value = '';
            return;
        }

        // Validate file sizes (max 50MB per file)
        const oversizedFiles = supportedFiles.filter(f => f.size > 50 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            toast.error(`${oversizedFiles.length} file(s) exceed 50MB limit. Please compress or split files.`);
            e.target.value = '';
            return;
        }

        // Count file types
        const fileTypeCounts = {
            pdf: supportedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf')).length,
            word: supportedFiles.filter(f => ['doc', 'docx'].includes(f.name.split('.').pop().toLowerCase())).length,
            excel: supportedFiles.filter(f => ['xlsx', 'xls'].includes(f.name.split('.').pop().toLowerCase())).length,
            txt: supportedFiles.filter(f => f.name.toLowerCase().endsWith('.txt')).length
        };

        if (supportedFiles.length !== files.length) {
            toast.warning(`${files.length - supportedFiles.length} unsupported file(s) were ignored.`);
        }

        // Show file count
        console.log(`📂 Selected ${supportedFiles.length} file(s) for upload`);
        console.log(`   PDF: ${fileTypeCounts.pdf}, Word: ${fileTypeCounts.word}, Excel: ${fileTypeCounts.excel}, TXT: ${fileTypeCounts.txt}`);

        try {
            setUploadedFiles(supportedFiles);
            const uploadToastId = toast.loading(
                `Uploading ${supportedFiles.length} file(s)... This may take a few minutes. Please wait.`,
                { id: 'folder-upload', duration: 300000 } // 5 minutes
            );
            
            console.log('🚀 Starting folder upload...');
            const result = await uploadFolder.mutateAsync({ files: supportedFiles });
            
            if (result.success) {
                console.log('✅ Upload successful:', result.data);
                
                // Use folderId for JSON file or excelFileId for Excel file
                // The analyze endpoint can handle both
                const fileIdToUse = result.data.excelFileId || result.data.folderId;
                setFileId(fileIdToUse);
                
                toast.success(
                    `✅ Successfully processed ${result.data.totalFiles} file(s)\n` +
                    `📊 Found ${result.data.totalCandidates} candidate(s)\n` +
                    `💾 Data stored in JSON format\n` +
                    `📈 Excel file created\n\n` +
                    `Now select a job and click "Analyze" to filter candidates.`,
                    { id: 'folder-upload', duration: 8000 }
                );
                
                // Reset results if any
                setResults(null);
            } else {
                throw new Error(result.message || 'Upload failed');
            }
        } catch (error) {
            console.error('❌ Upload error:', error);
            
            let errorMessage = 'Failed to upload folder';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.code === 'ECONNREFUSED' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
                errorMessage = 'Backend server is not running. Please start the backend server on port 5001.';
            } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
                errorMessage = 'Upload timed out. Please try uploading fewer files at once (10-20 files per batch).';
            }
            
            toast.error(errorMessage, { id: 'folder-upload', duration: 5000 });
            setUploadedFiles([]);
            setFileId(null);
            e.target.value = '';
        }
    };

    // NEW: Complete flow - Upload, Scan, Match, Filter in one go
    const handleUploadFolderAndMatch = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Filter only supported file types
        const supportedFiles = files.filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return ['xlsx', 'xls', 'doc', 'docx', 'pdf', 'txt'].includes(ext);
        });

        if (supportedFiles.length === 0) {
            toast.error('No supported files found. Please select files containing Excel (.xlsx, .xls), Word (.doc, .docx), PDF (.pdf), or TXT (.txt) files.');
            e.target.value = '';
            return;
        }

        // Validate job and filter
        if (!selectedJobId) {
            toast.error('Please select a job first');
            e.target.value = '';
            return;
        }

        let finalFilterValue;
        if (filterType === 'percentage') {
            if (customPercentage) {
                finalFilterValue = parseFloat(customPercentage);
                if (isNaN(finalFilterValue) || finalFilterValue < 0 || finalFilterValue > 100) {
                    toast.error('Custom percentage must be between 0 and 100');
                    e.target.value = '';
                    return;
                }
            } else if (!filterValue) {
                toast.error('Please select a percentage or enter custom percentage');
                e.target.value = '';
                return;
            } else {
                finalFilterValue = parseFloat(filterValue);
            }
        } else {
            if (!filterValue || isNaN(parseInt(filterValue)) || parseInt(filterValue) < 1) {
                toast.error('Please enter a valid number');
                e.target.value = '';
                return;
            }
            finalFilterValue = parseInt(filterValue);
        }

        try {
            setUploadedFiles(supportedFiles);
            const processToastId = toast.loading(
                `Processing ${supportedFiles.length} file(s)...\n` +
                `Scanning → Matching → Filtering...\n` +
                `This may take a few minutes. Please wait.`,
                { id: 'complete-process', duration: 900000 } // 15 minutes
            );

            console.log('🚀 Starting complete processing flow...');
            console.log(`   Files: ${supportedFiles.length}`);
            console.log(`   Job ID: ${selectedJobId}`);
            console.log(`   Filter: ${filterType} = ${finalFilterValue}`);

            const result = await uploadFolderAndMatch.mutateAsync({
                files: supportedFiles,
                jobId: selectedJobId,
                filterType,
                filterValue: finalFilterValue
            });

            if (result.success) {
                console.log('✅ Complete processing successful:', result.data);
                
                // Set results directly
                setResults({
                    totalAnalyzed: result.data.totalMatched,
                    totalFiltered: result.data.totalFiltered,
                    candidates: result.data.candidates,
                    excelFileId: result.data.excelFileId,
                    job: result.data.job
                });

                toast.success(
                    `✅ Complete processing finished!\n` +
                    `📊 Files: ${result.data.totalFiles}\n` +
                    `👥 Candidates: ${result.data.totalCandidates} extracted, ${result.data.totalMatched} matched\n` +
                    `🎯 Filtered: ${result.data.totalFiltered} closest match(es)\n` +
                    `📥 Excel file ready for download`,
                    { id: 'complete-process', duration: 8000 }
                );

                setShowAllCandidates(false);
            } else {
                throw new Error(result.message || 'Processing failed');
            }
        } catch (error) {
            console.error('❌ Complete processing error:', error);
            
            let errorMessage = 'Failed to process files';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            
            toast.error(errorMessage, { id: 'complete-process', duration: 5000 });
            setUploadedFiles([]);
            e.target.value = '';
        }
    };

    const handleAnalyze = async () => {
        if (!fileId) {
            toast.error('Please upload files first');
            return;
        }

        if (!selectedJobId) {
            toast.error('Please select a job to match against');
            return;
        }

        let finalFilterValue;
        if (filterType === 'percentage') {
            if (customPercentage) {
                finalFilterValue = parseFloat(customPercentage);
                if (isNaN(finalFilterValue) || finalFilterValue < 0 || finalFilterValue > 100) {
                    toast.error('Custom percentage must be between 0 and 100');
                    return;
                }
            } else if (!filterValue) {
                toast.error('Please select a percentage or enter custom percentage');
                return;
            } else {
                finalFilterValue = parseFloat(filterValue);
            }
        } else {
            if (!filterValue || isNaN(parseInt(filterValue)) || parseInt(filterValue) < 1) {
                toast.error('Please enter a valid number');
                return;
            }
            finalFilterValue = parseInt(filterValue);
        }

        try {
            const selectedJob = jobs.find(j => j._id === selectedJobId);
            const analyzeToastId = toast.loading(
                `Analyzing candidates against job: ${selectedJob?.jobName || 'Selected Job'}...\n` +
                `This may take a few minutes. Please wait.`,
                { id: 'analyze', duration: 300000 } // 5 minutes
            );
            
            console.log('🔍 Starting analysis...');
            console.log(`   File ID: ${fileId}`);
            console.log(`   Job ID: ${selectedJobId}`);
            console.log(`   Filter Type: ${filterType}`);
            console.log(`   Filter Value: ${finalFilterValue}`);
            
            const result = await analyzeCandidates.mutateAsync({
                fileId,
                jobId: selectedJobId,
                filterType,
                filterValue: finalFilterValue
            });

            if (result.success) {
                console.log('✅ Analysis successful:', result.data);
                setResults(result.data);
                setShowAllCandidates(false); // Reset to show only top 10 for new results
                
                toast.success(
                    `✅ Analysis completed!\n` +
                    `📊 Analyzed: ${result.data.totalAnalyzed} candidate(s)\n` +
                    `🎯 Filtered: ${result.data.totalFiltered} candidate(s) matched\n` +
                    `📥 Excel file ready for download`,
                    { id: 'analyze', duration: 6000 }
                );
            } else {
                throw new Error(result.message || 'Analysis failed');
            }
        } catch (error) {
            console.error('❌ Analysis error:', error);
            
            let errorMessage = 'Failed to analyze candidates';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.code === 'ECONNREFUSED' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
                errorMessage = 'Backend server is not running. Please start the backend server.';
            } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
                errorMessage = 'Analysis timed out. Please try again or reduce the number of files.';
            }
            
            toast.error(errorMessage, { id: 'analyze', duration: 5000 });
        }
    };

    const handleDownloadExcel = async () => {
        if (!results?.excelFileId) {
            toast.error('No Excel file available');
            return;
        }

        try {
            await downloadExcelFile(results.excelFileId);
            toast.success('Excel file downloaded successfully');
        } catch (error) {
            toast.error('Failed to download Excel file');
        }
    };

    return (
        <div className="smart-filter-page">
            <div className="smart-filter-header">
                <h1 className="smart-filter-title">Smart Filter</h1>
                <p className="smart-filter-subtitle">Upload candidate files and filter them based on job requirements</p>
            </div>

            {/* File Upload Section */}
            <div className="smart-filter-section">
                <div className="smart-filter-section-header">
                    <h2 className="smart-filter-section-title">Upload File</h2>
                </div>
                
                {/* Upload Mode Toggle */}
                <div className="smart-filter-upload-mode-toggle">
                    <button
                        className={`smart-filter-mode-btn ${uploadMode === 'file' ? 'active' : ''}`}
                        onClick={() => {
                            setUploadMode('file');
                            handleRemoveFile();
                        }}
                        disabled={uploadFile.isPending || uploadFolder.isPending}
                        suppressHydrationWarning
                    >
                        Upload File
                    </button>
                    <button
                        className={`smart-filter-mode-btn ${uploadMode === 'folder' ? 'active' : ''}`}
                        onClick={() => {
                            setUploadMode('folder');
                            handleRemoveFile();
                        }}
                        disabled={uploadFile.isPending || uploadFolder.isPending}
                        suppressHydrationWarning
                    >
                        Upload Folder
                    </button>
                </div>
                
                <div className="smart-filter-upload-container">
                    {uploadMode === 'file' ? (
                        <div className="smart-filter-upload-area">
                            {!uploadedFile ? (
                                <>
                                    <input
                                        type="file"
                                        id="file-upload"
                                        className="smart-filter-file-input"
                                        accept=".xlsx,.xls,.doc,.docx,.pdf,.txt"
                                        onChange={handleFileSelect}
                                        disabled={uploadFile.isPending}
                                        suppressHydrationWarning
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="smart-filter-upload-label"
                                    >
                                        <HiArrowUpTray className="smart-filter-upload-icon" />
                                        <span>Click to upload or drag and drop</span>
                                        <span className="smart-filter-upload-hint">
                                            Excel (.xlsx, .xls), Word (.doc, .docx), PDF (.pdf), or TXT (.txt) files
                                        </span>
                                    </label>
                                </>
                            ) : (
                                <div className="smart-filter-file-preview">
                                    <HiDocumentText className="smart-filter-file-icon" />
                                    <div className="smart-filter-file-info">
                                        <span className="smart-filter-file-name">{uploadedFile.name}</span>
                                        {uploadedFile.size > 0 && (
                                            <span className="smart-filter-file-size">
                                                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className="smart-filter-file-remove"
                                        onClick={handleRemoveFile}
                                        disabled={uploadFile.isPending}
                                    >
                                        <HiXMark />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="smart-filter-folder-upload-area">
                            {/* NEW: Complete Flow Option - Upload, Scan, Match, Filter in one go */}
                            {selectedJobId && (filterValue || customPercentage) && (
                                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '2px solid #0ea5e9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '18px' }}>⚡</span>
                                        <strong style={{ fontSize: '16px', color: '#0ea5e9' }}>Quick Process Mode</strong>
                                    </div>
                                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                                        Upload files and automatically scan, match, filter, and generate results in one step!
                                    </p>
                                    <input
                                        type="file"
                                        id="folder-upload-complete"
                                        className="smart-filter-file-input"
                                        accept=".xlsx,.xls,.doc,.docx,.pdf,.txt"
                                        multiple
                                        onChange={handleUploadFolderAndMatch}
                                        disabled={uploadFolderAndMatch.isPending}
                                        suppressHydrationWarning
                                    />
                                    <label
                                        htmlFor="folder-upload-complete"
                                        className="smart-filter-upload-label"
                                        style={{ cursor: uploadFolderAndMatch.isPending ? 'not-allowed' : 'pointer', backgroundColor: uploadFolderAndMatch.isPending ? '#e5e7eb' : '#0ea5e9', color: 'white' }}
                                    >
                                        <HiArrowUpTray className="smart-filter-upload-icon" />
                                        <span>
                                            {uploadFolderAndMatch.isPending ? 'Processing...' : 'Upload & Process Now (Complete Flow)'}
                                        </span>
                                        <span className="smart-filter-upload-hint" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                            Select files → Auto scan → Match with job → Filter → Download Excel
                                        </span>
                                    </label>
                                </div>
                            )}

                            {/* Original Two-Step Flow */}
                            {uploadedFiles.length === 0 ? (
                                <>
                        <input
                            type="file"
                            id="folder-upload"
                            className="smart-filter-file-input"
                            accept=".xlsx,.xls,.doc,.docx,.pdf,.txt"
                            multiple
                            onChange={handleFolderSelect}
                            disabled={uploadFolder.isPending || uploadFolderAndMatch.isPending}
                            suppressHydrationWarning
                        />
                                    <label
                                        htmlFor="folder-upload"
                                        className="smart-filter-upload-label"
                                    >
                                        <HiArrowUpTray className="smart-filter-upload-icon" />
                                        <span>Click to select multiple files</span>
                                        <span className="smart-filter-upload-hint">
                                            Select multiple Excel, Word, PDF, or TXT files (hold Ctrl/Cmd to select multiple). All files will be scanned and matched.
                                        </span>
                                    </label>
                                </>
                            ) : (
                                <div className="smart-filter-folder-preview">
                                    <div className="smart-filter-folder-header">
                                        <HiDocumentText className="smart-filter-file-icon" />
                                        <div className="smart-filter-folder-info">
                                            <span className="smart-filter-file-name">
                                                {uploadFolder.isPending ? (
                                                    <>Uploading {uploadedFiles.length} file(s)...</>
                                                ) : (
                                                    <>{uploadedFiles.length} file(s) selected</>
                                                )}
                                            </span>
                                            {uploadFolder.isPending && (
                                                <span className="smart-filter-upload-status">
                                                    Scanning files and extracting data. This may take a few minutes...
                                                </span>
                                            )}
                                            {!uploadFolder.isPending && fileId && (
                                                <span className="smart-filter-upload-status" style={{ color: '#10b981' }}>
                                                    ✅ Files processed. Data stored in JSON. Ready to analyze.
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            className="smart-filter-file-remove"
                                            onClick={handleRemoveFile}
                                            disabled={uploadFolder.isPending}
                                        >
                                            <HiXMark />
                                        </button>
                                    </div>
                                    {uploadFolder.isPending && (
                                        <div style={{ padding: '20px', textAlign: 'center' }}>
                                            <CircularProgress size={24} />
                                            <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                                                Processing files... Please wait.
                                            </p>
                                        </div>
                                    )}
                                    {!uploadFolder.isPending && (
                                        <div className="smart-filter-files-list">
                                            {uploadedFiles.slice(0, 10).map((file, index) => (
                                                <div key={index} className="smart-filter-file-item">
                                                    <span className="smart-filter-file-item-name">{file.name}</span>
                                                    <span className="smart-filter-file-item-size">
                                                        {(file.size / 1024).toFixed(2)} KB
                                                    </span>
                                                </div>
                                            ))}
                                            {uploadedFiles.length > 10 && (
                                                <div className="smart-filter-file-item">
                                                    <span className="smart-filter-file-item-name">
                                                        + {uploadedFiles.length - 10} more file(s)
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Job Selection Section */}
            <div className="smart-filter-section">
                <div className="smart-filter-section-header">
                    <h2 className="smart-filter-section-title">Select Job</h2>
                </div>
                
                <div className="smart-filter-job-select">
                    <label className="smart-filter-label">Job</label>
                    <select
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="smart-filter-select"
                        disabled={analyzeCandidates.isPending}
                        suppressHydrationWarning
                    >
                        <option value="">Select a job</option>
                        {jobs.map((job) => (
                            <option key={job._id} value={job._id}>
                                {job.jobName} - {job.clientId?.name || 'N/A'}
                            </option>
                        ))}
                    </select>
                    {jobs.length === 0 && (
                        <span className="smart-filter-hint">No jobs available. Please add jobs first.</span>
                    )}
                </div>
            </div>

            {/* Filter Section */}
            <div className="smart-filter-section">
                <div className="smart-filter-section-header">
                    <h2 className="smart-filter-section-title">Filter Options</h2>
                </div>

                <div className="smart-filter-filters">
                    <div className="smart-filter-filter-group">
                        <label className="smart-filter-label">Filter Type</label>
                        <div className="smart-filter-radio-group">
                            <label className="smart-filter-radio">
                                <input
                                    type="radio"
                                    name="filterType"
                                    value="percentage"
                                    checked={filterType === 'percentage'}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    disabled={analyzeCandidates.isPending}
                                    suppressHydrationWarning
                                />
                                <span>Top Percentage</span>
                            </label>
                            <label className="smart-filter-radio">
                                <input
                                    type="radio"
                                    name="filterType"
                                    value="number"
                                    checked={filterType === 'number'}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    disabled={analyzeCandidates.isPending}
                                    suppressHydrationWarning
                                />
                                <span>Top Number</span>
                            </label>
                        </div>
                    </div>

                    {filterType === 'percentage' ? (
                        <div className="smart-filter-filter-group">
                            <label className="smart-filter-label">Percentage</label>
                            <div className="smart-filter-percentage-options">
                                {[10, 20, 30, 40].map(percent => (
                                    <button
                                        key={percent}
                                        className={`smart-filter-percentage-btn ${filterValue === percent.toString() ? 'active' : ''}`}
                                        onClick={() => {
                                            setFilterValue(percent.toString());
                                            setCustomPercentage('');
                                        }}
                                        disabled={analyzeCandidates.isPending}
                                        suppressHydrationWarning
                                    >
                                        {percent}%
                                    </button>
                                ))}
                            </div>
                            <div className="smart-filter-custom-input">
                                <span>Custom:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={customPercentage}
                                    onChange={(e) => {
                                        setCustomPercentage(e.target.value);
                                        setFilterValue('');
                                    }}
                                    placeholder="Enter percentage"
                                    className="smart-filter-input"
                                    disabled={analyzeCandidates.isPending}
                                    suppressHydrationWarning
                                />
                                <span>%</span>
                            </div>
                        </div>
                    ) : (
                        <div className="smart-filter-filter-group">
                            <label className="smart-filter-label">Number of Candidates</label>
                            <input
                                type="number"
                                min="1"
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                placeholder="Enter number"
                                className="smart-filter-input"
                                disabled={analyzeCandidates.isPending}
                                suppressHydrationWarning
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Analyze Button */}
            <div className="smart-filter-analyze-section">
                <button
                    className="smart-filter-analyze-btn"
                    onClick={handleAnalyze}
                    disabled={
                        (!fileId && uploadedFiles.length === 0) ||
                        !selectedJobId ||
                        (!filterValue && !customPercentage) ||
                        analyzeCandidates.isPending ||
                        jobs.length === 0
                    }
                >
                    {analyzeCandidates.isPending ? (
                        <>
                            <CircularProgress size={16} sx={{ color: "white" }} />
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        'Analyze'
                    )}
                </button>
            </div>

            {/* Results Section */}
            {results && (
                <div className="smart-filter-section">
                    <div className="smart-filter-section-header">
                        <h2 className="smart-filter-section-title">Analysis Results</h2>
                    </div>

                    <div className="smart-filter-results">
                        <div className="smart-filter-results-stats">
                            <div className="smart-filter-stat-card">
                                <span className="smart-filter-stat-label">Total Analyzed</span>
                                <span className="smart-filter-stat-value">{results.totalAnalyzed}</span>
                            </div>
                            <div className="smart-filter-stat-card">
                                <span className="smart-filter-stat-label">Filtered Candidates</span>
                                <span className="smart-filter-stat-value">{results.totalFiltered}</span>
                            </div>
                            <div className="smart-filter-stat-card">
                                <span className="smart-filter-stat-label">Job</span>
                                <span className="smart-filter-stat-value-small">{results.job.jobName}</span>
                            </div>
                        </div>

                        <div className="smart-filter-results-actions">
                            <button
                                className="smart-filter-download-btn"
                                onClick={handleDownloadExcel}
                            >
                                <HiDocumentText />
                                <span>Download Excel</span>
                            </button>
                        </div>

                        {results.candidates && results.candidates.length > 0 && (
                            <div className="smart-filter-candidates-preview">
                                <h3 className="smart-filter-candidates-title">
                                    {showAllCandidates ? 'All Candidates' : 'Top Candidates Preview'}
                                </h3>
                                <div className="smart-filter-candidates-list">
                                    {(showAllCandidates ? results.candidates : results.candidates.slice(0, 10)).map((candidate, index) => (
                                        <div key={index} className="smart-filter-candidate-item">
                                            <div className="smart-filter-candidate-rank">{index + 1}</div>
                                            <div className="smart-filter-candidate-info">
                                                <div className="smart-filter-candidate-name">
                                                    {candidate.name || 'N/A'}
                                                </div>
                                                <div className="smart-filter-candidate-details">
                                                    <span>{candidate.email || 'N/A'}</span>
                                                    <span>•</span>
                                                    <span>{candidate.mobile || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="smart-filter-candidate-score">
                                                <span className="smart-filter-score-value">{candidate.matchScore}</span>
                                                <span className="smart-filter-score-label">Score</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {results.candidates.length > 10 && (
                                    <div className="smart-filter-more-candidates">
                                        {!showAllCandidates ? (
                                            <p 
                                                className="smart-filter-more-candidates-link"
                                                onClick={() => setShowAllCandidates(true)}
                                            >
                                                + {results.candidates.length - 10} more candidates (click to view all)
                                            </p>
                                        ) : (
                                            <p 
                                                className="smart-filter-more-candidates-link"
                                                onClick={() => setShowAllCandidates(false)}
                                            >
                                                Show Less (show only top 10)
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
