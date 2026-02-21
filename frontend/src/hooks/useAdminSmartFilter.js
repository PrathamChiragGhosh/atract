import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import Cookies from "js-cookie";

const getBaseUrl = () => {
    const employerUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL || '';
    return employerUrl.includes('/employer')
        ? employerUrl.replace('/employer', '')
        : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
};

const getAuthHeaders = () => {
    const token = Cookies.get('admin_token');
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

const getFormDataHeaders = () => {
    const token = Cookies.get('admin_token');
    return {
        Authorization: `Bearer ${token}`
    };
};

// Upload file
export const useUploadSmartFilterFile = () => {
    return useMutation({
        mutationFn: async ({ file, fileType }) => {
            const baseUrl = getBaseUrl();
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(
                `${baseUrl}/admin/smart-filter/upload`,
                formData,
                { 
                    headers: getFormDataHeaders(),
                    params: { fileType }
                }
            );
            return response.data;
        },
    });
};

// Analyze candidates
export const useAnalyzeCandidates = () => {
    return useMutation({
        mutationFn: async ({ fileId, jobId, filterType, filterValue }) => {
            const baseUrl = getBaseUrl();
            const response = await axios.post(
                `${baseUrl}/admin/smart-filter/analyze`,
                { fileId, jobId, filterType, filterValue },
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
    });
};

// Upload folder (multiple files)
export const useUploadFolder = () => {
    return useMutation({
        mutationFn: async ({ files }) => {
            const baseUrl = getBaseUrl();
            const formData = new FormData();
            
            // Append all files
            files.forEach((file) => {
                formData.append('files', file);
            });

            try {
                const response = await axios.post(
                    `${baseUrl}/admin/smart-filter/upload-folder`,
                    formData,
                    { 
                        headers: getFormDataHeaders(),
                        timeout: 10 * 60 * 1000, // 10 minutes timeout for large uploads
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity
                    }
                );
                return response.data;
            } catch (error) {
                // Provide more helpful error messages
                if (error.code === 'ECONNREFUSED' || error.message.includes('ERR_CONNECTION_REFUSED')) {
                    throw new Error('Backend server is not running. Please start the backend server on port 5001.');
                } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                    throw new Error('Upload timed out. Please try uploading fewer files at once (10-20 files per batch).');
                } else if (error.response) {
                    // Server responded with error status
                    throw new Error(error.response.data?.message || error.response.data?.error || 'Upload failed');
                } else if (error.request) {
                    // Request was made but no response received
                    throw new Error('No response from server. Please check if the backend server is running.');
                } else {
                    throw error;
                }
            }
        },
    });
};

// NEW: Upload folder, scan, match, filter, and generate downloadable file in one request
export const useUploadFolderAndMatch = () => {
    return useMutation({
        mutationFn: async ({ files, jobId, filterType, filterValue }) => {
            const baseUrl = getBaseUrl();
            const formData = new FormData();
            
            // Append all files
            files.forEach((file) => {
                formData.append('files', file);
            });

            // Append job and filter parameters
            formData.append('jobId', jobId);
            formData.append('filterType', filterType);
            formData.append('filterValue', filterValue);

            try {
                const response = await axios.post(
                    `${baseUrl}/admin/smart-filter/upload-folder-and-match`,
                    formData,
                    { 
                        headers: getFormDataHeaders(),
                        timeout: 15 * 60 * 1000, // 15 minutes timeout for complete processing
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity
                    }
                );
                return response.data;
            } catch (error) {
                // Provide more helpful error messages
                if (error.code === 'ECONNREFUSED' || error.message.includes('ERR_CONNECTION_REFUSED')) {
                    throw new Error('Backend server is not running. Please start the backend server on port 5001.');
                } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                    throw new Error('Processing timed out. Please try uploading fewer files at once (10-20 files per batch).');
                } else if (error.response) {
                    throw new Error(error.response.data?.message || error.response.data?.error || 'Processing failed');
                } else if (error.request) {
                    throw new Error('No response from server. Please check if the backend server is running.');
                } else {
                    throw error;
                }
            }
        },
    });
};

// Download Excel
export const downloadExcelFile = async (fileId) => {
    const baseUrl = getBaseUrl();
    const token = Cookies.get('admin_token');
    
    const response = await fetch(`${baseUrl}/admin/smart-filter/download/${fileId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileId;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

