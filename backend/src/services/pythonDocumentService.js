const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class PythonDocumentService {
    constructor() {
        this.pythonScriptPath = path.join(__dirname, '../../python/document_service.py');
        this.pythonCommand = process.env.PYTHON_COMMAND || 'python3';
    }

    /**
     * Call Python document service
     * @param {Object} inputData - Data to send to Python script
     * @returns {Promise<Object>} Result from Python script
     */
    async callPythonService(inputData) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn(this.pythonCommand, [this.pythonScriptPath], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('Python script error:', stderr);
                    return reject(new Error(`Python script exited with code ${code}: ${stderr}`));
                }

                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (error) {
                    console.error('Failed to parse Python output:', stdout);
                    reject(new Error(`Failed to parse Python output: ${error.message}`));
                }
            });

            pythonProcess.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });

            // Send input data to Python script
            pythonProcess.stdin.write(JSON.stringify(inputData));
            pythonProcess.stdin.end();
        });
    }

    /**
     * Parse a single file
     * @param {string} filePath - Path to the file
     * @returns {Promise<Object>} Parsed file data
     */
    async parseFile(filePath) {
        try {
            const result = await this.callPythonService({
                action: 'parse',
                filePath: filePath
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to parse file');
            }

            return result.result;
        } catch (error) {
            console.error('Error parsing file:', error);
            throw error;
        }
    }

    /**
     * Process multiple files and filter candidates
     * @param {Array<string>} filePaths - Array of file paths
     * @param {Object} job - Job requirements object
     * @param {number} filterPercentage - Percentage for filtering (0-100)
     * @param {boolean} useLLM - Whether to use LLM evaluation
     * @returns {Promise<Object>} Filtered candidates
     */
    async processAndFilterFiles(filePaths, job, filterPercentage = 50.0, useLLM = true) {
        try {
            const result = await this.callPythonService({
                action: 'process_and_filter',
                filePaths: filePaths,
                job: job,
                filterPercentage: filterPercentage,
                useLLM: useLLM
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to process and filter files');
            }

            return result;
        } catch (error) {
            console.error('Error processing and filtering files:', error);
            throw error;
        }
    }

    /**
     * Check if Python service is available
     * @returns {Promise<boolean>}
     */
    async checkService() {
        try {
            // Try to parse a non-existent file to test the service
            // We'll catch the error and check if it's a proper Python response
            await this.parseFile('/tmp/test_file_that_does_not_exist.txt');
            return true;
        } catch (error) {
            // If we get a structured error, Python service is working
            if (error.message.includes('File not found') || error.message.includes('Failed to parse file')) {
                return true;
            }
            // Otherwise, Python service might not be available
            return false;
        }
    }
}

module.exports = new PythonDocumentService();

