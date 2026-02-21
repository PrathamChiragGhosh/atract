/**
 * Python-Based File Parser Service
 * Uses Python libraries to read/scan file content instead of Node.js libraries
 * Supports: PDF, Word (.docx), Excel (.xlsx, .xls), TXT
 * Then applies two-stage filtering: Vector Similarity + LLM Evaluation
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execFileAsync = promisify(execFile);

/**
 * Parse files using Python and apply two-stage filtering
 * @param {Array<string>} filePaths - Array of file paths to parse
 * @param {Object} job - Job requirements object
 * @param {number} pythonFilterPercentage - Percentage for Stage 1 filtering (default: 50)
 * @param {boolean} useLLM - Whether to use Stage 2 LLM evaluation (default: true)
 * @returns {Promise<Object>} Filtered candidates with match scores
 */
async function parseFilesAndFilter(filePaths, job, pythonFilterPercentage = 50.0, useLLM = true) {
    try {
        const pythonScript = path.join(__dirname, '../../python/parse_and_filter_files.py');
        
        // Check if Python script exists
        try {
            await fs.access(pythonScript);
        } catch (error) {
            throw new Error('Python file parser script not found. Please ensure parse_and_filter_files.py exists.');
        }

        // Prepare input data
        const inputData = {
            filePaths: filePaths,
            job: job,
            pythonFilterPercentage: pythonFilterPercentage,
            useLLM: useLLM
        };

        // Determine Python command
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

        console.log(`\n🐍 Python File Parser: Processing ${filePaths.length} file(s)...`);
        console.log(`   Files: ${filePaths.map(f => path.basename(f)).join(', ')}`);
        console.log(`   Stage 1 Filter: ${pythonFilterPercentage}%`);
        console.log(`   Stage 2 LLM: ${useLLM ? 'Enabled' : 'Disabled'}`);

        // Execute Python script
        const result = await execFileAsync(
            pythonCommand,
            [pythonScript],
            {
                input: JSON.stringify(inputData),
                maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large files
                timeout: 600000 // 10 minute timeout
            }
        );

        // Parse Python output
        const output = result.stdout.trim();
        let pythonResult;
        
        try {
            pythonResult = JSON.parse(output);
        } catch (parseError) {
            // Try to extract JSON from output
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                pythonResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse Python script output');
            }
        }

        if (!pythonResult.success) {
            throw new Error(pythonResult.error || 'Python file parsing and filtering failed');
        }

        console.log(`   ✓ Python processing completed:`);
        console.log(`   - Total files: ${pythonResult.totalFiles || filePaths.length}`);
        console.log(`   - Total candidates: ${pythonResult.totalCandidates || 0}`);
        console.log(`   - Filtered candidates: ${pythonResult.filteredCandidates || 0}`);
        console.log(`   - LLM evaluation: ${pythonResult.usedLLM ? 'Yes' : 'No'}`);

        return {
            success: true,
            candidates: pythonResult.candidates || [],
            totalFiles: pythonResult.totalFiles || 0,
            totalCandidates: pythonResult.totalCandidates || 0,
            filteredCandidates: pythonResult.filteredCandidates || 0,
            processedFiles: pythonResult.processedFiles || []
        };

    } catch (error) {
        console.error('Python file parser error:', error);
        throw new Error(`Failed to parse files with Python: ${error.message}`);
    }
}

/**
 * Parse a single file using Python
 * @param {string} filePath - Path to file
 * @returns {Promise<Object>} Parsed file data
 */
async function parseSingleFile(filePath) {
    try {
        const pythonScript = path.join(__dirname, '../../python/parse_and_filter_files.py');
        
        const inputData = {
            filePaths: [filePath],
            job: {}, // Empty job for parsing only
            pythonFilterPercentage: 100, // Don't filter, just parse
            useLLM: false // Don't use LLM for parsing
        };

        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
        
        const result = await execFileAsync(
            pythonCommand,
            [pythonScript],
            {
                input: JSON.stringify(inputData),
                maxBuffer: 50 * 1024 * 1024,
                timeout: 300000
            }
        );

        const output = result.stdout.trim();
        let pythonResult;
        
        try {
            pythonResult = JSON.parse(output);
        } catch (parseError) {
            const jsonMatch = output.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                pythonResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse Python output');
            }
        }

        if (!pythonResult.success) {
            throw new Error(pythonResult.error || 'File parsing failed');
        }

        return {
            candidates: pythonResult.candidates || [],
            processedFiles: pythonResult.processedFiles || []
        };

    } catch (error) {
        console.error('Single file parse error:', error);
        throw new Error(`Failed to parse file: ${error.message}`);
    }
}

module.exports = {
    parseFilesAndFilter,
    parseSingleFile
};

