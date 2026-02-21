const { spawn } = require('child_process');
const path = require('path');
const documentParserService = require('./documentParserService');

/**
 * Resume Filter Service
 * Integrates document parsing + candidate filtering
 */
class ResumeFilterService {
    constructor() {
        this.filterScriptPath = path.join(__dirname, '../../python/parse_and_filter_files.py');
        this.pythonCommand = process.env.PYTHON_COMMAND || 'python3';
    }

    /**
     * Parse files and filter candidates based on job description
     * @param {string|string[]} filePaths - Path(s) to resume file(s)
     * @param {Object} jobDescription - Job requirements
     * @param {Object} options - Filtering options
     * @returns {Promise<Object>} Filtered candidates with match scores
     */
    async parseAndFilter(filePaths, jobDescription, options = {}) {
        try {
            const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
            
            // Verify files exist
            for (const filePath of paths) {
                try {
                    await require('fs').promises.access(filePath);
                } catch (error) {
                    throw new Error(`File not found: ${filePath}`);
                }
            }

            // Prepare job description object
            const job = {
                jobName: jobDescription.jobName || jobDescription.title || '',
                jobRequirements: jobDescription.jobRequirements || jobDescription.description || '',
                keySkills: Array.isArray(jobDescription.keySkills) 
                    ? jobDescription.keySkills 
                    : (jobDescription.keySkills ? jobDescription.keySkills.split(',').map(s => s.trim()) : []),
                workExperience: jobDescription.workExperience || jobDescription.experience || '',
                location: jobDescription.location || '',
                age: jobDescription.age || '',
                gender: jobDescription.gender || '',
                qualification: jobDescription.qualification || jobDescription.education || ''
            };

            // Filter options
            const filterPercentage = options.filterPercentage || 50.0;
            const useLLM = options.useLLM !== false; // Default true

            // Call Python filtering script
            const result = await this._callFilterScript(paths, job, filterPercentage, useLLM);
            
            return result;
        } catch (error) {
            console.error('ResumeFilterService.parseAndFilter error:', error);
            throw error;
        }
    }

    /**
     * Call Python filter script
     * @private
     */
    async _callFilterScript(filePaths, job, filterPercentage, useLLM) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn(
                this.pythonCommand,
                [this.filterScriptPath],
                {
                    stdio: ['pipe', 'pipe', 'pipe']
                }
            );

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
                    console.error('Python filter script stderr:', stderr);
                    reject(new Error(`Python script exited with code ${code}: ${stderr}`));
                    return;
                }

                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (parseError) {
                    console.error('Failed to parse Python output:', stdout);
                    reject(new Error(`Failed to parse Python output: ${parseError.message}`));
                }
            });

            pythonProcess.on('error', (error) => {
                reject(new Error(`Failed to spawn Python process: ${error.message}`));
            });

            // Prepare input data
            const inputData = {
                filePaths: filePaths,
                job: job,
                pythonFilterPercentage: filterPercentage,
                useLLM: useLLM
            };

            // Send input data
            pythonProcess.stdin.write(JSON.stringify(inputData));
            pythonProcess.stdin.end();
        });
    }
}

module.exports = new ResumeFilterService();

