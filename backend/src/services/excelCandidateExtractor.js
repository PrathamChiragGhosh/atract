const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;

/**
 * Extract candidate data from Excel file and preserve structure
 */
async function extractExcelStructure(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON array (raw data)
        const rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            raw: false,
            defval: '' 
        });

        if (rawData.length === 0) {
            return {
                success: false,
                error: 'Excel file is empty'
            };
        }

        // Find header row (usually the first non-empty row with column names)
        let headerRowIndex = 0;
        let headers = [];
        let headerInfo = [];

        // Look for header row (row with column names like S.No, Name, Email Id, etc.)
        for (let i = 0; i < Math.min(20, rawData.length); i++) {
            const row = rawData[i];
            if (row && row.length > 0) {
                // Check if this looks like a header row (has common column names)
                const rowText = row.join(' ').toLowerCase();
                // Check for multiple indicators that this is a header row
                const headerIndicators = ['s.no', 's no', 'name', 'email', 'mobile', 'phone', 
                                         'age', 'gender', 'location', 'experience', 'qualification'];
                const matches = headerIndicators.filter(indicator => rowText.includes(indicator));
                
                if (matches.length >= 3) { // At least 3 header indicators found
                    headerRowIndex = i;
                    headers = row.map(h => String(h || '').trim());
                    break;
                }
            }
        }
        
        // Fallback: if no header found, use first non-empty row
        if (headers.length === 0 && rawData.length > 0) {
            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                if (row && row.length > 0 && row.some(cell => cell && String(cell).trim())) {
                    headerRowIndex = i;
                    headers = row.map(h => String(h || '').trim());
                    break;
                }
            }
        }

        // Extract header info rows (before header row)
        if (headerRowIndex > 0) {
            headerInfo = rawData.slice(0, headerRowIndex).map(row => row);
        }

        // Extract data rows (after header row)
        const dataRows = rawData.slice(headerRowIndex + 1).filter(row => {
            // Filter out completely empty rows
            return row && row.some(cell => cell && String(cell).trim());
        });

        // Convert data rows to objects with headers as keys
        const candidates = dataRows.map((row, index) => {
            const candidate = {};
            headers.forEach((header, colIndex) => {
                candidate[header] = row[colIndex] || '';
            });
            return {
                rowIndex: headerRowIndex + 1 + index,
                rowData: candidate,
                originalRow: row
            };
        });

        // Also extract as text for matching
        const textContent = candidates.map(c => {
            return Object.values(c.rowData).filter(v => v).join(' ');
        }).join('\n');

        return {
            success: true,
            headers: headers,
            headerInfo: headerInfo,
            candidates: candidates,
            textContent: textContent,
            headerRowIndex: headerRowIndex
        };
    } catch (error) {
        console.error('Excel extraction error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate Excel file with same structure as original
 */
function generateExcelFile(outputPath, headers, headerInfo, selectedCandidates) {
    try {
        const workbook = XLSX.utils.book_new();
        
        // Prepare data array
        const data = [];
        
        // Add header info rows
        if (headerInfo && headerInfo.length > 0) {
            headerInfo.forEach(infoRow => {
                data.push(infoRow);
            });
        }
        
        // Add header row
        data.push(headers);
        
        // Add candidate data rows (preserve original row order, only include selected candidates)
        selectedCandidates.forEach(candidate => {
            if (candidate.originalExcelRow) {
                // Use original row data if available
                data.push(candidate.originalExcelRow);
            } else if (candidate.originalExcelRowData) {
                // Use stored row data
                const row = headers.map(header => candidate.originalExcelRowData[header] || '');
                data.push(row);
            } else {
                // Fallback: reconstruct from candidateData
                const row = headers.map(header => {
                    const lowerHeader = header.toLowerCase();
                    if (lowerHeader.includes('name')) return candidate.candidateData?.name || '';
                    if (lowerHeader.includes('email')) return '';
                    if (lowerHeader.includes('mobile')) return '';
                    if (lowerHeader.includes('age')) return '';
                    if (lowerHeader.includes('gender')) return '';
                    if (lowerHeader.includes('location')) return candidate.candidateData?.location || '';
                    return '';
                });
                data.push(row);
            }
        });

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        
        // Set column widths
        const colWidths = headers.map(() => ({ wch: 15 }));
        worksheet['!cols'] = colWidths;
        
        // Append to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Candidates');
        
        // Write file
        XLSX.writeFile(workbook, outputPath);
        
        return {
            success: true,
            filePath: outputPath
        };
    } catch (error) {
        console.error('Excel generation error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    extractExcelStructure,
    generateExcelFile
};

