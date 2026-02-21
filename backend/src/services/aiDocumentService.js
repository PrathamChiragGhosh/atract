const { spawn } = require('child_process');
const path = require('path');

/**
 * AI-Powered Python Document Service
 * Uses advanced libraries: Spire.Doc, pdfplumber, unstructured, layoutparser
 * Provides high-accuracy candidate filtering
 */
class AIDocumentService {
    constructor() {
        this.pythonScriptPath = path.join(__dirname, '../../python/ai_document_service.py');
        this.pythonCommand = process.env.PYTHON_COMMAND || 'python3';
    }

    /**
     * Call Python AI document service
     * @param {Object} inputData - Data to send to Python script
     * @returns {Promise<Object>} Result from Python script
     */
    async callPythonService(inputData) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn(this.pythonCommand, [this.pythonScriptPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: process.platform === 'win32'
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
                    console.error('Python AI service error:', stderr);
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
     * Process files and filter candidates using AI
     * @param {Array<string>} filePaths - Array of file paths
     * @param {Object} job - Job requirements object
     * @param {number} filterPercentage - Percentage for filtering (0-100)
     * @returns {Promise<Object>} Filtered candidates with AI scores
     */
    async processAndFilterFiles(filePaths, job, filterPercentage = 50.0) {
        try {
            const result = await this.callPythonService({
                action: 'process_and_filter',
                filePaths: filePaths,
                job: job,
                filterPercentage: filterPercentage
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to process and filter files');
            }

            return result;
        } catch (error) {
            console.error('Error in AI document service:', error);
            throw error;
        }
    }

    /**
     * Check if AI service is available
     * @returns {Promise<boolean>}
     */
    async checkService() {
        try {
            // Test with a simple request
            const result = await this.callPythonService({
                action: 'process_and_filter',
                filePaths: [],
                job: { jobTitle: 'Test' },
                filterPercentage: 50
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new AIDocumentService();

