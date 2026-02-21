"use client";

import React, { useState, useRef } from 'react';
import { FaUpload, FaTimes, FaTimesCircle, FaSpinner, FaDownload } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import Cookies from 'js-cookie';
import './CandidateUploadModal.css';

const CandidateUploadModal = ({ isOpen, onClose, job }) => {
    const [files, setFiles] = useState([]);
    const [uploadTab, setUploadTab] = useState('file'); // 'file' or 'folder'
    const [filterType, setFilterType] = useState('percentage'); // 'percentage' or 'number'
    const [selectedPercentage, setSelectedPercentage] = useState('');
    const [customPercentage, setCustomPercentage] = useState('');
    const [topNumber, setTopNumber] = useState('');
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [matchId, setMatchId] = useState(null);
    const [downloadFormat, setDownloadFormat] = useState('json');
    const [isExcelFile, setIsExcelFile] = useState(false);
    
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    if (!isOpen || !job) return null;

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        addFiles(selectedFiles);
        e.target.value = '';
    };

    const addFiles = (newFiles) => {
        const validFiles = newFiles.filter(file => {
            const ext = file.name.toLowerCase().split('.').pop();
            return ['pdf', 'doc', 'docx', 'txt', 'xml', 'xlsx', 'xls'].includes(ext);
        });

        if (validFiles.length !== newFiles.length) {
            toast.error('Some files were skipped. Only PDF, DOC, DOCX, TXT, XML, XLS, XLSX files are allowed.');
        }

        // Check if uploaded file is Excel
        const hasExcel = validFiles.some(f => {
            const ext = f.name.toLowerCase().split('.').pop();
            return ['xlsx', 'xls'].includes(ext);
        });
        setIsExcelFile(hasExcel);
        
        // If Excel file and single file, set format to excel (will be auto-detected on backend)
        if (hasExcel && validFiles.length === 1) {
            setDownloadFormat('excel');
        }

        const merged = [
            ...files,
            ...validFiles.filter(f => !files.some(existing => 
                existing.name === f.name && existing.size === f.size
            ))
        ];
        setFiles(merged);
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleAnalyze = async () => {
        if (files.length === 0) {
            toast.error('Please upload at least one candidate file');
            return;
        }

        let filterValue;
        if (filterType === 'percentage') {
            const percentage = selectedPercentage || customPercentage;
            if (!percentage || isNaN(percentage) || percentage <= 0 || percentage > 100) {
                toast.error('Please enter a valid percentage between 1 and 100');
                return;
            }
            filterValue = parseFloat(percentage);
        } else {
            if (!topNumber || isNaN(topNumber) || parseInt(topNumber) <= 0) {
                toast.error('Please enter a valid number');
                return;
            }
            filterValue = parseInt(topNumber);
        }

        setUploading(true);
        setAnalyzing(true);
        setProgress(0);

        try {
            const token = Cookies.get('emp_token');
            if (!token) {
                toast.error('Authentication required');
                return;
            }

            const formData = new FormData();
            files.forEach((file) => {
                formData.append('candidateFiles', file);
            });
            formData.append('jobId', job._id);
            formData.append('filterType', filterType);
            formData.append('filterValue', filterValue);

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_JOB_URL}/${job._id}/upload-candidates`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 90) / progressEvent.total
                        );
                        setProgress(percentCompleted);
                    },
                }
            );

            if (response.data.success) {
                setProgress(100);
                setMatchId(response.data.data?.matchId || null);
                // Check if original file was Excel
                const uploadedFile = files[0];
                if (uploadedFile) {
                    const ext = uploadedFile.name.toLowerCase().split('.').pop();
                    if (['xlsx', 'xls'].includes(ext)) {
                        setIsExcelFile(true);
                        setDownloadFormat('excel');
                    }
                }
                toast.success(response.data.message || 'Candidates uploaded and analyzed successfully!');
                // Don't close modal automatically - allow download
                setUploading(false);
                setAnalyzing(false);
            } else {
                toast.error(response.data.message || 'Failed to analyze candidates');
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.message || 'Failed to upload and analyze candidates');
        } finally {
            setUploading(false);
            setAnalyzing(false);
        }
    };

    const handleDownload = async () => {
        if (!matchId || !job?._id) {
            toast.error('No filtered results available to download');
            return;
        }

        try {
            const token = Cookies.get('emp_token');
            if (!token) {
                toast.error('Authentication required');
                return;
            }

            // For Excel files, format is auto-detected on backend, so don't pass format parameter
            const formatParam = isExcelFile ? '' : `?format=${downloadFormat}`;
            const url = `${process.env.NEXT_PUBLIC_JOB_URL}/${job._id}/download-candidates/${matchId}${formatParam}`;
            
            // Add authorization header via fetch
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Download failed');
            }

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = blobUrl;
            
            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = isExcelFile 
                ? `filtered_candidates_${Date.now()}.xlsx`
                : `filtered_candidates_${Date.now()}.${downloadFormat}`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            
            toast.success('Download started!');
        } catch (error) {
            console.error('Download error:', error);
            toast.error(error.message || 'Failed to download filtered candidates');
        }
    };

    const handleClose = () => {
        if (!uploading && !analyzing) {
            setFiles([]);
            setSelectedPercentage('');
            setCustomPercentage('');
            setTopNumber('');
            setFilterType('percentage');
            setProgress(0);
            setMatchId(null);
            onClose();
        }
    };

    return (
        <>
            <div className="candidate-upload-modal-overlay" onClick={handleClose}></div>
            <div className="candidate-upload-modal">
                <div className="candidate-upload-modal-header">
                    <h2>Upload Candidate Files</h2>
                    <button 
                        className="candidate-upload-modal-close" 
                        onClick={handleClose}
                        disabled={uploading || analyzing}
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="candidate-upload-modal-body">
                    <p className="candidate-upload-description">
                        Upload candidate files and filter them based on job requirements
                    </p>

                    {/* Upload File Section */}
                    <div className="candidate-upload-section">
                        <h3>Upload File</h3>
                        <div className="candidate-upload-tabs">
                            <button
                                className={`candidate-upload-tab ${uploadTab === 'file' ? 'active' : ''}`}
                                onClick={() => setUploadTab('file')}
                            >
                                Upload File
                            </button>
                            <button
                                className={`candidate-upload-tab ${uploadTab === 'folder' ? 'active' : ''}`}
                                onClick={() => setUploadTab('folder')}
                            >
                                Upload Folder
                            </button>
                        </div>

                        <div
                            className="candidate-upload-dropzone"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => {
                                if (uploadTab === 'file') {
                                    fileInputRef.current?.click();
                                } else {
                                    folderInputRef.current?.click();
                                }
                            }}
                        >
                            <FaUpload className="candidate-upload-icon" />
                            <p>Click to upload or drag and drop</p>
                            <p className="candidate-upload-formats">
                                Excel (.xlsx, .xls), Word (.doc, .docx), PDF (.pdf), TXT (.txt), or XML (.xml) files
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.txt,.xml,.xlsx,.xls"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            <input
                                ref={folderInputRef}
                                type="file"
                                multiple
                                webkitdirectory=""
                                directory=""
                                accept=".pdf,.doc,.docx,.txt,.xml,.xlsx,.xls"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {files.length > 0 && (
                            <div className="candidate-upload-files-list">
                                <h4>Uploaded Files ({files.length})</h4>
                                <div className="candidate-upload-files">
                                    {files.map((file, index) => (
                                        <div key={index} className="candidate-upload-file-item">
                                            <span className="candidate-upload-file-name">{file.name}</span>
                                            <button
                                                className="candidate-upload-file-remove"
                                                onClick={() => removeFile(index)}
                                                disabled={uploading || analyzing}
                                            >
                                                <FaTimesCircle />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Select Job Section */}
                    <div className="candidate-upload-section">
                        <h3>Select Job</h3>
                        <div className="candidate-upload-job-select">
                            <label>Job</label>
                            <input
                                type="text"
                                value={job.jobTitle}
                                disabled
                                className="candidate-upload-job-input"
                            />
                        </div>
                    </div>

                    {/* Filter Options Section */}
                    <div className="candidate-upload-section">
                        <h3>Filter Options</h3>
                        <div className="candidate-upload-filter-type">
                            <label className="candidate-upload-radio">
                                <input
                                    type="radio"
                                    name="filterType"
                                    value="percentage"
                                    checked={filterType === 'percentage'}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    disabled={uploading || analyzing}
                                />
                                <span>Top Percentage</span>
                            </label>
                            <label className="candidate-upload-radio">
                                <input
                                    type="radio"
                                    name="filterType"
                                    value="number"
                                    checked={filterType === 'number'}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    disabled={uploading || analyzing}
                                />
                                <span>Top Number</span>
                            </label>
                        </div>

                        {filterType === 'percentage' && (
                            <div className="candidate-upload-percentage-section">
                                <label>Percentage</label>
                                <div className="candidate-upload-percentage-buttons">
                                    {[10, 20, 30, 40].map(perc => (
                                        <button
                                            key={perc}
                                            className={`candidate-upload-percentage-btn ${selectedPercentage === perc.toString() ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedPercentage(perc.toString());
                                                setCustomPercentage('');
                                            }}
                                            disabled={uploading || analyzing}
                                        >
                                            {perc}%
                                        </button>
                                    ))}
                                </div>
                                <div className="candidate-upload-custom-percentage">
                                    <input
                                        type="number"
                                        placeholder="Enter percentage"
                                        value={customPercentage}
                                        onChange={(e) => {
                                            setCustomPercentage(e.target.value);
                                            setSelectedPercentage('');
                                        }}
                                        min="1"
                                        max="100"
                                        disabled={uploading || analyzing}
                                    />
                                    <span>%</span>
                                </div>
                            </div>
                        )}

                        {filterType === 'number' && (
                            <div className="candidate-upload-number-section">
                                <label>Top Number</label>
                                <input
                                    type="number"
                                    placeholder="Enter number"
                                    value={topNumber}
                                    onChange={(e) => setTopNumber(e.target.value)}
                                    min="1"
                                    disabled={uploading || analyzing}
                                />
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {(uploading || analyzing) && (
                        <div className="candidate-upload-progress">
                            <div className="candidate-upload-progress-bar">
                                <div 
                                    className="candidate-upload-progress-fill"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="candidate-upload-progress-text">
                                {uploading ? 'Uploading files...' : 'Analyzing candidates...'} {progress}%
                            </p>
                        </div>
                    )}

                    {/* Download Section */}
                    {matchId && !uploading && !analyzing && (
                        <div className="candidate-upload-download-section">
                            <h3>Download Filtered Results</h3>
                            {isExcelFile ? (
                                <div className="candidate-upload-download-info">
                                    <p>Original file was Excel format. Download will be in the same Excel format with filtered candidates.</p>
                                    <button
                                        className="candidate-upload-download-btn"
                                        onClick={handleDownload}
                                    >
                                        <FaDownload />
                                        Download Filtered Candidates (Excel)
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="candidate-upload-download-options">
                                        <label className="candidate-upload-radio">
                                            <input
                                                type="radio"
                                                name="downloadFormat"
                                                value="json"
                                                checked={downloadFormat === 'json'}
                                                onChange={(e) => setDownloadFormat(e.target.value)}
                                            />
                                            <span>JSON</span>
                                        </label>
                                        <label className="candidate-upload-radio">
                                            <input
                                                type="radio"
                                                name="downloadFormat"
                                                value="csv"
                                                checked={downloadFormat === 'csv'}
                                                onChange={(e) => setDownloadFormat(e.target.value)}
                                            />
                                            <span>CSV</span>
                                        </label>
                                    </div>
                                    <button
                                        className="candidate-upload-download-btn"
                                        onClick={handleDownload}
                                    >
                                        <FaDownload />
                                        Download Filtered Candidates ({downloadFormat.toUpperCase()})
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="candidate-upload-modal-footer">
                    <button
                        className="candidate-upload-btn-secondary"
                        onClick={handleClose}
                        disabled={uploading || analyzing}
                    >
                        {matchId ? 'Close' : 'Cancel'}
                    </button>
                    {!matchId && (
                        <button
                            className="candidate-upload-btn-primary"
                            onClick={handleAnalyze}
                            disabled={uploading || analyzing || files.length === 0}
                        >
                            {(uploading || analyzing) ? (
                                <>
                                    <FaSpinner className="candidate-upload-spinner" />
                                    {uploading ? 'Uploading...' : 'Analyzing...'}
                                </>
                            ) : (
                                'Analyze'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default CandidateUploadModal;

