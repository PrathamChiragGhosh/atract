const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');

class FilteredFileGenerator {
    /**
     * Generate Excel file from filtered candidates
     * @param {Array} candidates - Array of candidate objects
     * @param {string} outputDir - Output directory
     * @param {string} originalFileName - Original file name
     * @returns {Promise<string>} Path to generated file
     */
    async generateExcelFile(candidates, outputDir, originalFileName = 'filtered_candidates') {
        try {
            // Ensure output directory exists
            await fs.mkdir(outputDir, { recursive: true });

            // Prepare data for Excel
            const worksheetData = candidates.map(candidate => ({
                'Name': candidate.name || '',
                'Email': candidate.email || '',
                'Mobile': candidate.mobile || '',
                'Age': candidate.age || '',
                'Gender': candidate.gender || '',
                'Location': candidate.location || '',
                'Experience': candidate.experience || '',
                'Current Role': candidate.currentRole || '',
                'Skills': candidate.skills || '',
                'Qualification': candidate.qualification || '',
                'Notice Period': candidate.noticePeriod || '',
                'Salary': candidate.salary || '',
                'Match Score': candidate.matchScore || '',
                'Vector Similarity': candidate.vectorSimilarity || '',
                'Freshness Score': candidate.freshnessScore || '',
                'Key Matching Skills': Array.isArray(candidate.keyMatchingSkills) 
                    ? candidate.keyMatchingSkills.join(', ') 
                    : candidate.keyMatchingSkills || '',
                'Source File': candidate.sourceFile || ''
            }));

            // Create workbook
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(worksheetData);

            // Set column widths
            const columnWidths = [
                { wch: 25 }, // Name
                { wch: 30 }, // Email
                { wch: 15 }, // Mobile
                { wch: 5 },  // Age
                { wch: 10 }, // Gender
                { wch: 20 }, // Location
                { wch: 15 }, // Experience
                { wch: 25 }, // Current Role
                { wch: 40 }, // Skills
                { wch: 20 }, // Qualification
                { wch: 15 }, // Notice Period
                { wch: 15 }, // Salary
                { wch: 12 }, // Match Score
                { wch: 15 }, // Vector Similarity
                { wch: 15 }, // Freshness Score
                { wch: 30 }, // Key Matching Skills
                { wch: 30 }  // Source File
            ];
            worksheet['!cols'] = columnWidths;

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered Candidates');

            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const baseName = path.parse(originalFileName).name;
            const fileName = `filtered_${baseName}_${timestamp}.xlsx`;
            const filePath = path.join(outputDir, fileName);

            // Write file
            XLSX.writeFile(workbook, filePath);

            return filePath;
        } catch (error) {
            console.error('Error generating Excel file:', error);
            throw new Error(`Failed to generate Excel file: ${error.message}`);
        }
    }

    /**
     * Generate JSON file from filtered candidates
     * @param {Array} candidates - Array of candidate objects
     * @param {string} outputDir - Output directory
     * @param {string} originalFileName - Original file name
     * @returns {Promise<string>} Path to generated file
     */
    async generateJsonFile(candidates, outputDir, originalFileName = 'filtered_candidates') {
        try {
            await fs.mkdir(outputDir, { recursive: true });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const baseName = path.parse(originalFileName).name;
            const fileName = `filtered_${baseName}_${timestamp}.json`;
            const filePath = path.join(outputDir, fileName);

            const data = {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    totalCandidates: candidates.length,
                    originalFileName: originalFileName
                },
                candidates: candidates
            };

            await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

            return filePath;
        } catch (error) {
            console.error('Error generating JSON file:', error);
            throw new Error(`Failed to generate JSON file: ${error.message}`);
        }
    }

    /**
     * Generate CSV file from filtered candidates
     * @param {Array} candidates - Array of candidate objects
     * @param {string} outputDir - Output directory
     * @param {string} originalFileName - Original file name
     * @returns {Promise<string>} Path to generated file
     */
    async generateCsvFile(candidates, outputDir, originalFileName = 'filtered_candidates') {
        try {
            await fs.mkdir(outputDir, { recursive: true });

            if (candidates.length === 0) {
                throw new Error('No candidates to export');
            }

            // Get all unique keys from candidates
            const allKeys = new Set();
            candidates.forEach(candidate => {
                Object.keys(candidate).forEach(key => allKeys.add(key));
            });

            const headers = Array.from(allKeys);

            // Create CSV content
            let csvContent = headers.join(',') + '\n';

            candidates.forEach(candidate => {
                const row = headers.map(header => {
                    let value = candidate[header] || '';
                    // Escape commas and quotes
                    if (typeof value === 'string') {
                        value = value.replace(/"/g, '""');
                        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                            value = `"${value}"`;
                        }
                    }
                    // Handle arrays
                    if (Array.isArray(value)) {
                        value = value.join('; ');
                    }
                    return value;
                });
                csvContent += row.join(',') + '\n';
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const baseName = path.parse(originalFileName).name;
            const fileName = `filtered_${baseName}_${timestamp}.csv`;
            const filePath = path.join(outputDir, fileName);

            await fs.writeFile(filePath, csvContent, 'utf8');

            return filePath;
        } catch (error) {
            console.error('Error generating CSV file:', error);
            throw new Error(`Failed to generate CSV file: ${error.message}`);
        }
    }

    /**
     * Generate filtered file in specified format
     * @param {Array} candidates - Array of candidate objects
     * @param {string} outputDir - Output directory
     * @param {string} format - File format ('xlsx', 'json', 'csv')
     * @param {string} originalFileName - Original file name
     * @returns {Promise<string>} Path to generated file
     */
    async generateFilteredFile(candidates, outputDir, format = 'xlsx', originalFileName = 'filtered_candidates') {
        switch (format.toLowerCase()) {
            case 'xlsx':
            case 'excel':
                return await this.generateExcelFile(candidates, outputDir, originalFileName);
            case 'json':
                return await this.generateJsonFile(candidates, outputDir, originalFileName);
            case 'csv':
                return await this.generateCsvFile(candidates, outputDir, originalFileName);
            default:
                throw new Error(`Unsupported file format: ${format}`);
        }
    }
}

module.exports = new FilteredFileGenerator();

